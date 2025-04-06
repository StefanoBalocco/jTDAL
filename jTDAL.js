'use strict';
export default class jTDAL {
    static _keywords = ['condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
    static _regexpPatternPath = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternString = 'STRING:(?:[^;](?:(?!<=;);)?)+';
    static _regexpPatternMacro = 'MACRO:[a-zA-Z0-9-]+';
    static _regexpPatternPathBoolean = '(?:(?:!)?[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
    static _regexpPatternExpressionAllowedBoolean = '(?:' + jTDAL._regexpPatternString + '|(?:' + jTDAL._regexpPatternPathBoolean + ')(?:[\\s*]\\|[\\s*]' + jTDAL._regexpPatternString + ')?)';
    static _regexpPatternExpressionAllowedBooleanMacro = '(?:' + jTDAL._regexpPatternMacro + '|' + jTDAL._regexpPatternString + '|' + jTDAL._regexpPatternPathBoolean + '(?:[\\s*]\\|[\\s*]' + jTDAL._regexpPatternString + ')?)';
    static _regexpTagWithTDAL = new RegExp('<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+data-tdal-(?:' + jTDAL._keywords.join('|') +
        ')=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i');
    static _regexpTagAttributes = new RegExp('(?<=\\s)((?:[\\w\\-]+\:)?[\\w\\-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi');
    static _regexpPathString = new RegExp('(?:{(' + jTDAL._regexpPatternPath + ')}|{\\?(' + jTDAL._regexpPatternPathBoolean + ')}(.*?){\\/\\2})');
    static _regexpCondition = new RegExp('^[\\s]*(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*$');
    static _regexpRepeat = new RegExp('^[\\s]*([\\w\\-]+?)[\\s]+(' + jTDAL._regexpPatternPath + ')[\\s]*$');
    static _regexpContent = new RegExp('^[\\s]*(?:(structure)[\\s]+)?(' + jTDAL._regexpPatternExpressionAllowedBooleanMacro + ')[\\s]*$');
    static _regexpAttributes = new RegExp('[\\s]*(?:(?:([\\w\\-]+?)[\\s]+(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*)(?:;;[\\s]*|$))', 'g');
    static _regexpAttributesTDAL = new RegExp('\\s*(data-tdal-[\\w\\-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi');
    static _HTML5VoidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    _macros = {};
    static _ParseString(stringExpression, macros = {}) {
        let returnValue = '""';
        let match = null;
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
                        if ('undefined' !== typeof macros[currentPath.substring(6)]) {
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
                                        returnValue += (not ? '!(' : '') + '(a(c(r,"' + path.join('/') + '"))&&false!==b(t[t[0]]))||(a(c(d,"' + path.join('/') + '"))&&false!==b(t[t[0]]))' + (not ? ')' : '');
                                    }
                                    else {
                                        returnValue += '((a(c(r,"' + path.join('/') + '"))||a(c(d,"' + path.join('/') + '")))?t[t[0]]:false)';
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
    _Parse(template) {
        let returnValue = '';
        let tmpTDALTags = null;
        const attributesPrefix = 'data-tdal-';
        while (null !== (tmpTDALTags = jTDAL._regexpTagWithTDAL.exec(template))) {
            if (0 < tmpTDALTags['index']) {
                returnValue += "+" + JSON.stringify(String(template.substring(0, tmpTDALTags['index'])));
            }
            template = template.substring(tmpTDALTags['index'] + tmpTDALTags[0].length);
            let attributes = {};
            let tmpMatch;
            while (null !== (tmpMatch = jTDAL._regexpTagAttributes.exec(tmpTDALTags[0]))) {
                attributes[tmpMatch[1]] = tmpMatch;
            }
            let current = ['', tmpTDALTags[0], '', '', '', '', '', ''];
            current[1] = current[1].replace(jTDAL._regexpAttributesTDAL, '');
            let selfClosed = !!tmpTDALTags[6] || jTDAL._HTML5VoidElements.includes(tmpTDALTags[1].toLowerCase());
            if (!selfClosed) {
                let closingPosition = [];
                const endTag = new RegExp('<(\\/)?' + tmpTDALTags[1] + '[^<>]*(?<!\\/)>', 'gi');
                let tags = 1;
                while (('undefined' === typeof closingPosition[0]) && (null !== (tmpMatch = endTag.exec(template)))) {
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
                if ('undefined' === typeof closingPosition[0]) {
                    selfClosed = true;
                }
                else {
                    current[4] += this._Parse(template.substring(0, closingPosition[0]));
                    current[6] += template.substring(closingPosition[0], closingPosition[0] + closingPosition[1]);
                    template = template.substring(closingPosition[0] + closingPosition[1]);
                }
            }
            tdal: {
                let attribute = attributesPrefix + jTDAL._keywords[0];
                if (attributes[attribute] && (jTDAL._regexpCondition.exec(attributes[attribute][3]))) {
                    let tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
                    if ('false' === tmpValue) {
                        break tdal;
                    }
                    else if ('true' !== tmpValue) {
                        current[0] += '+(true===' + tmpValue + '?""';
                        current[7] = ':"")' + current[7];
                    }
                }
                let tmpTDALrules;
                attribute = attributesPrefix + jTDAL._keywords[1];
                if (attributes[attribute] && (tmpTDALrules = jTDAL._regexpRepeat.exec(attributes[attribute][3]))) {
                    let tmpValue = jTDAL._ParsePath(tmpTDALrules[2], false, this._macros);
                    if (('false' == tmpValue) || ('""' == tmpValue) || ('true' == tmpValue)) {
                        break tdal;
                    }
                    else {
                        current[0] += '+(';
                        current[0] += '((';
                        current[0] += 'a(' + tmpValue + ')&&';
                        current[0] += '(!Array.isArray(t[t[0]])||(t[t[0]]=Object.assign({},t[t[0]])))&&';
                        current[0] += '("object"===typeof t[t[0]]&&null!==t[t[0]]&&Object.keys(t[t[0]]).length)';
                        current[0] += ')?((t[++t[0]]=1)&&t[0]++):((t[0]+=2)&&false))';
                        current[0] += '?';
                        current[0] += 'Object.keys(t[t[0]-2]).reduce((o,e)=>{';
                        current[0] += 'r["' + tmpTDALrules[1] + '"]=t[t[0]-2][e];';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]={};';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["index"]=e;';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]=t[t[0]-1]++;';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["even"]=0==(r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]%2);';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["odd"]=1==(r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]%2);';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["first"]=1==r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"];';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["length"]=Object.keys(t[t[0]-2]);';
                        current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["last"]=r["REPEAT"]["' + tmpTDALrules[1] + '"]["length"]==r["REPEAT"]["' +
                            tmpTDALrules[1] + '"]["number"];';
                        current[0] += 'return o';
                        current[7] = ';},""):"")+((t[0]-=2)&&(delete r["REPEAT"]["' + tmpTDALrules[1] + '"])&&delete(r["' + tmpTDALrules[1] + '"])?"":"")' + current[7];
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[2];
                if (attributes[attribute] && (tmpTDALrules = jTDAL._regexpContent.exec(attributes[attribute][3]))) {
                    let tmpValue = jTDAL._ParsePath(tmpTDALrules[2], false, this._macros);
                    if ('false' == tmpValue) {
                        current[4] = '';
                    }
                    else if ('true' != tmpValue) {
                        let encoding = ['', ''];
                        if ('structure' != tmpTDALrules[1]) {
                            encoding[0] = 'String(';
                            encoding[1] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                        }
                        current[3] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[0] + 't[t[0]]' + encoding[1] + ':(true!==t[t[0]]?"":""';
                        current[5] += '))';
                    }
                }
                else {
                    attribute = attributesPrefix + jTDAL._keywords[3];
                    if (attributes[attribute] && (tmpTDALrules = jTDAL._regexpContent.exec(attributes[attribute][3]))) {
                        let tmpValue = jTDAL._ParsePath(tmpTDALrules[2], false, this._macros);
                        if ('false' == tmpValue) {
                            current[1] = '';
                            current[4] = '';
                            current[6] = '';
                        }
                        else if ('true' != tmpValue) {
                            let encoding = ['', ''];
                            if ('structure' != tmpTDALrules[1]) {
                                encoding[0] = 'String(';
                                encoding[1] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                            }
                            current[0] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[0] + 't[t[0]]' + encoding[1] + ':(true!==t[t[0]]?"":""';
                            current[7] = '))' + current[7];
                        }
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[4];
                if (attributes[attribute] && (tmpTDALrules = jTDAL._regexpAttributes.exec(attributes[attribute][3]))) {
                    while (null !== tmpTDALrules) {
                        let tmpValue = jTDAL._ParsePath(tmpTDALrules[2], false, this._macros);
                        if ('false' === tmpValue) {
                            if ('undefined' !== (typeof attributes[tmpTDALrules[1]])) {
                                current[1] = current[1].replace(new RegExp('\\s*' + tmpTDALrules[1] + '(?:=([\'"]).*?\\1)?'), '');
                            }
                        }
                        else if ('true' !== tmpValue) {
                            current[2] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?" ' + tmpTDALrules[1] + '=\\""+t[t[0]]+"\\"":(true!==t[t[0]]?"":"' + tmpTDALrules[1] + '"';
                            if ('undefined' !== (typeof attributes[tmpTDALrules[1]])) {
                                current[1] = current[1].replace(new RegExp('\\s*' + tmpTDALrules[1] + '(?:=([\'"]).*?\\1)?'), '');
                                current[2] += ((('undefined' !== (typeof attributes[tmpTDALrules[1]][3])) && ('' != attributes[tmpTDALrules[1]][3])) ? '+"="+' + JSON.stringify(String(attributes[tmpTDALrules[1]][2] + attributes[tmpTDALrules[1]][3] + attributes[tmpTDALrules[1]][2])) : "");
                            }
                            current[2] += '))';
                        }
                        tmpTDALrules = jTDAL._regexpAttributes.exec(attributes[attribute][3]);
                    }
                }
                attribute = attributesPrefix + jTDAL._keywords[5];
                if (attributes[attribute] && (jTDAL._regexpCondition.exec(attributes[attribute][3]))) {
                    let tmpValue = jTDAL._ParsePath(attributes[attribute][3], true, this._macros);
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
    MacroAdd(macroName, template, trim = true, strip = true) {
        let returnValue = false;
        if (macroName.match(/[a-zA-Z0-9]/)) {
            returnValue = true;
            this._macros[macroName] = '""' + this._Parse(strip ? template.replace(/<!--.*?-->/sg, '') : template);
            if (trim) {
                this._macros[macroName] = '(' + this._macros[macroName] + ').trim()';
            }
        }
        return returnValue;
    }
    constructor(macros = [], trim = true, strip = true) {
        const cL1 = macros.length;
        for (let iL1 = 0; iL1 < cL1; iL1++) {
            this.MacroAdd(macros[iL1][0], macros[iL1][1], trim, strip);
        }
    }
    _Compile(template, trim = true, strip = true) {
        let tmpValue = this._Parse(strip ? template.replace(/<!--.*?-->/sg, '') : template);
        let returnValue = 'const r={"REPEAT":{}}';
        returnValue += ',t=[1]';
        returnValue += ',m={' + Object.keys(this._macros).map(macro => '"' + macro + '":()=>' + this._macros[macro]).join(',') + '}';
        returnValue += ',a=(e)=>{';
        returnValue += 't[t[0]]=e;';
        returnValue += 'return false!==t[t[0]]';
        returnValue += '}';
        returnValue += ',c=(a,b)=>{';
        returnValue += 'let z=!1,y=b.split("/"),x,w;';
        returnValue += 'if(0<y.length&&0<y[0].length)';
        returnValue += 'for(z=a,x=0;x<y.length&&1!==z;x++)';
        returnValue += 'z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;';
        returnValue += 'return z';
        returnValue += '}';
        returnValue += ',b=(v)=>{';
        returnValue += 'return "object"===typeof v?null!==v&&0<Object.keys(v).length:(Array.isArray(v)?0<v.length:void 0!==typeof v&&false!==v&&""!==v)';
        returnValue += '}';
        returnValue += ';';
        const tmpArray = ['', ''];
        if (trim) {
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
    CompileToFunction(template, trim = true, strip = true) {
        return new Function('d', this._Compile(template, trim, strip));
    }
    CompileToString(template, trim = true, strip = true) {
        return 'function(d){' + this._Compile(template, trim, strip) + '}';
    }
}
