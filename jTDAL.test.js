import test from 'ava';
import jTDALOriginal from './jTDAL.js';
import jTDALMinified from './jTDAL.min.js';
const targets = [
    {
        tag: '[jTDAL-original]',
        jTDAL: jTDALOriginal
    },
    {
        tag: '[jTDAL-minified]',
        jTDAL: jTDALMinified
    }
];
const testData = {
    booleanTrue: true,
    booleanFalse: false,
    string: 'Hello World',
    stringName: 'World',
    stringHtml: '<b>Bold</b>',
    stringUrl: 'https://www.example.org',
    stringPath: '/test.jpg',
    stringClass: 'button',
    stringPage: 'about',
    stringEmpty: '',
    number: 42,
    numberZero: 0,
    arrayStrings: ['A', 'B', 'C'],
    arrayNumbers: [1, 2, 3],
    arrayEmpty: [],
    object: { a: 'Apple', b: 'Banana' },
    objectEmpty: {},
    objectUser: {
        active: true,
        name: 'John Doe',
        posts: [
            { visible: true, url: '/post1', title: 'First Post' },
            { visible: false, url: '/post2', title: 'Hidden Post' },
            { visible: true, url: '/post3', title: 'Third Post' }
        ]
    },
    nested: { b: { c: { d: { e: 'Deep value' } } } },
    functionReturn: function () { return 'Function result'; },
    valueNull: null,
    valueUndefined: undefined
};
for (const target of targets) {
    const tag = target.tag;
    const jTDAL = target.jTDAL;
    let templateEngine;
    let prefix;
    test.before(() => {
        templateEngine = new jTDAL();
    });
    {
        prefix = tag + ' data-tdal-condition';
        test(prefix + ': should show element when condition is true', (t) => {
            const expected = '<div>Content</div>';
            ;
            const template = '<div data-tdal-condition="booleanTrue">Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should hide element when condition is false', (t) => {
            const expected = '';
            const template = '<div data-tdal-condition="booleanFalse">Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle negation with !', (t) => {
            const expected = '';
            const template = '<div data-tdal-condition="!booleanTrue">Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle nested paths', (t) => {
            const expected = '<div>Active user</div>';
            const template = '<div data-tdal-condition="objectUser/active">Active user</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle fallback paths with |', (t) => {
            const expected = '<div>Content</div>';
            const template = '<div data-tdal-condition="missing | booleanTrue">Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle TRUE keyword', (t) => {
            const expected = '<div>Always shown</div>';
            const template = '<div data-tdal-condition="TRUE">Always shown</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle FALSE keyword', (t) => {
            const expected = '';
            const template = '<div data-tdal-condition="FALSE">Never shown</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': static FALSE should not stop parsing following TDAL elements', (t) => {
            const expected = '<span>Hello World</span>';
            const template = '<div data-tdal-condition="FALSE">Never shown</div>' +
                '<span data-tdal-content="string">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': static FALSE should not prevent following repeat from being parsed', (t) => {
            const expected = '<li>A</li><li>B</li><li>C</li>';
            const template = '<div data-tdal-condition="FALSE">Never shown</div>' +
                '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle negation of FALSE keyword (!FALSE)', (t) => {
            const expected = '<div>Always shown</div>';
            const template = '<div data-tdal-condition="!FALSE">Always shown</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle negation of TRUE keyword (!TRUE)', (t) => {
            const expected = '';
            const template = '<div data-tdal-condition="!TRUE">Never shown</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle STRING: expression as condition', (t) => {
            const expected = '<div>Shown</div>';
            const template = '<div data-tdal-condition="STRING:foo">Shown</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled({});
            t.is(result, expected);
        });
        test(prefix + ': should apply TDAL truthiness to empty and sparse containers', (t) => {
            const template = '<span data-tdal-condition="value">Shown</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const sparseArray = new Array(3);
            t.is(compiled({ value: {} }), '');
            t.is(compiled({ value: [] }), '');
            t.is(compiled({ value: ['item'] }), '<span>Shown</span>');
            t.is(compiled({ value: sparseArray }), '<span>Shown</span>');
        });
    }
    {
        prefix = tag + ' data-tdal-repeat';
        test(prefix + ': should repeat element for array items', (t) => {
            const expected = '<li>A</li><li>B</li><li>C</li>';
            const template = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should repeat element for object properties', (t) => {
            const expected = '<div>Apple</div><div>Banana</div>';
            const template = '<div data-tdal-repeat="item object" data-tdal-content="item">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should provide REPEAT variable with metadata (number)', (t) => {
            const expected = '<li>1</li><li>2</li><li>3</li>';
            const template = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/number">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should provide REPEAT variable with metadata (index)', (t) => {
            const expected = '<li>0</li><li>1</li><li>2</li>';
            const template = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/index">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should provide REPEAT variable with metadata (index, on object)', (t) => {
            const expected = '<div>a</div><div>b</div>';
            const template = '<div data-tdal-repeat="item object" data-tdal-content="REPEAT/item/index">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle negated REPEAT variable in condition', (t) => {
            const expected = '<li>Not first</li><li>Not first</li>';
            const template = '<li data-tdal-repeat="item arrayStrings" data-tdal-omittag="REPEAT/item/first"><span data-tdal-condition="!REPEAT/item/first" data-tdal-omittag="TRUE">Not first</span></li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle empty arrays', (t) => {
            const expected = '';
            const template = '<li data-tdal-repeat="item arrayEmpty" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle missing repeat variable', (t) => {
            const expected = '';
            const template = '<li data-tdal-repeat="item missingArray" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle static TRUE value (empty output)', (t) => {
            const expected = '';
            const template = '<li data-tdal-repeat="item TRUE">Content</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle static FALSE value (empty output)', (t) => {
            const expected = '';
            const template = '<li data-tdal-repeat="item FALSE">Content</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should retry a TDAL-empty local boolean path against global data', (t) => {
            const expected = '<ul><li>Shown</li></ul>';
            const template = '<ul data-tdal-repeat="item items"><li data-tdal-condition="item/value">Shown</li></ul>';
            const data = {
                items: [{ value: {} }],
                item: { value: true }
            };
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(data);
            t.is(result, expected);
        });
        test(prefix + ': should not retry REPEAT boolean paths against global data', (t) => {
            const expected = '<ul></ul>';
            const template = '<ul data-tdal-repeat="item items"><li data-tdal-condition="REPEAT/item/missing">Shown</li></ul>';
            const data = {
                REPEAT: { item: { missing: true } },
                items: [1]
            };
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(data);
            t.is(result, expected);
        });
        test(prefix + ': should retry default raw paths only when their local result is false', (t) => {
            const falseTemplate = '<ul data-tdal-repeat="item items"><li data-tdal-content="item/value">Default</li></ul>';
            const zeroTemplate = '<ul data-tdal-repeat="item items"><li data-tdal-content="item/value">Default</li></ul>';
            const emptyStringTemplate = '<ul data-tdal-repeat="item items"><li data-tdal-content="item/value">Default</li></ul>';
            const nestedTemplate = '<ul data-tdal-repeat="item items"><li data-tdal-content="item/nested/value">Default</li></ul>';
            const falseCompiled = templateEngine.CompileToFunction(falseTemplate);
            const zeroCompiled = templateEngine.CompileToFunction(zeroTemplate);
            const emptyStringCompiled = templateEngine.CompileToFunction(emptyStringTemplate);
            const nestedCompiled = templateEngine.CompileToFunction(nestedTemplate);
            t.is(falseCompiled({ items: [{ value: false }], item: { value: 'global' } }), '<ul><li>global</li></ul>');
            t.is(zeroCompiled({ items: [{ value: 0 }], item: { value: 'global' } }), '<ul><li>0</li></ul>');
            t.is(emptyStringCompiled({ items: [{ value: '' }], item: { value: 'global' } }), '<ul><li></li></ul>');
            t.is(nestedCompiled({ items: [{ nested: {} }], item: { nested: { value: 'global' } } }), '<ul><li>global</li></ul>');
        });
    }
    {
        prefix = tag + ' data-tdal-content';
        test(prefix + ': should replace content with text', (t) => {
            const expected = '<span>Hello World</span>';
            const template = '<span data-tdal-content="string">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should escape HTML by default', (t) => {
            const expected = '<span>&lt;b&gt;Bold&lt;/b&gt;</span>';
            const template = '<span data-tdal-content="stringHtml">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should render HTML with structure prefix', (t) => {
            const expected = '<span><b>Bold</b></span>';
            const template = '<span data-tdal-content="structure stringHtml">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle numbers', (t) => {
            const expected = '<span>42</span>';
            const template = '<span data-tdal-content="number">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should remove content when value is false', (t) => {
            const expected = '<span></span>';
            const template = '<span data-tdal-content="missing">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle STRING: prefix', (t) => {
            const expected = '<span>Static text</span>';
            const template = '<span data-tdal-content="STRING:Static text">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle STRING: with placeholders', (t) => {
            const expected = '<span>Hello World!</span>';
            const template = '<span data-tdal-content="STRING:Hello {stringName}!">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        {
            prefix = tag + ' data-tdal-content: should handle conditional strings';
            test(prefix + ' when condition is true', (t) => {
                const expected = '<span>Welcome!</span>';
                const template = '<span data-tdal-content="STRING:{?variableFlag}Welcome!{/variableFlag}{?!variableFlag}Please login{/!variableFlag}">Default</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableFlag: true });
                t.is(result, expected);
            });
            test(prefix + ' when condition is false', (t) => {
                const expected = '<span>Please login</span>';
                const template = '<span data-tdal-content="STRING:{?variableFlag}Welcome!{/variableFlag}{?!variableFlag}Please login{/!variableFlag}">Default</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableFlag: false });
                t.is(result, expected);
            });
            test(prefix + ' with static TRUE keyword', (t) => {
                const expected = '<span>Hello World!</span>';
                const template = '<span data-tdal-content="STRING:Hello {?TRUE}World{/TRUE}!">Default</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled(testData);
                t.is(result, expected);
            });
            test(prefix + ' with static FALSE keyword', (t) => {
                const expected = '<span>Hello !</span>';
                const template = '<span data-tdal-content="STRING:Hello {?FALSE}World{/FALSE}!">Default</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled(testData);
                t.is(result, expected);
            });
        }
    }
    {
        prefix = tag + ' data-tdal-replace';
        test(prefix + ': should replace entire element with text', (t) => {
            const expected = 'Hello World';
            const template = '<span data-tdal-replace="string">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should escape HTML by default', (t) => {
            const expected = '&lt;b&gt;Bold&lt;/b&gt;';
            const template = '<span data-tdal-replace="stringHtml">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should render HTML with structure prefix', (t) => {
            const expected = '<b>Bold</b>';
            const template = '<span data-tdal-replace="structure stringHtml">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should remove element when value is false', (t) => {
            const expected = '';
            const template = '<span data-tdal-replace="missing">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should remove element with static FALSE', (t) => {
            const expected = '';
            const template = '<span data-tdal-replace="FALSE">Default content</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
    }
    {
        prefix = tag + ' data-tdal-attributes';
        test(prefix + ': should set single attribute', (t) => {
            const expected = '<a href="https://www.example.org">Link</a>';
            const template = '<a data-tdal-attributes="href stringUrl">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should set multiple attributes', (t) => {
            const expected = '<a href="https://www.example.org" class="button">Link</a>';
            const template = '<a data-tdal-attributes="href stringUrl;;class stringClass">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should preserve existing attribute with TRUE', (t) => {
            const expected = '<img src="/default.jpg"/>';
            const template = '<img src="/default.jpg" data-tdal-attributes="src TRUE" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should replace existing attribute', (t) => {
            const expected = '<img src="/test.jpg"/>';
            const template = '<img src="/default.jpg" data-tdal-attributes="src stringPath" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should remove attribute with FALSE', (t) => {
            const expected = '<img alt="Image"/>';
            const template = '<img src="/default.jpg" alt="Image" data-tdal-attributes="src FALSE" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle STRING: in attributes', (t) => {
            const expected = '<a href="https://www.example.org/about">Link</a>';
            const template = '<a data-tdal-attributes="href STRING:https://www.example.org/{stringPage}">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': if attribute value is empty, remove it', (t) => {
            const expected = '<a>Link</a>';
            const template = '<a data-tdal-attributes="href stringEmpty" href="http://www.example.org">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': if attribute STRING value is empty, remove it', (t) => {
            const expected = '<a>Link</a>';
            const template = '<a data-tdal-attributes="href STRING:{stringEmpty}" href="http://www.example.org">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle flag attribute with dynamic true condition', (t) => {
            const expected = '<input disabled/>';
            const template = '<input data-tdal-attributes="disabled? booleanTrue" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle flag attribute with dynamic false condition', (t) => {
            const expected = '<input/>';
            const template = '<input data-tdal-attributes="disabled? booleanFalse" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle existing attribute without value', (t) => {
            const expected = '<input disabled/>';
            const template = '<input disabled data-tdal-attributes="disabled booleanTrue" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': attribute values are not HTML-escaped', (t) => {
            const template = '<a data-tdal-attributes="href url">Link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled({ url: 'javascript:alert(1)" onclick="alert(2)' });
            t.is(result, '<a href="javascript:alert(1)" onclick="alert(2)">Link</a>');
        });
        test(prefix + ': should handle namespaced attributes like xlink:href', (t) => {
            const expected = '<use xlink:href="#b"/>';
            const template = '<use xlink:href="#a" data-tdal-attributes="xlink:href STRING:#b" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
    }
    {
        prefix = tag + ' data-tdal-omittag';
        test(prefix + ': should keep tag when condition is false', (t) => {
            const expected = '<span>Content</span>';
            const template = '<span data-tdal-omittag="FALSE">Content</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should remove tag but keep content when condition is true', (t) => {
            const expected = 'Content';
            const template = '<span data-tdal-omittag="TRUE">Content</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        {
            prefix = tag + ' data-tdal-omittag: should handle dynamic conditions';
            test(prefix + ': when true', (t) => {
                const expected = 'Content';
                const template = '<span data-tdal-omittag="variableFlag">Content</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableFlag: true });
                t.is(result, expected);
            });
            test(prefix + ': when false', (t) => {
                const expected = '<span>Content</span>';
                const template = '<span data-tdal-omittag="variableFlag">Content</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableFlag: false });
                t.is(result, expected);
            });
        }
    }
    {
        prefix = tag + ' Macros';
        test(prefix + ': should register and use macro in content', (t) => {
            const expected = '<div>&lt;b&gt;Hello World!&lt;/b&gt;</div>';
            templateEngine.MacroAdd('greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>');
            const template = '<div data-tdal-content="MACRO:greeting">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should use macro with structure in content', (t) => {
            const expected = '<div><b>Hello World!</b></div>';
            templateEngine.MacroAdd('greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>');
            const template = '<div data-tdal-content="structure MACRO:greeting">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should register and use macro in replace', (t) => {
            const expected = '<b>Hello World!</b>';
            templateEngine.MacroAdd('greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>');
            const template = '<div data-tdal-replace="structure MACRO:greeting">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle missing macro', (t) => {
            const expected = '<div></div>';
            const template = '<div data-tdal-content="MACRO:nonexistent">Default</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should preserve comments in macro when strip is false', (t) => {
            const noStripEngine = new jTDAL(true, false);
            const expected = '<div><!-- comment --><b>Hello</b></div>';
            noStripEngine.MacroAdd('withcomment', '<!-- comment --><b>Hello</b>');
            const template = '<div data-tdal-content="structure MACRO:withcomment">Default</div>';
            const compiled = noStripEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
    }
    {
        prefix = tag + ' Combined attributes';
        test(prefix + ': should process repeat with content', (t) => {
            const expected = '<li>A</li><li>B</li><li>C</li>';
            const template = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should process repeat with attributes', (t) => {
            const expected = '<img src="https://www.example.org/1.jpg"/><img src="https://www.example.org/2.jpg"/><img src="https://www.example.org/3.jpg"/>';
            const template = '<img data-tdal-repeat="id arrayNumbers" data-tdal-attributes="src STRING:https://www.example.org/{id}.jpg" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should process omittag with content', (t) => {
            const expected = 'Hello World';
            const template = '<span data-tdal-omittag="TRUE" data-tdal-content="string">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle complex nested structure', (t) => {
            const expected = `<div>
	<h1>John Doe</h1>
	<ul>
	<li>
	<a href="/post1">First Post</a>
	</li>
	<a href="/post2">Hidden Post</a>
	<li>
	<a href="/post3">Third Post</a>
	</li>
	</ul>
	</div>`;
            const template = `
	<div data-tdal-condition="objectUser">
	<h1 data-tdal-content="objectUser/name">Name</h1>
	<ul data-tdal-condition="objectUser/posts">
	<li data-tdal-repeat="post objectUser/posts" data-tdal-omittag="!post/visible">
	<a data-tdal-attributes="href post/url" data-tdal-content="post/title">Post</a>
	</li>
	</ul>
	</div>
	`;
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        {
            prefix = tag + ' Combined attributes should process attributes in correct order - condition then content';
            test(prefix + ': when condition is true', (t) => {
                const expected = '<div>Hello World</div>';
                const template = '<div data-tdal-condition="variableFlag" data-tdal-content="string">Default</div>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: true });
                t.is(result, expected);
            });
            test(prefix + ': when condition is false', (t) => {
                const expected = '';
                const template = '<div data-tdal-condition="variableFlag" data-tdal-content="string">Default</div>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: false });
                t.is(result, expected);
            });
        }
        {
            prefix = tag + ' Combined attributes should process condition with repeat';
            test(prefix + ': when condition is true', (t) => {
                const expected = '<ul><li>A</li><li>B</li><li>C</li></ul>';
                const template = '<ul data-tdal-condition="variableFlag"><li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li></ul>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: true });
                t.is(result, expected);
            });
            test(prefix + ': when condition is false', (t) => {
                const expected = '';
                const template = '<ul data-tdal-condition="variableFlag"><li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li></ul>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: false });
                t.is(result, expected);
            });
        }
        {
            prefix = tag + ' Combined attributes should process attributes with condition';
            test(prefix + ': when condition is true', (t) => {
                const expected = '<a href="https://www.example.org">Click here</a>';
                const template = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="STRING:Click here">Link</a>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: true });
                t.is(result, expected);
            });
            test(prefix + ': when condition is false', (t) => {
                const expected = '';
                const template = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="STRING:Click here">Link</a>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ ...testData, variableFlag: false });
                t.is(result, expected);
            });
        }
    }
    {
        prefix = tag + ' Edge cases and special scenarios';
        test(prefix + ': should handle self-closing tags', (t) => {
            const expected = '<img src="/test.jpg"/>';
            const template = '<img data-tdal-attributes="src stringPath" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle HTML5 void elements', (t) => {
            const expected = '<br/>';
            const template = '<br data-tdal-condition="TRUE">';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle unclosed tags gracefully', (t) => {
            const expected = '<div/>Content';
            const template = '<div data-tdal-condition="TRUE">Content';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should convert void element to non-void when content is added', (t) => {
            const expected = '<input>Hello World</input>';
            const template = '<input data-tdal-content="string" />';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle > inside quoted attribute values', (t) => {
            const expected = '<a title="1>2">link</a>';
            const template = '<a title="1>2" data-tdal-condition="TRUE">link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle > inside single-quoted attribute values', (t) => {
            const expected = '<a title=\'1>2\'>link</a>';
            const template = '<a title=\'1>2\' data-tdal-condition="TRUE">link</a>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle < inside quoted attribute values of nested tags', (t) => {
            const expected = '<div><div title="a<b">x</div></div>';
            const template = '<div data-tdal-condition="TRUE"><div title="a<b">x</div></div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle comments removal when strip is true', (t) => {
            const expected = '<div>Content</div>';
            const template = '<!-- Comment --><div>Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should keep comments when strip is false', (t) => {
            templateEngine = new jTDAL(true, false);
            const expected = '<!-- Comment --><div>Content</div>';
            const template = '<!-- Comment --><div>Content</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle empty template', (t) => {
            const expected = '';
            const template = '';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle template with no TAL attributes', (t) => {
            const expected = '<div><span>Plain HTML</span></div>';
            const template = '<div><span>Plain HTML</span></div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle deeply nested paths', (t) => {
            const expected = '<span>Deep value</span>';
            const template = '<span data-tdal-content="nested/b/c/d/e">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle function values in data', (t) => {
            const expected = '<span>Function result</span>';
            const template = '<span data-tdal-content="functionReturn">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        {
            prefix = tag + ' Edge cases and special scenarios: should handle trim option';
            test(prefix + ': when trim is true', (t) => {
                const expected = '<div>Content</div>';
                const template = '  <div>Content</div>  ';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled(testData);
                t.is(result, expected);
            });
            test(prefix + ': when trim is false', (t) => {
                templateEngine = new jTDAL(false);
                const expected = '  <div>Content</div>  ';
                const template = '  <div>Content</div>  ';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled(testData);
                t.is(result, expected);
            });
        }
        {
            prefix = tag + ' Edge cases and special scenarios: should handle falsy values';
            test(prefix + ': when value is null', (t) => {
                const expected = '<span>Default</span>';
                const template = '<span data-tdal-content="variableValue | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableValue: null });
                t.is(result, expected);
            });
            test(prefix + ': when value is undefined', (t) => {
                const expected = '<span>Default</span>';
                const template = '<span data-tdal-content="variableValue | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ variableValue: undefined });
                t.is(result, expected);
            });
            test(prefix + ': when value is 0', (t) => {
                const expected = '<span>Default</span>';
                const template = '<span data-tdal-content="numberZero | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ numberZero: 0 });
                t.is(result, expected);
            });
            test(prefix + ': when value is an empty string', (t) => {
                const expected = '<span>Default</span>';
                const template = '<span data-tdal-content="stringEmpty | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ stringEmpty: '' });
                t.is(result, expected);
            });
            test(prefix + ': when value is an empty array', (t) => {
                const expected = '<span></span>';
                const template = '<span data-tdal-content="arrayEmpty | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ arrayEmpty: [] });
                t.is(result, expected);
            });
            test(prefix + ': when value is an empty object', (t) => {
                const expected = '<span></span>';
                const template = '<span data-tdal-content="objectEmpty | STRING:Default">Original</span>';
                const compiled = templateEngine.CompileToFunction(template);
                const result = compiled({ objectEmpty: {} });
                t.is(result, expected);
            });
        }
    }
    {
        prefix = tag + ' CompileToString method';
        test(prefix + ': should return function as string', (t) => {
            const expected = '<div>Hello World</div>';
            const template = '<div data-tdal-content="string">Default</div>';
            const functionString = templateEngine.CompileToString(template);
            t.regex(functionString, /^function\(d\){.*}$/);
            const compiledFunction = eval('(' + functionString + ')');
            const result = compiledFunction(testData);
            t.is(result, expected);
        });
        test(prefix + ': should emit bitmask resolver flags', (t) => {
            const defaultBoolean = templateEngine.CompileToString('<span data-tdal-condition="booleanTrue">Shown</span>');
            const negatedDefaultBoolean = templateEngine.CompileToString('<span data-tdal-condition="!booleanTrue">Hidden</span>');
            const defaultRaw = templateEngine.CompileToString('<span data-tdal-content="string">Default</span>');
            const repeatBoolean = templateEngine.CompileToString('<span data-tdal-condition="REPEAT/item/first">Shown</span>');
            const globalBoolean = templateEngine.CompileToString('<span data-tdal-condition="GLOBAL/booleanTrue">Shown</span>');
            const stringBoolean = templateEngine.CompileToString('<span data-tdal-condition="STRING:Shown">Shown</span>');
            const repeatRaw = templateEngine.CompileToString('<span data-tdal-content="REPEAT/item/index">Default</span>');
            const globalRaw = templateEngine.CompileToString('<span data-tdal-content="GLOBAL/stringName">Default</span>');
            t.true(defaultBoolean.includes('c=(a,c,e)=>{let z=a,y=c.split("/"),x=0,w,l=y.length,m=2&e;for(;x<l&&1!==z;){z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;x++;if(1&e&&(false===z||x==l&&m&&!b(z))){z=d;e=0;x=0}}return m?b(z):z}'));
            t.true(defaultBoolean.includes('b=v=>!!v&&("object"!==typeof v||(Array.isArray(v)?0<v.length:0<Object.keys(v).length))'));
            t.true(defaultBoolean.includes('c(r,"booleanTrue",3)'));
            t.true(negatedDefaultBoolean.includes('!c(r,"booleanTrue",3)'));
            t.true(defaultRaw.includes('c(r,"string",1)'));
            t.false(defaultRaw.includes('.find((v)=>false!==v)'));
            t.true(repeatBoolean.includes('c(r,"REPEAT/item/first",2)'));
            t.true(globalBoolean.includes('c(d,"booleanTrue",2)'));
            t.true(stringBoolean.includes('b("Shown")'));
            t.true(repeatRaw.includes('c(r,"REPEAT/item/index")'));
            t.false(repeatRaw.includes('c(r,"REPEAT/item/index",2)'));
            t.true(globalRaw.includes('c(d,"stringName")'));
            t.false(globalRaw.includes('c(d,"stringName",2)'));
        });
    }
    {
        prefix = tag + ' Performance and stress tests';
        test(prefix + ': should handle large repeat loops', (t) => {
            const template = '<li data-tdal-repeat="item largeArray" data-tdal-content="item">Default</li>';
            const compiled = templateEngine.CompileToFunction(template);
            const largeArray = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
            const result = compiled({ largeArray });
            let expected = '';
            largeArray.forEach((item) => {
                expected += `<li>${item}</li>`;
            });
            t.is(result, expected);
        });
        test(prefix + ': should handle deeply nested templates', (t) => {
            let expected = '<div>';
            const levels = 10;
            for (let i = 0; i < levels; i++) {
                expected += `<div data-value="Level ${i}">`;
            }
            for (let i = 0; i < levels; i++) {
                expected += '</div>';
            }
            expected += '</div>';
            let template = '<div data-tdal-condition="TRUE">';
            for (let i = 0; i < levels; i++) {
                template += `<div data-tdal-attributes="data-value STRING:Level ${i}">`;
            }
            for (let i = 0; i < levels; i++) {
                template += '</div>';
            }
            template += '</div>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle GLOBAL paths', (t) => {
            const expected = '<span>World</span>';
            const template = '<span data-tdal-content="GLOBAL/stringName">Default</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle negated GLOBAL paths in condition', (t) => {
            const expected = '';
            const template = '<span data-tdal-condition="!GLOBAL/booleanTrue">Hidden</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
        test(prefix + ': should handle GLOBAL paths in condition', (t) => {
            const expected = '<span>Shown</span>';
            const template = '<span data-tdal-condition="GLOBAL/booleanTrue">Shown</span>';
            const compiled = templateEngine.CompileToFunction(template);
            const result = compiled(testData);
            t.is(result, expected);
        });
    }
    if (jTDALOriginal === jTDAL) {
        {
            prefix = tag + ' Internal methods';
            test(prefix + ': _ParsePath should return false for empty path', (t) => {
                const result = jTDAL._ParsePath('');
                t.is(result, 'false');
            });
            test(prefix + ': _ParsePath should return false for null path', (t) => {
                const result = jTDAL._ParsePath(null);
                t.is(result, 'false');
            });
        }
    }
}
