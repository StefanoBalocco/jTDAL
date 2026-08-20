export default class jTDAL {
    static _keywords = ['condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
    static _regexpPatternPath = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternString = 'STRING:(?:[^;](?:(?!<=;);)?)+';
    static _regexpPatternMacro = 'MACRO:[a-zA-Z0-9-]+';
    static _regexpPatternPathBoolean = '(?:(?:!)?[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternExpressionAllowedBoolean = `(?:${jTDAL._regexpPatternString}|(?:${jTDAL._regexpPatternPathBoolean})(?:[\\s]*\\|[\\s]*${jTDAL._regexpPatternString})?)`;
    static _regexpPatternExpressionAllowedBooleanMacro = `(?:${jTDAL._regexpPatternMacro}|${jTDAL._regexpPatternString}|${jTDAL._regexpPatternPathBoolean}(?:[\\s]*\\|[\\s]*${jTDAL._regexpPatternString})?)`;
    static _regexpPatternTagAttributes = '(?:[^<>"\']|"[^"]*"|\'[^\']*\')';
    static _regexpTagWithTDAL = RegExp('<\!--[\\s\\S]*?(?:-->|$)' +
        `|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s+` +
        `\\bdata-tdal-(?:${jTDAL._keywords.join('|')})\\b` +
        `=(['"])(.*?)\\3(\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s*(\/)?>` +
        `|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(?:\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s*(\/)?>` +
        '|<\\/((?:[\\w-]+:)?[a-zA-Z][\\w-]*)\\s*>', 'gi');
    static _regexpTagAttributes = /\s((?:[\w-]+:)?[\w-]+)(?:=(?:(['"])(.*?)\2|([^>\s'"]+)))?(?=\s|\/?>)/gi;
    static _regexpPathString = RegExp(`{(${jTDAL._regexpPatternPath})}|{\\?(${jTDAL._regexpPatternPathBoolean})}|{/\\?}`, 'g');
    static _regexpCondition = RegExp(`^[\\s]*(${jTDAL._regexpPatternExpressionAllowedBoolean})[\\s]*$`);
    static _regexpRepeat = RegExp(`^[\\s]*([\\w\\-]+?)[\\s]+(${jTDAL._regexpPatternPath})[\\s]*$`);
    static _regexpContent = RegExp(`^[\\s]*(?:(structure)[\\s]+)?(${jTDAL._regexpPatternExpressionAllowedBooleanMacro})[\\s]*$`);
    static _regexpAttributes = RegExp(`[\\s]*(?:(?:((?:[\\w\\-]+:)?[\\w\\-]+)(\\??)[\\s]+(${jTDAL._regexpPatternExpressionAllowedBoolean})[\\s]*)(?:;;[\\s]*|$))`, 'g');
    static _regexpAttributesTDAL = /\s*(data-tdal-[\w-]+)=(?:(['"])(.*?)\2|([^>\s'"]+))/gi;
    static _regexpTrimStart = /^\s+/;
    static _regexpTrimEnd = /\s+$/;
    static _regexpTagEnd = /\s*\/?>$/;
    static _regexpMacroName = /^[a-zA-Z0-9-]+$/;
    static _regexpGeneratedRepeat = /r\["REPEAT"\]\["([a-zA-Z0-9-]+)"\]=\{[^{}]*\};/g;
    static _regexpGeneratedMacro = /m\["([a-zA-Z0-9-]+)"\]/g;
    static _regexpGeneratedConcatenation = /(?<!\\)"\+"/g;
    static _HTML5VoidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    _trim;
    _strip;
    _macros = {};
    static _ParseString(stringExpression, macros = {}) {
        let returnValue = '""';
        const frames = [{
                index: 0,
                state: 1
            }];
        let match;
        jTDAL._regexpPathString.lastIndex = 0;
        while (match = jTDAL._regexpPathString.exec(stringExpression)) {
            const currentFrame = frames[frames.length - 1];
            if (currentFrame.state && (currentFrame.index < match['index'])) {
                returnValue += '+' + JSON.stringify(String(stringExpression.substring(currentFrame.index, match['index'])));
            }
            currentFrame.index = jTDAL._regexpPathString.lastIndex;
            if (match[1]) {
                if (currentFrame.state) {
                    returnValue += '+((q=' + jTDAL._ParsePath(match[1], false, macros) + ',false!==q)&&("string"===typeof q||("number"===typeof q&&!isNaN(q)))?q:"")';
                }
            }
            else if (match[2]) {
                let tmpValue = 'false';
                let state = currentFrame.state;
                if (state) {
                    tmpValue = jTDAL._ParsePath(match[2], true, macros);
                    state = 0;
                    if ('true' == tmpValue) {
                        state = 1;
                        returnValue += '+""';
                    }
                    else if ('false' != tmpValue) {
                        state = 2;
                        returnValue += '+(true===' + tmpValue + '?""+""';
                    }
                }
                frames.push({
                    index: jTDAL._regexpPathString.lastIndex,
                    state: state
                });
            }
            else if (1 < frames.length) {
                const conditionFrame = frames[frames.length - 1];
                frames.pop();
                frames[frames.length - 1].index = jTDAL._regexpPathString.lastIndex;
                if (2 == conditionFrame.state) {
                    returnValue += ':"")';
                }
            }
            else {
                throw new Error('ParseString: Unopened tag');
            }
        }
        if (1 < frames.length) {
            throw new Error('ParseString: Unclosed tag');
        }
        const rootFrame = frames[0];
        if (rootFrame.index < stringExpression.length) {
            returnValue += '+' + JSON.stringify(String(stringExpression.substring(rootFrame.index)));
        }
        return returnValue;
    }
    static _ParsePath(pathExpression, getBoolean = false, macros = {}) {
        let returnValue = '';
        if (pathExpression) {
            const paths = pathExpression.split('|');
            const cL1 = paths.length;
            for (let iL1 = 0; iL1 < cL1; ++iL1) {
                if (0 != iL1) {
                    returnValue += '||';
                }
                let currentPath = paths[iL1].replace(jTDAL._regexpTrimStart, '');
                let boolPath = getBoolean;
                if (currentPath.startsWith('STRING:')) {
                    returnValue += (boolPath ? 'b' : '') + '(' + this._ParseString(currentPath.substring(7)) + ')';
                    iL1 = cL1;
                }
                else if (currentPath.startsWith('MACRO:')) {
                    if (undefined !== macros[currentPath.substring(6)]) {
                        returnValue += 'm["' + currentPath.substring(6) + '"]()';
                    }
                    else {
                        returnValue += 'false';
                    }
                    iL1 = cL1;
                }
                else {
                    currentPath = currentPath.replace(jTDAL._regexpTrimEnd, '');
                    const not = ('!' === currentPath[0]);
                    boolPath = getBoolean || not;
                    const path = (not ? currentPath.substring(1) : currentPath).split('/');
                    if ((0 < path.length) && (0 < path[0].length)) {
                        switch (path[0]) {
                            case 'FALSE': {
                                if (not) {
                                    returnValue += 'true';
                                }
                                else {
                                    returnValue += 'false';
                                }
                                iL1 = cL1;
                                break;
                            }
                            case 'TRUE': {
                                if (not) {
                                    returnValue += 'false';
                                }
                                else {
                                    returnValue += 'true';
                                }
                                iL1 = cL1;
                                break;
                            }
                            case 'REPEAT': {
                                if (3 == path.length) {
                                    returnValue += (boolPath ? (not ? '!' : '') + 'b(' : '') + 'c(r,"' + path.join('/') + '")' + (boolPath ? ')' : '');
                                }
                                break;
                            }
                            case 'GLOBAL': {
                                if (1 < path.length && 0 < path[1].length) {
                                    returnValue += (boolPath ? (not ? '!' : '') + 'b(' : '') + 'c(d,"' + path.slice(1).join('/') + '")' + (boolPath ? ')' : '');
                                }
                                break;
                            }
                            default: {
                                if (boolPath) {
                                    returnValue += (not ? '!' : '') + 'b(c(r,"' + path.join('/') + '",2))';
                                }
                                else {
                                    returnValue += 'c(r,"' + path.join('/') + '",1)';
                                }
                            }
                        }
                    }
                }
            }
        }
        else {
            returnValue = 'false';
        }
        return returnValue;
    }
    constructor(trim = true, strip = true) {
        this._trim = trim;
        this._strip = strip;
    }
    _Parse(template) {
        let returnValue = '';
        const attributesPrefix = 'data-tdal-';
        const stack = [];
        let skip = false;
        let sourceIndex = 0;
        let tmpTDALTags;
        jTDAL._regexpTagWithTDAL.lastIndex = 0;
        while (tmpTDALTags = jTDAL._regexpTagWithTDAL.exec(template)) {
            const tagName = (tmpTDALTags[1] || tmpTDALTags[7] || tmpTDALTags[9] || '').toLowerCase();
            const innermost = stack[stack.length - 1];
            if (tmpTDALTags[0].startsWith('<!--')) {
                if (!tmpTDALTags[0].endsWith('-->')) {
                    throw new Error('Parse: Unclosed comment');
                }
                if (!skip && this._strip && (!innermost || !['template', 'script'].includes(innermost.name))) {
                    if (sourceIndex < tmpTDALTags.index) {
                        returnValue += '+' + JSON.stringify(template.substring(sourceIndex, tmpTDALTags.index));
                    }
                    sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                }
            }
            else if (innermost && ['template', 'script'].includes(innermost.name) && !(tmpTDALTags[9] && (tagName == innermost.name))) {
                if (('script' != innermost.name) && ['template', 'script'].includes(tagName) && !tmpTDALTags[6] && !tmpTDALTags[8]) {
                    stack.push({ name: tagName });
                }
            }
            else {
                if ((tmpTDALTags[6] || tmpTDALTags[8]) && !jTDAL._HTML5VoidElements.has(tagName)) {
                    throw new Error('Parse: Self-closed non-void tag <' + tagName + '>');
                }
                if (tmpTDALTags[9]) {
                    if (!innermost) {
                        throw new Error('Parse: Unopened tag </' + tagName + '>');
                    }
                    else if (tagName != innermost.name) {
                        throw new Error('Parse: Mismatched closing tag </' + tagName + '>, expected </' + innermost.name + '>');
                    }
                    else {
                        const closed = stack.pop();
                        if (undefined !== closed.beforeClose) {
                            if (!closed.skip && (sourceIndex < tmpTDALTags.index)) {
                                returnValue += '+' + JSON.stringify(template.substring(sourceIndex, tmpTDALTags.index));
                            }
                            returnValue += closed.beforeClose + '+' + JSON.stringify(closed.omitClose ? '' : tmpTDALTags[0]) + closed.afterClose;
                        }
                        if (closed.skip || (undefined !== closed.beforeClose)) {
                            sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                        }
                        if (closed.skip) {
                            skip = false;
                        }
                    }
                }
                else if (skip || tmpTDALTags[7]) {
                    if (!jTDAL._HTML5VoidElements.has(tagName) && !tmpTDALTags[6] && !tmpTDALTags[8]) {
                        stack.push({ name: tagName });
                    }
                }
                else if (tmpTDALTags[1]) {
                    if (sourceIndex < tmpTDALTags.index) {
                        returnValue += '+' + JSON.stringify(template.substring(sourceIndex, tmpTDALTags.index));
                    }
                    const selfClosed = !!tmpTDALTags[6] || jTDAL._HTML5VoidElements.has(tagName);
                    const current = ['', tmpTDALTags[0], '', '', '', ''];
                    const attributes = {};
                    for (const match of tmpTDALTags[0].matchAll(jTDAL._regexpTagAttributes)) {
                        attributes[match[1]] = match;
                    }
                    current[1] = current[1].replaceAll(jTDAL._regexpAttributesTDAL, '');
                    let dropElement = false;
                    let dropContent = false;
                    let omitClose = false;
                    let tmpMatch;
                    let tmpValue;
                    let attribute = attributesPrefix + jTDAL._keywords[0];
                    if (attributes[attribute] && jTDAL._regexpCondition.exec(attributes[attribute][3])) {
                        tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
                        if ('false' == tmpValue) {
                            dropElement = true;
                        }
                        else if ('true' != tmpValue) {
                            current[0] += '+(true===' + tmpValue + '?""';
                            current[5] = ':"")' + current[5];
                        }
                    }
                    if (!dropElement) {
                        attribute = attributesPrefix + jTDAL._keywords[1];
                        if (attributes[attribute] && (tmpMatch = jTDAL._regexpRepeat.exec(attributes[attribute][3]))) {
                            tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros);
                            if (['false', '""', 'true'].includes(tmpValue)) {
                                dropElement = true;
                            }
                            else {
                                current[0] += '+(' +
                                    '(t[0]+=3)&&' + `false!==(t[t[0]-3]=${tmpValue})&&` +
                                    '((Array.isArray(t[t[0]-3])&&(t[t[0]-2]=t[t[0]-3])&&(t[t[0]-3]=true))||' +
                                    '("object"===typeof t[t[0]-3]&&null!==t[t[0]-3]&&(t[t[0]-2]=Object.keys(t[t[0]-3]))))&&' +
                                    '(t[t[0]-1]=t[t[0]-2].length)?t[t[0]-2].reduce((o,v,i)=>{' +
                                    `r["${tmpMatch[1]}"]=(true===t[t[0]-3])?v:t[t[0]-3][v];` +
                                    'const n=i+1,l=t[t[0]-1];' +
                                    `r["REPEAT"]["${tmpMatch[1]}"]={` +
                                    'index:(true===t[t[0]-3])?i:v,number:n,length:l,even:0==(n%2),odd:1==(n%2),first:1==n,last:l==n};return o';
                                current[5] = `;},""):"")+((t[0]-=3)&&(delete r["REPEAT"]["${tmpMatch[1]}"])&&(delete r["${tmpMatch[1]}"])?"":"")${current[5]}`;
                            }
                        }
                    }
                    if (!dropElement) {
                        attribute = attributesPrefix + jTDAL._keywords[2];
                        tmpMatch = attributes[attribute] ? jTDAL._regexpContent.exec(attributes[attribute][3]) : null;
                        if (!tmpMatch) {
                            attribute = attributesPrefix + jTDAL._keywords[3];
                            tmpMatch = attributes[attribute] ? jTDAL._regexpContent.exec(attributes[attribute][3]) : null;
                        }
                        if (tmpMatch) {
                            tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros);
                            if ('false' == tmpValue) {
                                if (attributesPrefix + jTDAL._keywords[2] == attribute) {
                                    dropContent = true;
                                }
                                else {
                                    dropElement = true;
                                }
                            }
                            else if ('true' != tmpValue) {
                                const encode = 'structure' != tmpMatch[1];
                                if (attributesPrefix + jTDAL._keywords[2] == attribute) {
                                    current[3] += `+((q=${tmpValue},false!==q)&&("string"===typeof q||("number"===typeof q&&!isNaN(q)))?${encode ? 'String(' : ''}q${encode ? ').replace(f,m=>s[m])' : ''}:(true!==q?"":""`;
                                    current[4] += '))';
                                }
                                else {
                                    current[0] += `+((q=${tmpValue},false!==q)&&("string"===typeof q||("number"===typeof q&&!isNaN(q)))?${encode ? 'String(' : ''}q${encode ? ').replace(f,m=>s[m])' : ''}:(true!==q?"":""`;
                                    current[5] = `))${current[5]}`;
                                }
                            }
                        }
                        attribute = attributesPrefix + jTDAL._keywords[4];
                        if (attributes[attribute]) {
                            for (tmpMatch of attributes[attribute][3].matchAll(jTDAL._regexpAttributes)) {
                                const isFlag = '?' === tmpMatch[2];
                                tmpValue = jTDAL._ParsePath(tmpMatch[3], isFlag, this._macros);
                                if ('false' == tmpValue) {
                                    if (attributes[tmpMatch[1]]) {
                                        current[1] = current[1].replace(RegExp("\\s*\\b" + tmpMatch[1] + "\\b(?:=(['\"]).*?\\1)?(?=\\s|\\/?>)"), '');
                                    }
                                }
                                else if ('true' != tmpValue) {
                                    if (isFlag) {
                                        current[2] += `+(${tmpValue}?" ${tmpMatch[1]}":""`;
                                    }
                                    else {
                                        current[2] += `+((q=${tmpValue},false!==q)&&((q&&"string"===typeof q)||("number"===typeof q&&!isNaN(q)))?" ${tmpMatch[1]}=\\""+q+"\\"":(true!==q?"":" ${tmpMatch[1]}"`;
                                    }
                                    if (attributes[tmpMatch[1]]) {
                                        current[1] = current[1].replace(RegExp("\\s*\\b" + tmpMatch[1] + "\\b(?:=(['\"]).*?\\1)?(?=\\s|\\/?>)"), '');
                                        current[2] += attributes[tmpMatch[1]][3] ? '+"="+' + JSON.stringify(attributes[tmpMatch[1]][2] + attributes[tmpMatch[1]][3] + attributes[tmpMatch[1]][2]) : '';
                                    }
                                    current[2] += isFlag ? ')' : '))';
                                }
                            }
                        }
                        attribute = attributesPrefix + jTDAL._keywords[5];
                        if (attributes[attribute] && jTDAL._regexpCondition.exec(attributes[attribute][3])) {
                            tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
                            if ('true' == tmpValue) {
                                current[1] = '';
                                omitClose = true;
                            }
                            else if ('false' != tmpValue) {
                                current[0] += `+(${tmpValue}?"":""`;
                                current[3] = `)${current[3]}`;
                                current[4] += `+(${tmpValue}?"":""`;
                                current[5] = `)${current[5]}`;
                            }
                        }
                    }
                    current[1] = current[1].replace(jTDAL._regexpTagEnd, '');
                    if (dropElement) {
                        sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                        if (!selfClosed) {
                            stack.push({ name: tagName, skip: true });
                            skip = true;
                        }
                    }
                    else if (selfClosed) {
                        const syntheticClose = !!current[3] || !!current[4];
                        returnValue += current[0] + '+' + JSON.stringify(current[1]) + current[2] +
                            (current[1] ? '+"' + (syntheticClose ? '' : '/') + '>"' : '') + current[3] + current[4] +
                            '+' + JSON.stringify(syntheticClose ? '</' + tagName + '>' : '') + current[5];
                        sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                    }
                    else {
                        returnValue += current[0] + '+' + JSON.stringify(current[1]) + current[2] +
                            (current[1] ? '+">"' : '') + current[3];
                        sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                        stack.push({ name: tagName, skip: dropContent, beforeClose: current[4], afterClose: current[5], omitClose });
                        if (dropContent) {
                            skip = true;
                        }
                    }
                }
            }
        }
        if (0 < stack.length) {
            throw new Error('Parse: Unclosed tag <' + stack[stack.length - 1].name + '>');
        }
        if (sourceIndex < template.length) {
            returnValue += '+' + JSON.stringify(template.substring(sourceIndex));
        }
        return returnValue;
    }
    MacroAdd(macroName, template) {
        if (!macroName.match(jTDAL._regexpMacroName)) {
            console.error('MacroAdd: Invalid macro name');
            return false;
        }
        try {
            this._macros[macroName] = '""' + this._Parse(template);
            if (this._trim) {
                this._macros[macroName] = '(' + this._macros[macroName] + ').trim()';
            }
            return true;
        }
        catch (error) {
            console.error(error);
            this._macros[macroName] = '""';
            return false;
        }
    }
    _Compile(template) {
        const tmpArray = ['', ''];
        let tmpValue = this._Parse(template);
        for (const match of tmpValue.matchAll(jTDAL._regexpGeneratedRepeat)) {
            if (!tmpValue.includes(`c(r,"REPEAT/${match[1]}/`)) {
                tmpValue = tmpValue.replaceAll(match[0], '').replaceAll(`&&(delete r["REPEAT"]["${match[1]}"])`, '');
            }
        }
        const macros = new Set();
        let macroScan = tmpValue;
        let macroMatch;
        jTDAL._regexpGeneratedMacro.lastIndex = 0;
        while (null !== (macroMatch = jTDAL._regexpGeneratedMacro.exec(macroScan))) {
            if (!macros.has(macroMatch[1]) && (undefined !== this._macros[macroMatch[1]])) {
                macros.add(macroMatch[1]);
                macroScan += this._macros[macroMatch[1]];
            }
        }
        const macroCode = [...macros].map((macro) => `"${macro}":()=>${this._macros[macro]}`).join(',');
        const code = tmpValue + [...macros].map((macro) => this._macros[macro]).join('');
        const declarations = [];
        if (code.includes('r[') || code.includes('c(')) {
            declarations.push('r=' + (code.includes('r["REPEAT"][') ? '{"REPEAT":{}}' : '{}'));
        }
        if (code.includes('t[')) {
            declarations.push('t=[1]');
        }
        if (macros.size) {
            declarations.push('m={' + macroCode + '}');
        }
        if (code.includes('.replace(f,')) {
            declarations.push(`f=/[&<>"]/g`, 's={"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}');
        }
        if (code.includes('c(')) {
            declarations.push('c=(a,c,e)=>{let z=a,y=c.split("/"),x=0,w,l=y.length;for(;x<l&&1!==z;){z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;x++;if((false===z||x==l&&2==e&&!b(z))&&e){z=d;e=0;x=0}}return z}');
        }
        if (code.includes('b(')) {
            declarations.push('b=v=>!!v&&("object"!==typeof v||(Array.isArray(v)?0<v.length:0<Object.keys(v).length))');
        }
        let returnValue = (code.includes('q=') ? 'let q;' : '') + (declarations.length ? 'const ' + declarations.join(',') + ';' : '');
        if (this._trim) {
            tmpArray[0] = '(';
            tmpArray[1] = ').trim()';
        }
        returnValue += 'return ' + tmpArray[0] + '""' + tmpValue + tmpArray[1];
        return returnValue.replace(jTDAL._regexpGeneratedConcatenation, '').replaceAll('(true!==q?"":"")', '""');
    }
    CompileToFunction(template) {
        try {
            return new Function('d', this._Compile(template));
        }
        catch (error) {
            console.error(error);
            return () => '';
        }
    }
    CompileToString(template) {
        try {
            return 'function(d){' + this._Compile(template) + '}';
        }
        catch (error) {
            console.error(error);
            return 'function(){return""}';
        }
    }
}
//# sourceMappingURL=jTDAL.js.map