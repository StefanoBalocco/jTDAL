'use strict';
var jTDAL;
(function (jTDAL) {
    const regexpPatternPath = '(?:[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
    const regexpPatternPathAllowedBoolean = '(?:(?:!)?[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
    const regexpPatternExpressionAllowedBoolean = '(STRING:[^;]+|' + regexpPatternPathAllowedBoolean + ')';
    const keywords = ['condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
    const regexp = {
        'pathString': new RegExp('^[\\s]*STRING:(.*)$'),
        'tagWithTDAL': new RegExp('<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+data-tdal-(?:' + keywords.join('|') +
            ')=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i'),
        'tagWithAttribute': new RegExp('<((?:\w+:)?\w+)(\s+[^<>]+?)??\s+%s=([\'"])(.*?)\\3(\s+[^<>]+?)??\s*(\/)?>', 'i'),
        'tagAttributes': new RegExp('(?<=\\s)((?:[\\w-]+\:)?[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi'),
        'pathInString': new RegExp('{(' + regexpPatternPath + ')}', 'g'),
        'condition': new RegExp('^[\\s]*(\\!?)[\\s]*' + regexpPatternExpressionAllowedBoolean + '[\\s]*$'),
        'repeat': new RegExp('^[\\s]*([\\w-]+?)[\\s]+(' + regexpPatternPath + ')[\\s]*$'),
        'content': new RegExp('^[\\s]*(?:(text|structure)[\\s]+)?(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*$'),
        'attributes': new RegExp('[\\s]*(?:(?:([\\w-]+?)[\\s]+' + regexpPatternExpressionAllowedBoolean + '[\\s]*)(?:;[\\s]*|$))', 'g'),
        'attributesTDAL': new RegExp('\\s*(data-tdal-[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi')
    };
    function ExpressionResultToBoolean(result) {
        let returnValue = '';
        switch (result) {
            case 'true':
            case 'false': {
                returnValue = result;
                break;
            }
            default: {
                if (result.startsWith('!(')) {
                    returnValue = '!' + result;
                }
                else {
                    returnValue = '!(' + ExpressionResultNot(result) + ')';
                }
            }
        }
        return (returnValue);
    }
    function ExpressionResultNot(result) {
        let returnValue = '"undefined"===typeof (t[i++]=' + result + ')||false===t[--i]||null===t[i]||(Array.isArray(t[i])&&1>t[i].length)||("object"===typeof t[i]&&1>Object.keys(t[i]).length)';
        switch (result) {
            case 'true': {
                returnValue = 'false';
                break;
            }
            case 'false': {
                returnValue = 'true';
                break;
            }
        }
        return (returnValue);
    }
    function ParsePath(pathExpression) {
        let returnValue = '';
        let openedBracket = 0;
        paths: {
            const paths = pathExpression.split('|');
            const countFirstLevel = paths.length;
            for (let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
                if (regexp['pathString'].exec(paths[indexFirstLevel])) {
                    let compiledString = '';
                    let index = paths[indexFirstLevel].indexOf('STRING:') + 7;
                    let match = null;
                    while (null != (match = regexp['pathInString'].exec(paths[indexFirstLevel]))) {
                        if (0 < compiledString.length) {
                            compiledString += '+';
                        }
                        if (0 < (match.index - index)) {
                            compiledString += JSON.stringify(String(paths[indexFirstLevel].substr(index, match.index - index))) + '+';
                        }
                        compiledString += '(' + ParsePath(match[1]) + ')';
                        index = match['index'] + match[0].length;
                    }
                    if (paths[indexFirstLevel].length > index) {
                        if (0 < compiledString.length) {
                            compiledString += '+';
                        }
                        compiledString += JSON.stringify(String(paths[indexFirstLevel].substr(index)));
                    }
                    returnValue += '(' + compiledString + ')';
                    break paths;
                }
                const path = paths[indexFirstLevel].trim().split('/');
                let tmpValue = (((0 < path.length) && (0 < path[0].length)) ? ('!' != path[0][0] ? path[0] : path[0].substr(1)) : null);
                if (tmpValue) {
                    switch (tmpValue) {
                        case 'FALSE': {
                            if ('!' == path[0][0]) {
                                returnValue += 'true';
                            }
                            else {
                                returnValue += 'false';
                            }
                            break paths;
                        }
                        case 'TRUE': {
                            if ('!' == path[0][0]) {
                                returnValue += 'false';
                            }
                            else {
                                returnValue += 'true';
                            }
                            break paths;
                        }
                        case 'REPEAT': {
                            if (3 == path.length) {
                                openedBracket++;
                                returnValue += "('undefined'!==typeof r['REPEAT']&&";
                                returnValue += "'undefined'!==typeof r['REPEAT']['" + path[1] + "']&&";
                                let lastPath = "r['REPEAT']['" + path[1] + "']['" + path[2] + "']";
                                returnValue += "'undefined'!==typeof " + lastPath + "?";
                                returnValue += (('!' == path[0][0]) ? ExpressionResultNot(lastPath) : lastPath) + ":";
                            }
                            break;
                        }
                        case 'GLOBAL': {
                            const countSecondLevel = path.length;
                            let lastPath = 'd';
                            openedBracket++;
                            returnValue += '(';
                            for (let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel) {
                                if (0 < indexSecondLevel) {
                                    returnValue += '&&';
                                }
                                lastPath = lastPath + "['" + path[indexSecondLevel] + "']";
                                returnValue += "'undefined'!==typeof " + lastPath;
                            }
                            returnValue += "?" + (('!' == path[0][0]) ? ExpressionResultNot(lastPath) : lastPath) + ":";
                            break;
                        }
                        default: {
                            const countSecondLevel = path.length;
                            let lastPath = 'r';
                            openedBracket++;
                            returnValue += '(';
                            for (let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel) {
                                if (0 < indexSecondLevel) {
                                    returnValue += '&&';
                                }
                                lastPath = lastPath + "['" + path[indexSecondLevel] + "']";
                                returnValue += "'undefined'!==typeof " + lastPath;
                            }
                            returnValue += "?" + (('!' == path[0][0]) ? '(' + ExpressionResultNot(lastPath) + ')' : lastPath) + ":";
                            lastPath = 'd';
                            openedBracket++;
                            returnValue += '(';
                            for (let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel) {
                                if (0 < indexSecondLevel) {
                                    returnValue += '&&';
                                }
                                lastPath = lastPath + "['" + path[indexSecondLevel] + "']";
                                returnValue += "'undefined'!==typeof " + lastPath;
                            }
                            returnValue += "?" + (('!' == path[0][0]) ? ExpressionResultNot(lastPath) : lastPath) + ":";
                        }
                    }
                }
            }
            returnValue += "false";
        }
        for (let indexFirstLevel = 0; indexFirstLevel < openedBracket; indexFirstLevel++) {
            returnValue += ')';
        }
        return returnValue;
    }
    function Parse(template) {
        let returnValue = '';
        let tmpTDALTags = null;
        while (null !== (tmpTDALTags = regexp['tagWithTDAL'].exec(template))) {
            if (0 < tmpTDALTags['index']) {
                returnValue += "+" + JSON.stringify(String(template.substr(0, tmpTDALTags['index'])));
            }
            template = template.substr(tmpTDALTags['index'] + tmpTDALTags[0].length);
            let attributes = {};
            let tmpMatch;
            while (null !== (tmpMatch = regexp['tagAttributes'].exec(tmpTDALTags[0]))) {
                attributes[tmpMatch[1]] = tmpMatch;
            }
            let selfClosed = !!tmpTDALTags[6];
            let closingPosition = [];
            if (!selfClosed) {
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
            }
            let current = ['', tmpTDALTags[0], '', '', '', '', '', ''];
            if ('undefined' !== typeof closingPosition[0]) {
                current[4] += Parse(template.substr(0, closingPosition[0]));
                current[6] += template.substr(closingPosition[0], closingPosition[1]);
            }
            tdal: {
                if (selfClosed || ('undefined' !== typeof closingPosition[0])) {
                    if ('undefined' !== typeof closingPosition[0]) {
                        template = template.substr(closingPosition[0] + closingPosition[1]);
                    }
                    if (attributes['data-tdal-condition'] && (regexp['condition'].exec(attributes['data-tdal-condition'][3]))) {
                        let tmpValue = ExpressionResultToBoolean(ParsePath(attributes['data-tdal-condition'][3]));
                        if ('false' == tmpValue) {
                            break tdal;
                        }
                        else if ('true' != tmpValue) {
                            current[0] += '+(true===' + tmpValue + '?""';
                            current[7] = ':"")' + current[7];
                        }
                    }
                    let tmpTDALrules;
                    if (attributes['data-tdal-repeat'] && (tmpTDALrules = regexp['repeat'].exec(attributes['data-tdal-repeat'][3]))) {
                        let tmpValue = ParsePath(tmpTDALrules[2]);
                        if (('false' == tmpValue) || ('""' == tmpValue) || ('true' == tmpValue)) {
                            break tdal;
                        }
                        else {
                            current[0] += '+(';
                            current[0] += 'false!==(t[i]=' + tmpValue + ')&&';
                            current[0] += '(!Array.isArray(t[i])||(t[i]=Object.assign({},t[i])))&&';
                            current[0] += '("object"===typeof t[i]&&0<Object.keys(t[i++]).length)&&(t[i++]=1)';
                            current[0] += '?';
                            current[0] += 'Object.keys(t[i-2]).reduce(function(o,e){';
                            current[0] += 'r["' + tmpTDALrules[1] + '"]=t[i-2][e];';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]={};';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["index"]=e;';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]=t[i-1]++;';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["even"]=0==(r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]%2);';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["odd"]=1==(r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"]%2);';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["first"]=1==r["REPEAT"]["' + tmpTDALrules[1] + '"]["number"];';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["length"]=Object.keys(t[i-2]);';
                            current[0] += 'r["REPEAT"]["' + tmpTDALrules[1] + '"]["last"]=r["REPEAT"]["' + tmpTDALrules[1] + '"]["length"]==r["REPEAT"]["' +
                                tmpTDALrules[1] + '"]["number"];';
                            current[0] += 'return o';
                            current[7] = ';},""):"")+((i-=2)?"":"")' + current[7];
                        }
                    }
                    if (attributes['data-tdal-content'] && (tmpTDALrules = regexp['content'].exec(attributes['data-tdal-content'][3]))) {
                        let tmpValue = ParsePath(tmpTDALrules[2]);
                        if ('false' == tmpValue) {
                            current[4] = '';
                        }
                        else if ('true' != tmpValue) {
                            let encoding = ['', ''];
                            if ('structure' != tmpTDALrules[1]) {
                                encoding[0] = '(new String(';
                                encoding[1] = ')).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                            }
                            current[3] += '+(false !== (t[i]=' + tmpValue + ')&&("string"===typeof t[i]||("number"===typeof t[i]&&!isNaN(t[i])))?' + encoding[0] +
                                't[i]' + encoding[1] + ':(true!==t[i]?"":""';
                            current[5] += '))';
                        }
                    }
                    else if (attributes['data-tdal-replace'] && (tmpTDALrules = regexp['content'].exec(attributes['data-tdal-replace'][3]))) {
                        let tmpValue = ParsePath(tmpTDALrules[2]);
                        if ('false' == tmpValue) {
                            current[1] = '';
                            current[4] = '';
                            current[6] = '';
                        }
                        else if ('true' != tmpValue) {
                            let encoding = ['', ''];
                            if ('structure' != tmpTDALrules[1]) {
                                encoding[0] = '(new String(';
                                encoding[1] = ')).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
                            }
                            current[0] += '+(false!==(t[i]=' + tmpValue + ')&&("string"===typeof t[i]||("number"===typeof t[i]&&!isNaN(t[i])))?' + encoding[0] +
                                't[i]' + encoding[1] + ':(true!==t[i]?"":""';
                            current[7] = '))' + current[7];
                        }
                    }
                    if (attributes['data-tdal-attributes'] && (tmpTDALrules = regexp['attributes'].exec(attributes['data-tdal-attributes'][3]))) {
                        while (null !== tmpTDALrules) {
                            let tmpValue = ParsePath(tmpTDALrules[2]);
                            if ("false" === tmpValue) {
                                if ('undefined' !== (typeof attributes[tmpTDALrules[1]])) {
                                    current[1] = current[1].replace(new RegExp('\\s*' + tmpTDALrules[1] + '(?:=([\'"]).*?\\1)?'), '');
                                }
                            }
                            else if ("true" !== tmpValue) {
                                current[2] += '+(false!==(t[i]=' + tmpValue + ')&&("string"===typeof t[i]||("number"===typeof t[i]&&!isNaN(t[i])))?" ' + tmpTDALrules[1] +
                                    '=\\""+t[i]+"\\"":(true!==t[i]?"":"';
                                if ('undefined' !== (typeof attributes[tmpTDALrules[1]])) {
                                    current[1] = current[1].replace(new RegExp('\\s*' + tmpTDALrules[1] + '(?:=([\'"]).*?\\1)?'), '');
                                    current[2] += tmpTDALrules[1] + '"' +
                                        ((('undefined' !== (typeof attributes[tmpTDALrules[1]][3])) && ('' != attributes[tmpTDALrules[1]][3])) ? '+"="+' +
                                            JSON.stringify(String(attributes[tmpTDALrules[1]][2] + attributes[tmpTDALrules[1]][3] +
                                                attributes[tmpTDALrules[1]][2])) : "");
                                }
                                else {
                                    current[2] += '"';
                                }
                                current[2] += '))';
                            }
                            tmpTDALrules = regexp['attributes'].exec(attributes['data-tdal-attributes'][3]);
                        }
                    }
                    if (attributes['data-tdal-omittag'] && (regexp['condition'].exec(attributes['data-tdal-omittag'][3]))) {
                        let tmpValue = ExpressionResultToBoolean(ParsePath(attributes['data-tdal-omittag'][3]));
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
                while (null !== (tmpMatch = regexp['attributesTDAL'].exec(current[1]))) {
                    current[1] = current[1].replace(regexp['attributesTDAL'], '');
                }
            }
            current[1] = current[1].replace(/\s*\/?>$/, '');
            if (selfClosed && !('undefined' !== typeof closingPosition[0]) && (('' != current[4]) || ('' != current[3]) || ('' != current[5]))) {
                current[6] = '</' + tmpTDALTags[1] + '>';
                selfClosed = false;
            }
            returnValue += current[0] + '+' + JSON.stringify(String(current[1])) + current[2] +
                (('' != current[1]) ? '+"' + (selfClosed ? '/' : '') + '>"' : '') + current[3] + current[4] + current[5] + '+' +
                JSON.stringify(String(current[6])) + current[7];
        }
        returnValue += '+' + JSON.stringify(String(template));
        return (returnValue);
    }
    function Compile(template) {
        let returnValue = ('let r={"REPEAT":{}},i=0,t=[]; return ""' +
            Parse(template)).replace(/(?<!\\)""\+/, '').replace(/(?<!\\)"\+"/g, '').replace(/\+""$/, '') + ';';
        return new Function('d', returnValue);
    }
    jTDAL.Compile = Compile;
})(jTDAL || (jTDAL = {}));
if ('undefined' !== typeof exports) {
    exports.Compile = jTDAL.Compile;
}
