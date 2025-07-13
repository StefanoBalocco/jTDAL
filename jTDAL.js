'use strict';
export default class jTDAL {
    static _keywords = ['condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
    static _regexpPatternPath = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternString = 'STRING:(?:[^;](?:(?!<=;);)?)+';
    static _regexpPatternMacro = 'MACRO:[a-zA-Z0-9-]+';
    static _regexpPatternPathBoolean = '(?:(?:!)?[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternExpressionAllowedBoolean = '(?:' + jTDAL._regexpPatternString + '|(?:' + jTDAL._regexpPatternPathBoolean + ')(?:[\\s]*\\|[\\s]*' + jTDAL._regexpPatternString + ')?)';
    static _regexpPatternExpressionAllowedBooleanMacro = '(?:' + jTDAL._regexpPatternMacro + '|' + jTDAL._regexpPatternString + '|' + jTDAL._regexpPatternPathBoolean + '(?:[\\s]*\\|[\\s]*' + jTDAL._regexpPatternString + ')?)';
    static _regexpTagWithTDAL = new RegExp('<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+\\bdata-tdal-(?:' + jTDAL._keywords.join('|') +
        ')\\b=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i');
    static _regexpTagAttributes = /\s((?:[\w-]+:)?[\w-]+)=(?:(['"])(.*?)\2|([^>\s'"]+))/gi;
    static _regexpPathString = new RegExp('(?:{(' + jTDAL._regexpPatternPath + ')}|{\\?(' + jTDAL._regexpPatternPathBoolean + ')}(.*?){\\/\\2})');
    static _regexpCondition = new RegExp('^[\\s]*(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*$');
    static _regexpRepeat = new RegExp('^[\\s]*([\\w\\-]+?)[\\s]+(' + jTDAL._regexpPatternPath + ')[\\s]*$');
    static _regexpContent = new RegExp('^[\\s]*(?:(structure)[\\s]+)?(' + jTDAL._regexpPatternExpressionAllowedBooleanMacro + ')[\\s]*$');
    static _regexpAttributes = new RegExp('[\\s]*(?:(?:([\\w\\-]+)(\\??)[\\s]+(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*)(?:;;[\\s]*|$))', 'g');
    static _regexpAttributesTDAL = /\s*(data-tdal-[\w-]+)=(?:(['"])(.*?)\2|([^>\s'"]+))/gi;
    static _HTML5VoidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    _macros = {};
    _trim;
    _strip;
    _loopOnlyArray;
    static _ParseString(stringExpression, macros = {}) {
        let returnValue = '""';
        let match;
        while (null != (match = jTDAL._regexpPathString.exec(stringExpression))) {
            if (0 < match['index']) {
                returnValue += '+' + JSON.stringify(String(stringExpression.substring(0, match['index'])));
            }
            stringExpression = stringExpression.substring(match['index'] + match[0].length);
            if (match[1]) {
                returnValue += '+(a(' + jTDAL._ParsePath(match[1], false, macros) + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?t[t[0]]:"")';
            }
            else if (match[2]) {
                const tmpValue = jTDAL._ParsePath(match[2], true, macros);
                if ('true' === tmpValue) {
                    returnValue += '+' + this._ParseString(match[3], macros);
                }
                else if ('false' !== tmpValue) {
                    returnValue += '+(true===' + tmpValue + '?""+' + this._ParseString(match[3], macros) + ':"")';
                }
            }
        }
        if (0 < stringExpression.length) {
            returnValue += '+' + JSON.stringify(String(stringExpression));
        }
        return returnValue;
    }
    static _ParsePath(pathExpression, getBoolean = false, macros = {}) {
        let returnValue = '';
        if (pathExpression) {
            paths: {
                const paths = pathExpression.split('|');
                const cL1 = paths.length;
                for (let iL1 = 0; iL1 < cL1; ++iL1) {
                    if (0 != iL1) {
                        returnValue += '||';
                    }
                    let currentPath = paths[iL1].replace(/^\s+/, '');
                    if (currentPath.startsWith('STRING:')) {
                        returnValue += '(' + this._ParseString(currentPath.substring(7)) + ')';
                        break paths;
                    }
                    else if (currentPath.startsWith('MACRO:')) {
                        if (undefined !== macros[currentPath.substring(6)]) {
                            returnValue += '("function"===typeof m["' + currentPath.substring(6) + '"]?m["' + currentPath.substring(6) + '"]():false)';
                        }
                        else {
                            returnValue += 'false';
                        }
                        break paths;
                    }
                    else {
                        currentPath = currentPath.replace(/\s+$/, '');
                        const not = ('!' === currentPath[0]);
                        const boolPath = getBoolean || not;
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
                                    break paths;
                                }
                                case 'TRUE': {
                                    if (not) {
                                        returnValue += 'false';
                                    }
                                    else {
                                        returnValue += 'true';
                                    }
                                    break paths;
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
                                        returnValue += (not ? '!(' : '') + 'b(c(r,"' + path.join('/') + '"))||b(c(d,"' + path.join('/') + '"))' + (not ? ')' : '');
                                    }
                                    else {
                                        returnValue += '([c(r,"' + path.join('/') + '"),c(d,"' + path.join('/') + '")].find((v)=>false!==v)??false)';
                                    }
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
    constructor(trim = true, strip = true, loopOnlyArray = true) {
        this._trim = trim;
        this._strip = strip;
        this._loopOnlyArray = loopOnlyArray;
    }
    _Parse(template) {
        let returnValue = '';
        let tmpTDALTags;
        const attributesPrefix = 'data-tdal-';
        while (null !== (tmpTDALTags = jTDAL._regexpTagWithTDAL.exec(template))) {
            if (0 < tmpTDALTags['index']) {
                returnValue += "+" + JSON.stringify(String(template.substring(0, tmpTDALTags['index'])));
            }
            template = template.substring(tmpTDALTags['index'] + tmpTDALTags[0].length);
            let selfClosed = !!tmpTDALTags[6] || jTDAL._HTML5VoidElements.has(tmpTDALTags[1].toLowerCase());
            const current = ['', tmpTDALTags[0], '', '', '', '', '', ''];
            const attributes = {};
            const matches = tmpTDALTags[0].matchAll(jTDAL._regexpTagAttributes);
            for (const match of matches) {
                attributes[match[1]] = match;
            }
            current[1] = current[1].replaceAll(jTDAL._regexpAttributesTDAL, '');
            if (!selfClosed) {
                const endTag = new RegExp('<(\\/)?' + tmpTDALTags[1] + '[^<>]*(?<!\\/)>', 'gi');
                let closingPosition = [];
                let tags = 1;
                let tmpMatch;
                while ((undefined === closingPosition[0]) && (null !== (tmpMatch = endTag.exec(template)))) {
                    if (!tmpMatch[1]) {
                        tags++;
                    }
                    else {
                        tags--;
                    }
                    if (0 == tags) {
                        closingPosition = [tmpMatch['index'], tmpMatch[0].length];
                    }
                }
                if (undefined === closingPosition[0]) {
                    selfClosed = true;
                }
                else {
                    current[4] += this._Parse(template.substring(0, closingPosition[0]));
                    current[6] += template.substring(closingPosition[0], closingPosition[0] + closingPosition[1]);
                    template = template.substring(closingPosition[0] + closingPosition[1]);
                }
            }
            tdal: {
                let tmpMatch;
                let tmpValue;
                let attribute = attributesPrefix + jTDAL._keywords[0];
                if (attributes[attribute] && (jTDAL._regexpCondition.exec(attributes[attribute][3]))) {
                    tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
                    if ('false' === tmpValue) {
                        break;
                    }
                    else if ('true' !== tmpValue) {
                        current[0] += '+(true===' + tmpValue + '?""';
                        current[7] = ':"")' + current[7];
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[1];
                if (attributes[attribute] && (tmpMatch = jTDAL._regexpRepeat.exec(attributes[attribute][3]))) {
                    tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros);
                    if (('false' == tmpValue) || ('""' == tmpValue) || ('true' == tmpValue)) {
                        break;
                    }
                    else {
                        if (this._loopOnlyArray) {
                            current[0] += '+(';
                            current[0] += '(t[0]+=2)&&';
                            current[0] += 'a(' + tmpValue + ',-2)&&';
                            current[0] += 'Array.isArray(t[t[0]-2])&&';
                            current[0] += '(t[t[0]-1]=t[t[0]-2].length)';
                            current[0] += '?';
                            current[0] += 't[t[0]-2].reduce(';
                            current[0] += '(o,v,i)=>{';
                            current[0] += 'r["' + tmpMatch[1] + '"]=v;';
                            current[0] += 'const n=i+1,l=t[t[0]-1];';
                            current[0] += 'r["REPEAT"]["' + tmpMatch[1] + '"]={' +
                                'index:i,' +
                                'number:n,' +
                                'length:l,' +
                                'even:0==(n%2),' +
                                'odd:1==(n%2),' +
                                'first:1==n,' +
                                'last:l==n' +
                                '};';
                            current[0] += 'return o';
                            current[7] = ';},""):"")+((t[0]-=2)&&(delete r["REPEAT"]["' + tmpMatch[1] + '"])&&(delete r["' + tmpMatch[1] + '"])?"":"")' + current[7];
                        }
                        else {
                            current[0] += '+(';
                            current[0] += '(t[0]+=3)&&';
                            current[0] += 'a(' + tmpValue + ',-3)&&';
                            current[0] += '(';
                            current[0] += '(Array.isArray(t[t[0]-3])&&(t[t[0]-2]=t[t[0]-3])&&(t[t[0]-3]=true))';
                            current[0] += '||';
                            current[0] += '("object"===typeof t[t[0]-3]&&null!==t[t[0]-3]&&(t[t[0]-2]=Object.keys(t[t[0]-3])))';
                            current[0] += ')&&(t[t[0]-1]=t[t[0]-2].length)';
                            current[0] += '?';
                            current[0] += 't[t[0]-2].reduce(';
                            current[0] += '(o,v,i)=>{';
                            current[0] += 'r["' + tmpMatch[1] + '"]=(true===t[t[0]-3])?v:t[t[0]-3][v];';
                            current[0] += 'const n=i+1,l=t[t[0]-1];';
                            current[0] += 'r["REPEAT"]["' + tmpMatch[1] + '"]={' +
                                'index:(true===t[t[0]-3])?i:v,' +
                                'number:n,' +
                                'length:l,' +
                                'even:0==(n%2),' +
                                'odd:1==(n%2),' +
                                'first:1==n,' +
                                'last:l==n' +
                                '};';
                            current[0] += 'return o';
                            current[7] = ';},""):"")+((t[0]-=3)&&(delete r["REPEAT"]["' + tmpMatch[1] + '"])&&(delete r["' + tmpMatch[1] + '"])?"":"")' + current[7];
                        }
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[2];
                if (attributes[attribute] && (tmpMatch = jTDAL._regexpContent.exec(attributes[attribute][3]))) {
                    tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros);
                    if ('false' == tmpValue) {
                        current[4] = '';
                    }
                    else if ('true' != tmpValue) {
                        let encoding = ['', ''];
                        if ('structure' != tmpMatch[1]) {
                            encoding[0] = 'String(';
                            encoding[1] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                        }
                        current[3] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[0] + 't[t[0]]' + encoding[1] + ':(true!==t[t[0]]?"":""';
                        current[5] += '))';
                    }
                }
                else {
                    attribute = attributesPrefix + jTDAL._keywords[3];
                    if (attributes[attribute] && (tmpMatch = jTDAL._regexpContent.exec(attributes[attribute][3]))) {
                        tmpValue = jTDAL._ParsePath(tmpMatch[2], false, this._macros);
                        if ('false' == tmpValue) {
                            current[1] = '';
                            current[4] = '';
                            current[6] = '';
                        }
                        else if ('true' != tmpValue) {
                            let encoding = ['', ''];
                            if ('structure' != tmpMatch[1]) {
                                encoding[0] = 'String(';
                                encoding[1] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                            }
                            current[0] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[0] + 't[t[0]]' + encoding[1] + ':(true!==t[t[0]]?"":""';
                            current[7] = '))' + current[7];
                        }
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[4];
                if (attributes[attribute]) {
                    const matches = attributes[attribute][3].matchAll(jTDAL._regexpAttributes);
                    for (tmpMatch of matches) {
                        const isFlag = '?' === tmpMatch[2];
                        tmpValue = jTDAL._ParsePath(tmpMatch[3], isFlag, this._macros);
                        if ('false' === tmpValue) {
                            if (undefined !== attributes[tmpMatch[1]]) {
                                current[1] = current[1].replace(new RegExp('\\s*\\b' + tmpMatch[1] + '\\b(?:=([\'"]).*?\\1)?(?=\\s|\\/?>)'), '');
                            }
                        }
                        else if ('true' !== tmpValue) {
                            if (isFlag) {
                                current[2] += `+(${tmpValue}?" ${tmpMatch[1]}":""`;
                            }
                            else {
                                current[2] += `+(a(${tmpValue})&&((t[t[0]]&&"string"===typeof t[t[0]])||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?" ${tmpMatch[1]}=\\""+t[t[0]]+"\\"":( true !== t[t[0]]?"":"${tmpMatch[1]}"`;
                            }
                            if (undefined !== attributes[tmpMatch[1]]) {
                                current[1] = current[1].replace(new RegExp('\\s*\\b' + tmpMatch[1] + '\\b(?:=([\'"]).*?\\1)?(?=\\s|\\/?>)'), '');
                                current[2] += (((undefined !== attributes[tmpMatch[1]][3]) && ('' != attributes[tmpMatch[1]][3])) ? '+"="+' + JSON.stringify(String(attributes[tmpMatch[1]][2] + attributes[tmpMatch[1]][3] + attributes[tmpMatch[1]][2])) : "");
                            }
                            current[2] += ')';
                            if (!isFlag) {
                                current[2] += ')';
                            }
                        }
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[5];
                if (attributes[attribute] && (jTDAL._regexpCondition.exec(attributes[attribute][3]))) {
                    tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
                    if ('true' == tmpValue) {
                        current[1] = '';
                        current[6] = '';
                    }
                    else if ('false' != tmpValue) {
                        current[0] += '+(' + tmpValue + '?"":""';
                        current[3] = ')' + current[3];
                        current[5] += '+(' + tmpValue + '?"":""';
                        current[7] = ')' + current[7];
                    }
                }
            }
            current[1] = current[1].replace(/\s*\/?>$/, '');
            if (selfClosed && (('' != current[4]) || ('' != current[3]) || ('' != current[5]))) {
                current[6] = '</' + tmpTDALTags[1] + '>';
                selfClosed = false;
            }
            returnValue += current[0] + '+' + JSON.stringify(String(current[1])) + current[2] +
                (('' != current[1]) ? '+"' + (selfClosed ? '/' : '') + '>"' : '') + current[3] + current[4] + current[5] + '+' +
                JSON.stringify(String(current[6])) + current[7];
        }
        returnValue += '+' + JSON.stringify(String(template));
        return returnValue;
    }
    MacroAdd(macroName, template) {
        let returnValue = false;
        if (macroName.match(/^[a-zA-Z0-9-]+$/)) {
            returnValue = true;
            this._macros[macroName] = '""' + this._Parse(this._strip ? template.replace(/<!--.*?-->/sg, '') : template);
            if (this._trim) {
                this._macros[macroName] = '(' + this._macros[macroName] + ').trim()';
            }
        }
        return returnValue;
    }
    _Compile(template) {
        const tmpArray = ['', ''];
        let tmpValue = this._Parse(this._strip ? template.replace(/<!--.*?-->/sg, '') : template);
        let returnValue = 'const r={"REPEAT":{}}';
        returnValue += ',t=[1]';
        returnValue += ',m={' + Object.keys(this._macros).map((macro) => '"' + macro + '":()=>' + this._macros[macro]).join(',') + '}';
        returnValue += ',a=(e,i=0)=>{';
        returnValue += 't[t[0]+i]=e;';
        returnValue += 'return false!==t[t[0]+i]';
        returnValue += '}';
        returnValue += ',c=(a,b)=>{';
        returnValue += 'let z=!1,y=b.split("/"),x,w,l=y.length;';
        returnValue += 'if(l&&y[0].length)';
        returnValue += 'for(z=a,x=0;x<l&&1!==z;x++)';
        returnValue += 'z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;';
        returnValue += 'return z';
        returnValue += '}';
        returnValue += ',b=(v)=>{';
        returnValue += 'return v&&("object"===typeof v?0<Object.keys(v).length:(Array.isArray(v)?0<v.length:true))';
        returnValue += '}';
        returnValue += ';';
        if (this._trim) {
            tmpArray[0] = '(';
            tmpArray[1] = ').trim()';
        }
        returnValue += 'return ' + tmpArray[0] + '""' + tmpValue + tmpArray[1];
        tmpValue = '';
        do {
            tmpValue = returnValue;
            returnValue = returnValue.replace(/(?<!\\)"\+"/g, '').replace('(true!==t[t[0]]?"":"")', '""');
        } while (tmpValue != returnValue);
        return returnValue;
    }
    CompileToFunction(template) {
        return new Function('d', this._Compile(template));
    }
    CompileToString(template) {
        return 'function(d){' + this._Compile(template) + '}';
    }
}
