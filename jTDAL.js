"use strict";
class jTDAL {
    constructor(document) {
        this.selector = '';
        this.document = $(document).clone().wrapAll('<tdal></tdal>').parent();
        for (let indexFirstLevel = 0, countFirstLevel = jTDAL.keywords.length; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
            this.selector += (('' === this.selector) ? '' : ',') + '[data-tdal-' + jTDAL.keywords[indexFirstLevel] + ']';
        }
    }
    static GetNearestChilds(item, selector) {
        let returnValue = $();
        item.children().each(function () {
            let tmpValue = $(this).filter(selector);
            if (0 < tmpValue.length) {
                returnValue = returnValue.add($(this).filter(selector));
            }
            tmpValue = $(this).not(selector);
            if (0 < tmpValue.length) {
                returnValue = returnValue.add(jTDAL.GetNearestChilds(tmpValue, selector));
            }
        });
        return (returnValue);
    }
    static IsArray(item) {
        return (Array.isArray(item) || (item === Object(item) && typeof item !== 'function'));
    }
    static ExpressionResultToBoolean(result) {
        let returnValue = true;
        if (('undefined' === (typeof result))
            ||
                (null === result)
            ||
                (false === result)
            ||
                (0 === result)
            ||
                ('' === result)
            ||
                (Array.isArray(result) && (0 === result.length))) {
            returnValue = false;
        }
        return (returnValue);
    }
    static ParsePath(pathExpression, globals, repeat) {
        let returnValue = undefined;
        const paths = pathExpression.split('|');
        const countFirstLevel = paths.length;
        for (let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
            const path = paths[indexFirstLevel].trim().split('/');
            switch (path[0]) {
                case 'REPEAT':
                    {
                        if ((3 == path.length)) {
                            if (('undefined' !== (typeof repeat['REPEAT']))) {
                                if (('undefined' !== (typeof repeat['REPEAT'][path[1]]))) {
                                    if (('undefined' !== (typeof repeat['REPEAT'][path[1]][path[2]]))) {
                                        returnValue = repeat['REPEAT'][path[1]][path[2]];
                                    }
                                }
                            }
                        }
                        break;
                    }
                case 'NULL':
                case 'FALSE':
                    {
                        returnValue = false;
                        break;
                    }
                case 'DEFAULT':
                case 'TRUE':
                    {
                        returnValue = true;
                        break;
                    }
                default:
                    {
                        if (0 < path.length) {
                            const countSecondLevel = path.length;
                            returnValue = repeat;
                            for (let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel) {
                                if ('undefined' !== (typeof returnValue[path[indexSecondLevel]])) {
                                    returnValue = returnValue[path[indexSecondLevel]];
                                }
                                else {
                                    returnValue = undefined;
                                    break;
                                }
                            }
                            if ('undefined' === typeof (returnValue)) {
                                returnValue = globals;
                                for (let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel) {
                                    if ('undefined' !== (typeof returnValue[path[indexSecondLevel]])) {
                                        returnValue = returnValue[path[indexSecondLevel]];
                                    }
                                    else {
                                        returnValue = undefined;
                                        break;
                                    }
                                }
                            }
                        }
                    }
            }
            if ('undefined' !== (typeof returnValue)) {
                break;
            }
        }
        return (returnValue);
    }
    static ParseExpression(expression, globals, repeat) {
        let returnValue = undefined;
        const tmpArray = expression.match(/^[\s]*(STRING:)?(.*)$/);
        if (tmpArray && tmpArray[1] && 'STRING:' == tmpArray[1]) {
            let tmpValue = tmpArray[2];
            let tmpMatch = null;
            while (tmpMatch = jTDAL.regexp['pathInString'].exec(tmpValue)) {
                let tmpResult = this.ParsePath(tmpMatch[1], globals, repeat);
                if (!tmpResult || (true == tmpResult)) {
                    tmpResult = '';
                }
                while (-1 !== tmpValue.search(tmpMatch[0])) {
                    tmpValue = tmpValue.replace(tmpMatch[0], tmpResult);
                }
            }
            returnValue = tmpValue;
        }
        else {
            returnValue = jTDAL.ParsePath(expression, globals, repeat);
        }
        return (returnValue);
    }
    Parse(element, globals, repeat = {}) {
        let removed = false;
        let tmpTDALAttribute = element.data('tdal-ignore');
        let tmpBoolean = true;
        if ('undefined' !== typeof tmpTDALAttribute) {
            element.removeData('tdal-ignore');
            element.removeAttr('data-tdal-ignore');
            const tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['condition']);
            if (tmpMatches) {
                removed = jTDAL.ExpressionResultToBoolean(jTDAL.ParseExpression(tmpMatches[2], globals, repeat));
                if ('!' == tmpMatches[1]) {
                    removed = !tmpBoolean;
                }
            }
        }
        if (!removed) {
            tmpTDALAttribute = element.data('tdal-condition');
            if ('undefined' !== typeof tmpTDALAttribute) {
                element.removeData('tdal-condition');
                element.removeAttr('data-tdal-condition');
                tmpBoolean = true;
                const tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['condition']);
                if (tmpMatches) {
                    tmpBoolean = jTDAL.ExpressionResultToBoolean(jTDAL.ParseExpression(tmpMatches[2], globals, repeat));
                    if ('!' == tmpMatches[1]) {
                        tmpBoolean = !tmpBoolean;
                    }
                    if (false === tmpBoolean) {
                        element.remove();
                        removed = true;
                    }
                }
            }
            if (!removed) {
                tmpTDALAttribute = element.data('tdal-repeat');
                if ('undefined' !== typeof tmpTDALAttribute) {
                    element.removeData('tdal-repeat');
                    element.removeAttr('data-tdal-repeat');
                    const tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['repeat']);
                    if (tmpMatches) {
                        const tmpValue = jTDAL.ParseExpression(tmpMatches[2], globals, repeat);
                        if (Array.isArray(tmpValue)) {
                            let currentRepeat = Object.assign({}, repeat);
                            for (let indexFirstLevel = 0, countFirstLevel = tmpValue.length; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
                                let tmpNode = element.clone();
                                currentRepeat[tmpMatches[1]] = tmpValue[indexFirstLevel];
                                currentRepeat['REPEAT'][tmpMatches[1]] =
                                    {
                                        'index': indexFirstLevel,
                                        'number': (indexFirstLevel + 1),
                                        'even': (0 == ((indexFirstLevel + 1) % 2)),
                                        'odd': (1 == ((indexFirstLevel + 1) % 2)),
                                        'start': (0 == indexFirstLevel),
                                        'end': ((countFirstLevel - 1) == indexFirstLevel),
                                        'length': countFirstLevel
                                    };
                                this.Parse(tmpNode, globals, currentRepeat);
                                element.before(tmpNode);
                            }
                        }
                        element.remove();
                        removed = true;
                    }
                }
                if (!removed) {
                    tmpTDALAttribute = element.data('tdal-content');
                    if ('undefined' !== typeof tmpTDALAttribute) {
                        element.removeData('tdal-content');
                        element.removeAttr('data-tdal-content');
                        let tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['content']);
                        if (tmpMatches) {
                            let tmpValue = jTDAL.ParseExpression(tmpMatches[2], globals, repeat);
                            switch (tmpMatches[1]) {
                                case 'structure':
                                    {
                                        if (('undefined' === typeof (tmpValue)) || (false === tmpValue) || (null == tmpValue)) {
                                            tmpValue = '';
                                        }
                                        if (true !== tmpValue) {
                                            element.html(tmpValue);
                                        }
                                        break;
                                    }
                                case 'text':
                                    {
                                        if (('undefined' === typeof (tmpValue)) || (false === tmpValue) || (null == tmpValue)) {
                                            tmpValue = '';
                                        }
                                        if (true !== tmpValue) {
                                            element.text(tmpValue);
                                        }
                                        break;
                                    }
                            }
                        }
                    }
                    tmpTDALAttribute = element.data('tdal-replace');
                    if ('undefined' !== typeof tmpTDALAttribute) {
                        element.removeData('tdal-content');
                        element.removeAttr('data-tdal-content');
                        let tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['content']);
                        if (tmpMatches) {
                            let tmpValue = jTDAL.ParseExpression(tmpMatches[2], globals, repeat);
                            switch (tmpMatches[1]) {
                                case 'structure':
                                    {
                                        if (('undefined' === typeof (tmpValue)) || (false === tmpValue) || (null == tmpValue)) {
                                            tmpValue = '';
                                        }
                                        if (true !== tmpValue) {
                                            element.prop('outerHTML', tmpValue);
                                        }
                                        break;
                                    }
                                case 'text':
                                    {
                                        if (('undefined' === typeof (tmpValue)) || (false === tmpValue) || (null == tmpValue)) {
                                            tmpValue = '';
                                        }
                                        if (true !== tmpValue) {
                                            element.prop('outerText', tmpValue);
                                        }
                                        break;
                                    }
                            }
                        }
                    }
                    tmpTDALAttribute = element.data('tdal-attributes');
                    if ('undefined' !== typeof tmpTDALAttribute) {
                        element.removeData('tdal-attributes');
                        element.removeAttr('data-tdal-attributes');
                        let tmpMatch = null;
                        while (tmpMatch = jTDAL.regexp['attributes'].exec(tmpTDALAttribute)) {
                            let tmpValue = jTDAL.ParseExpression(tmpMatch[2], globals, repeat);
                            if (('undefined' === typeof (tmpValue)) || (false === tmpValue) || (null == tmpValue)) {
                                element.removeAttr(tmpMatch[1]);
                            }
                            else {
                                if (true !== tmpValue) {
                                    element.attr(tmpMatch[1], tmpValue);
                                }
                            }
                        }
                    }
                    if (0 < element.children().length) {
                        let tmpValue = jTDAL.GetNearestChilds(element, this.selector);
                        let countFirstLevel = tmpValue.length;
                        for (let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
                            this.Parse($(tmpValue[indexFirstLevel]), globals, repeat);
                        }
                    }
                    tmpTDALAttribute = element.data('tdal-omittag');
                    if ('undefined' !== typeof tmpTDALAttribute) {
                        element.removeData('tdal-omittag');
                        element.removeAttr('data-tdal-omittag');
                        tmpBoolean = true;
                        const tmpMatches = tmpTDALAttribute.match(jTDAL.regexp['condition']);
                        if (tmpMatches) {
                            tmpBoolean = jTDAL.ExpressionResultToBoolean(jTDAL.ParseExpression(tmpMatches[2], globals, repeat));
                            if ('!' == tmpMatches[1]) {
                                tmpBoolean = !tmpBoolean;
                            }
                            if (tmpBoolean) {
                                element.contents().unwrap();
                            }
                        }
                    }
                }
            }
        }
    }
    Render(globals = {}) {
        let tmpValue = jTDAL.GetNearestChilds(this.document, this.selector);
        let countFirstLevel = tmpValue.length;
        for (let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel) {
            this.Parse($(tmpValue[indexFirstLevel]), globals, { 'REPEAT': {} });
        }
        return (this.document.children());
    }
}
jTDAL.regexpPatternPath = '(?:[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
jTDAL.regexpPatternExpression = '(' + jTDAL.regexpPatternPath + '|STRING:[^;]+)';
jTDAL.regexp = {
    'condition': new RegExp('^[\\s]*(\\!?)[\\s]*(' + jTDAL.regexpPatternPath + ')[\\s]*$'),
    'pathInString': new RegExp('{(' + jTDAL.regexpPatternPath + ')}'),
    'repeat': new RegExp('^[\\s]*([\\w-]+?)[\\s]+' + jTDAL.regexpPatternExpression + '[\\s]*$'),
    'content': new RegExp('^[\\s]*(?:(text|structure)[\\s]+)' + jTDAL.regexpPatternExpression + '[\\s]*$'),
    'attributes': new RegExp('[\\s]*(?:(?:([\\w-]+?)[\\s]+' + jTDAL.regexpPatternExpression + '[\\s]*)(?:;[\s]*|$))', 'gy')
};
jTDAL.keywords = ['ignore', 'condition', 'repeat', 'content', 'replace', 'attributes', 'omittag'];
(function ($) {
    $.fn.extend({ jTDAL: function () { return (new jTDAL(this)); } });
})(jQuery);
