export default class jTDAL {
    static _keywords = ['condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
    static _regexpPatternPath = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternPathBoolean = `(?:(?:!)?${jTDAL._regexpPatternPath})`;
    static _regexpPatternTagAttributes = '(?:[^<>"\']|"[^"]*"|\'[^\']*\')';
    static _regexpTagWithTDAL = RegExp(`\
<\!--[\\s\\S]*?(?:-->|$)\
|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(?:\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s+\
\\bdata-tdal-(?:${jTDAL._keywords.join('|')})\\b\
=(['"])(?:.*?)\\2(?:\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s*(\/)?>\
|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(?:\\s+${jTDAL._regexpPatternTagAttributes}+?)??\\s*(\/)?>\
|<\\/((?:[\\w-]+:)?[a-zA-Z][\\w-]*)\\s*>`, 'gi');
    static _regexpTagAttributes = /\s((?:[\w-]+:)?[\w-]+)(?:=(?:(['"])(.*?)\2|([^>\s'"]+)))?(?=\s|\/?>)/gi;
    static _regexpCondition = RegExp(`^[\\s]*(${jTDAL._regexpPatternPathBoolean})[\\s]*$`);
    static _regexpRepeat = RegExp(`^[\\s]*([\\w\\-]+?)[\\s]+(${jTDAL._regexpPatternPath})[\\s]*$`);
    static _regexpContent = RegExp(`^[\\s]*(?:(structure)[\\s]+)?(MACRO:[a-zA-Z0-9-]+|${jTDAL._regexpPatternPathBoolean})[\\s]*$`);
    static _regexpAttributes = RegExp(`[\\s]*((?:[\\w\\-]+:)?[\\w\\-]+)(\\??)[\\s]+(${jTDAL._regexpPatternPathBoolean})[\\s]*(?:;;[\\s]*|$)`, 'g');
    static _regexpAttributesTDAL = /\s*(data-tdal-[\w-]+)=(?:(['"])(.*?)\2|([^>\s'"]+))/gi;
    static _regexpPathSeparator = /\s*\|\s*/;
    static _regexpTagEnd = /\s*\/?>$/;
    static _regexpMacroName = /^[a-zA-Z0-9-]+$/;
    static _HTML5VoidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    _trim;
    _strip;
    _macros = {};
    static _ParsePath(pathExpression, getBoolean, macros, result) {
        let returnValue = '';
        if (pathExpression) {
            const paths = pathExpression.trim().split(jTDAL._regexpPathSeparator);
            const cL1 = paths.length;
            for (let iL1 = 0; iL1 < cL1; ++iL1) {
                if (0 != iL1) {
                    returnValue += '||';
                }
                const currentPath = paths[iL1];
                if (currentPath.startsWith('MACRO:')) {
                    const macroName = currentPath.substring(6);
                    if (Object.hasOwn(macros, macroName)) {
                        returnValue += `m["${macroName}"]()`;
                        result[3].add(macroName);
                    }
                    else {
                        returnValue += 'false';
                    }
                    iL1 = cL1;
                }
                else {
                    const not = ('!' === currentPath[0]);
                    const path = (not ? currentPath.substring(1) : currentPath).split('/');
                    const boolPath = (getBoolean || not);
                    const boolPrefix = not ? '!' : '';
                    if (path[0].length) {
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
                                    result[1][0] = true;
                                    result[1][1] ||= boolPath;
                                    returnValue += `${boolPrefix}c(r,"${path.join('/')}"${boolPath ? ',2' : ''})`;
                                }
                                else {
                                    throw new Error('ParsePath: Invalid REPEAT syntax');
                                }
                                break;
                            }
                            case 'GLOBAL': {
                                if (path[1]?.length) {
                                    result[1][0] = true;
                                    result[1][1] ||= boolPath;
                                    returnValue += `${boolPrefix}c(d,"${path.slice(1).join('/')}"${boolPath ? ',2' : ''})`;
                                }
                                else {
                                    throw new Error('ParsePath: Invalid GLOBAL syntax');
                                }
                                break;
                            }
                            default: {
                                result[1][0] = true;
                                result[1][1] ||= boolPath;
                                returnValue += `${boolPrefix}c(r,"${path.join('/')}",${boolPath ? '3' : '1'})`;
                            }
                        }
                    }
                    else {
                        throw new Error('ParsePath: Invalid path length');
                    }
                }
            }
        }
        return returnValue;
    }
    constructor(trim = true, strip = true) {
        this._trim = trim;
        this._strip = strip;
    }
    _Parse(template) {
        const returnValue = ['', [false, false, false, false, false], false, new Set()];
        const attributesPrefix = 'data-tdal-';
        const stack = [];
        let skip = false;
        let sourceIndex = 0;
        let backtickOpened = false;
        let tmpTDALTags;
        jTDAL._regexpTagWithTDAL.lastIndex = 0;
        while (tmpTDALTags = jTDAL._regexpTagWithTDAL.exec(template)) {
            const tagName = (tmpTDALTags[1] || tmpTDALTags[4] || tmpTDALTags[6] || '').toLowerCase();
            const selfClosed = tmpTDALTags[3] || tmpTDALTags[5];
            const innermost = stack[stack.length - 1];
            const inOpaqueRegion = innermost && ['template', 'script'].includes(innermost.name);
            if (tmpTDALTags[0].startsWith('<!--')) {
                if (tmpTDALTags[0].endsWith('-->')) {
                    if (!skip && !inOpaqueRegion && this._strip) {
                        if (sourceIndex < tmpTDALTags.index) {
                            if (!backtickOpened) {
                                returnValue[0] += '`';
                                backtickOpened = true;
                            }
                            returnValue[0] += template.substring(sourceIndex, tmpTDALTags.index).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
                        }
                        sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                    }
                }
                else {
                    throw new Error('Parse: Unclosed comment');
                }
            }
            else if (inOpaqueRegion && !(tmpTDALTags[6] && (tagName == innermost.name))) {
                if (('script' != innermost.name) && ['template', 'script'].includes(tagName) && !selfClosed) {
                    stack.push({ name: tagName, skip: false });
                }
            }
            else {
                const voidElement = jTDAL._HTML5VoidElements.has(tagName);
                if (!selfClosed || voidElement) {
                    if (tmpTDALTags[6]) {
                        if (innermost && (tagName == innermost.name)) {
                            const closed = stack.pop();
                            const beforeClose = (undefined !== closed.beforeClose);
                            if (beforeClose) {
                                if (!closed.skip && (sourceIndex < tmpTDALTags.index)) {
                                    returnValue[0] += template.substring(sourceIndex, tmpTDALTags.index).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
                                }
                                returnValue[0] += closed.beforeClose + (closed.omitClose ? '' : tmpTDALTags[0]).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') + closed.afterClose;
                                if (closed.repeatName) {
                                    returnValue[0] += '`;}},""):"")}' + `\${(delete r["REPEAT"]["${closed.repeatName}"],delete r["${closed.repeatName}"],"")}` + closed.repeatCloseTail;
                                }
                            }
                            if (closed.skip || beforeClose) {
                                sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                            }
                            if (closed.skip) {
                                skip = false;
                            }
                        }
                        else if (!innermost) {
                            throw new Error(`Parse: Unopened tag </${tagName}>`);
                        }
                        else {
                            throw new Error(`Parse: Mismatched closing tag </${tagName}>, expected </${innermost.name}>`);
                        }
                    }
                    else if (skip || tmpTDALTags[4]) {
                        if (!voidElement && !selfClosed) {
                            stack.push({ name: tagName, skip: false });
                        }
                    }
                    else if (tmpTDALTags[1]) {
                        if (sourceIndex < tmpTDALTags.index) {
                            if (!backtickOpened) {
                                returnValue[0] += '`';
                                backtickOpened = true;
                            }
                            returnValue[0] += template.substring(sourceIndex, tmpTDALTags.index).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
                        }
                        const current = ['', tmpTDALTags[0], '', '', '', ''];
                        const tagResult = ['', [false, false, false, false, false], false, new Set()];
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
                        let repeatName;
                        let repeatCloseTail = '';
                        let openingOutput = '';
                        let attribute = attributesPrefix + jTDAL._keywords[0];
                        if (attributes[attribute] && jTDAL._regexpCondition.exec(attributes[attribute][3])) {
                            tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros, tagResult);
                            if ('false' == tmpValue) {
                                dropElement = true;
                            }
                            else if ('true' != tmpValue) {
                                current[0] += '${' + tmpValue + '?`';
                                current[5] = '`:``}' + current[5];
                            }
                        }
                        if (!dropElement) {
                            attribute = attributesPrefix + jTDAL._keywords[1];
                            if (attributes[attribute] && (tmpMatch = jTDAL._regexpRepeat.exec(attributes[attribute][3]))) {
                                tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros, tagResult);
                                if (['false', '""', 'true'].includes(tmpValue)) {
                                    dropElement = true;
                                }
                                else {
                                    repeatName = tmpMatch[1];
                                    tagResult[1][2] = true;
                                    tagResult[2] = true;
                                    current[0] += '${((q=' + tmpValue + ')&&"object"==typeof q&&((Array.isArray(q)&&(k=q,q=true))||(k=Object.keys(q)))&&k.length?k.reduce((o,v,i)=>{' +
                                        `r["${repeatName}"]=(true===q)?v:q[v];` +
                                        `r["REPEAT"]["${repeatName}"]={` +
                                        'index:(true===q)?i:v,number:i+1,length:k.length,even:1==i%2,odd:0==i%2,first:0==i,last:k.length==i+1};' +
                                        '{let q,k;';
                                    repeatCloseTail = current[5];
                                    current[5] = '';
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
                                tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros, tagResult);
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
                                    const prefix = '${((q=' + tmpValue + ',false!==q)&&("string"===typeof q||("number"===typeof q&&!isNaN(q)))?' + (encode ? 'String(q).replace(f,m=>s[m])' : 'q') + ':(true!==q?``:' + '`';
                                    tagResult[1][3] ||= encode;
                                    tagResult[1][4] = true;
                                    if (attributesPrefix + jTDAL._keywords[2] == attribute) {
                                        current[3] += prefix;
                                        current[4] += '`))}';
                                    }
                                    else {
                                        if (repeatName) {
                                            openingOutput += prefix;
                                        }
                                        else {
                                            current[0] += prefix;
                                        }
                                        current[5] = '`))}' + current[5];
                                    }
                                }
                            }
                        }
                        if (!dropElement) {
                            attribute = attributesPrefix + jTDAL._keywords[4];
                            if (attributes[attribute]) {
                                for (const match of attributes[attribute][3].matchAll(jTDAL._regexpAttributes)) {
                                    const isFlag = '?' === match[2];
                                    tmpValue = jTDAL._ParsePath(match[3], isFlag, this._macros, tagResult);
                                    if ('false' == tmpValue) {
                                        if (attributes[match[1]]) {
                                            current[1] = current[1].replace(RegExp("\\s*\\b" + match[1] + "\\b(?:=(['\"]).*?\\1)?(?=\\s|\\/?>)"), '');
                                        }
                                    }
                                    else if ('true' != tmpValue) {
                                        if (isFlag) {
                                            current[2] += `\${${tmpValue}?\` ${match[1]}\`:\`\``;
                                        }
                                        else {
                                            tagResult[1][4] = true;
                                            current[2] += `\${((q=${tmpValue},false!==q)&&((q&&"string"===typeof q)||("number"===typeof q&&!isNaN(q)))?\` ${match[1]}="\${q}"\`:(true!==q?\`\`:\`` + ` ${match[1]}`;
                                        }
                                        if (attributes[match[1]]) {
                                            current[1] = current[1].replace(RegExp(`\\s*\\b${match[1]}\\b(?:=(['"]).*?\\1)?(?=\\s|\\/?>)`), '');
                                            current[2] += attributes[match[1]][3] ? '=' + (attributes[match[1]][2] + attributes[match[1]][3] + attributes[match[1]][2]).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') : '';
                                        }
                                        current[2] += isFlag ? '}' : '`))}';
                                    }
                                }
                            }
                        }
                        if (!dropElement) {
                            attribute = attributesPrefix + jTDAL._keywords[5];
                            if (attributes[attribute] && jTDAL._regexpCondition.exec(attributes[attribute][3])) {
                                tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros, tagResult);
                                if ('true' == tmpValue) {
                                    current[1] = '';
                                    omitClose = true;
                                }
                                else if ('false' != tmpValue) {
                                    const omitTagPrefix = `\${${tmpValue}?\`\`:\``;
                                    if (repeatName) {
                                        openingOutput += omitTagPrefix;
                                    }
                                    else {
                                        current[0] += omitTagPrefix;
                                    }
                                    current[3] = '`}' + current[3];
                                    current[4] += omitTagPrefix;
                                    current[5] = '`}' + current[5];
                                }
                            }
                        }
                        current[1] = current[1].replace(jTDAL._regexpTagEnd, '');
                        if (dropElement) {
                            sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                            if (!(selfClosed || voidElement)) {
                                stack.push({ name: tagName, skip: true });
                                skip = true;
                            }
                        }
                        else if (selfClosed || voidElement) {
                            const syntheticClose = current[3] || current[4];
                            if (!backtickOpened) {
                                returnValue[0] += '`';
                                backtickOpened = true;
                            }
                            returnValue[0] += current[0];
                            if (repeatName) {
                                returnValue[0] += 'return o+`' + openingOutput;
                            }
                            returnValue[0] += current[1].replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') + current[2] + (current[1] ? (syntheticClose ? '>' : '/>') : '') + current[3];
                            returnValue[0] += current[4] + (syntheticClose ? `</${tagName}>` : '').replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') + current[5];
                            if (repeatName) {
                                returnValue[0] += '`;}},""):"")}' + `\${(delete r["REPEAT"]["${repeatName}"],delete r["${repeatName}"],"")}` + repeatCloseTail;
                            }
                            sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                        }
                        else {
                            if (!backtickOpened) {
                                returnValue[0] += '`';
                                backtickOpened = true;
                            }
                            returnValue[0] += current[0];
                            if (repeatName) {
                                returnValue[0] += 'return o+`' + openingOutput;
                            }
                            returnValue[0] += current[1].replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') + current[2] + (current[1] ? '>' : '') + current[3];
                            sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
                            const stackTag = { name: tagName, skip: dropContent, beforeClose: current[4], afterClose: current[5], omitClose };
                            if (repeatName) {
                                stackTag.repeatName = repeatName;
                                stackTag.repeatCloseTail = repeatCloseTail;
                            }
                            stack.push(stackTag);
                        }
                        if (!dropElement) {
                            const cL1 = tagResult[1].length;
                            for (let iL1 = 0; iL1 < cL1; iL1++) {
                                returnValue[1][iL1] ||= tagResult[1][iL1];
                            }
                            returnValue[2] ||= tagResult[2];
                            tagResult[3].forEach((value) => { returnValue[3].add(value); });
                        }
                        if (dropContent) {
                            skip = true;
                        }
                    }
                }
                else {
                    throw new Error(`Parse: Self-closed non-void tag <${tagName}>`);
                }
            }
        }
        if (0 == stack.length) {
            if (sourceIndex < template.length) {
                if (!backtickOpened) {
                    returnValue[0] += '`';
                    backtickOpened = true;
                }
                returnValue[0] += template.substring(sourceIndex).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
            }
        }
        else {
            throw new Error(`Parse: Unclosed tag <${stack[stack.length - 1].name}>`);
        }
        if (!backtickOpened) {
            returnValue[0] = '``';
        }
        else {
            returnValue[0] += '`';
        }
        return returnValue;
    }
    MacroAdd(macroName, template) {
        if (jTDAL._regexpMacroName.test(macroName)) {
            const macroResult = this._Parse(template);
            if (this._trim) {
                macroResult[0] = '(' + macroResult[0] + ').trim()';
            }
            this._macros[macroName] = macroResult;
        }
        else {
            throw new Error('MacroAdd: Invalid macro name');
        }
    }
    _Compile(template) {
        const parseResult = this._Parse(template);
        for (const macroName of parseResult[3]) {
            if (Object.hasOwn(this._macros, macroName)) {
                const macroResult = this._macros[macroName];
                const cL1 = parseResult[1].length;
                for (let iL1 = 0; iL1 < cL1; iL1++) {
                    if (2 != iL1 && 4 != iL1) {
                        parseResult[1][iL1] ||= macroResult[1][iL1];
                    }
                }
                parseResult[2] ||= macroResult[2];
                macroResult[3].forEach((value) => { parseResult[3].add(value); });
            }
        }
        const declarations = [];
        if (parseResult[1][0]) {
            declarations.push('r=' + (parseResult[2] ? '{REPEAT:{}}' : '{}'));
            declarations.push('c=(a,c,e)=>{let z=a,y=c.split("/"),x=0,w,l=y.length,m=2&e;for(;x<l&&1!==z;){z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;x++;if(1&e&&(false===z||x==l&&m&&!b(z))){z=d;e=0;x=0}}return m?b(z):z}');
        }
        if (parseResult[1][1]) {
            declarations.push('b=v=>!!v&&("object"!==typeof v||(Array.isArray(v)?0<v.length:0<Object.keys(v).length))');
        }
        if (parseResult[1][3]) {
            declarations.push(`f=/[&<>"]/g`, `s={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}`);
        }
        if (parseResult[3].size) {
            declarations.push('m={' + Array.from(parseResult[3], (macroName) => {
                const macroResult = this._macros[macroName];
                const block = (macroResult[1][2] ? '{let q,k;return ' : (macroResult[1][4] ? '{let q;return ' : ''));
                return `"${macroName}":()=>${block}${macroResult[0]}${block ? '}' : ''}`;
            }).join(',') + '}');
        }
        return ((parseResult[1][2] ? 'let q,k;' : (parseResult[1][4] ? 'let q;' : '')) +
            (declarations.length ? `const ${declarations.join(',')};` : '') +
            'return ' + (this._trim ? '(' : '') + parseResult[0] +
            (this._trim ? ').trim()' : ''));
    }
    CompileToFunction(template) {
        return new Function('d', this._Compile(template));
    }
    CompileToString(template) {
        return `function(d){${this._Compile(template)}}`;
    }
}
//# sourceMappingURL=jTDAL.js.map