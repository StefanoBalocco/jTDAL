import test from 'ava';
import jTDAL from './jTDAL.js';

let templateEngine: jTDAL;
let prefix: string;

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

	arrayStrings: [ 'A', 'B', 'C' ],
	arrayNumbers: [ 1, 2, 3 ],
	arrayEmpty: [],

	object: { a: 'Apple', b: 'Banana' },
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

	functionReturn: function() { return 'Function result'; },

	valueNull: null,
	valueUndefined: undefined
};

test.before( () => {
	templateEngine = new jTDAL();
} );

{
	prefix = 'data-tdal-condition';
	test( prefix + ': should show element when condition is true', ( t ) => {
		const expected: string = '<div>Content</div>';
		;
		const template: string = '<div data-tdal-condition="booleanTrue">Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should hide element when condition is false', ( t ) => {
		const expected: string = '';
		const template: string = '<div data-tdal-condition="booleanFalse">Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle negation with !', ( t ) => {
		const expected: string = '';
		const template: string = '<div data-tdal-condition="!booleanTrue">Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle nested paths', ( t ) => {
		const expected: string = '<div>Active user</div>';
		const template: string = '<div data-tdal-condition="objectUser/active">Active user</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle fallback paths with |', ( t ) => {
		const expected: string = '<div>Content</div>';
		const template: string = '<div data-tdal-condition="missing | booleanTrue">Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle TRUE keyword', ( t ) => {
		const expected: string = '<div>Always shown</div>';
		const template: string = '<div data-tdal-condition="TRUE">Always shown</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle FALSE keyword', ( t ) => {
		const expected: string = '';
		const template: string = '<div data-tdal-condition="FALSE">Never shown</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'data-tdal-repeat';
	test( prefix + ': should repeat element for array items', ( t ) => {
		const expected: string = '<li>A</li><li>B</li><li>C</li>';
		const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should repeat element for object properties', ( t ) => {
		templateEngine = new jTDAL( true, true, false );
		const expected: string = '<div>Apple</div><div>Banana</div>';
		const template: string = '<div data-tdal-repeat="item object" data-tdal-content="item">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should provide REPEAT variable with metadata (number)', ( t ) => {
		const expected: string = '<li>1</li><li>2</li><li>3</li>';
		const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/number">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should provide REPEAT variable with metadata (index)', ( t ) => {
		const expected: string = '<li>0</li><li>1</li><li>2</li>';
		const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/index">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should provide REPEAT variable with metadata (index, on object)', ( t ) => {
		templateEngine = new jTDAL( true, true, false );
		const expected: string = '<div>a</div><div>b</div>';
		const template: string = '<div data-tdal-repeat="item object" data-tdal-content="REPEAT/item/index">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle empty arrays', ( t ) => {
		const expected: string = '';
		const template: string = '<li data-tdal-repeat="item arrayEmpty" data-tdal-content="item">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle missing repeat variable', ( t ) => {
		const expected: string = '';
		const template: string = '<li data-tdal-repeat="item missingArray" data-tdal-content="item">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'data-tdal-content';
	test( prefix + ': should replace content with text', ( t ) => {
		const expected: string = '<span>Hello World</span>';
		const template: string = '<span data-tdal-content="string">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should escape HTML by default', ( t ) => {
		const expected: string = '<span>&lt;b&gt;Bold&lt;/b&gt;</span>';
		const template: string = '<span data-tdal-content="stringHtml">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should render HTML with structure prefix', ( t ) => {
		const expected: string = '<span><b>Bold</b></span>';
		const template: string = '<span data-tdal-content="structure stringHtml">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle numbers', ( t ) => {
		const expected: string = '<span>42</span>';
		const template: string = '<span data-tdal-content="number">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should remove content when value is false', ( t ) => {
		const expected: string = '<span></span>';
		const template: string = '<span data-tdal-content="missing">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle STRING: prefix', ( t ) => {
		const expected: string = '<span>Static text</span>';
		const template: string = '<span data-tdal-content="STRING:Static text">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle STRING: with placeholders', ( t ) => {
		const expected: string = '<span>Hello World!</span>';
		const template: string = '<span data-tdal-content="STRING:Hello {stringName}!">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	{
		prefix = 'data-tdal-content: should handle conditional strings';

		test( prefix + ' when condition is true', ( t ) => {
			const expected: string = '<span>Welcome!</span>';
			const template: string = '<span data-tdal-content="STRING:{?variableFlag}Welcome!{/variableFlag}{?!variableFlag}Please login{/!variableFlag}">Default</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableFlag: true } );
			t.is( result, expected );
		} );

		test( prefix + ' when condition is false', ( t ) => {
			const expected: string = '<span>Please login</span>';
			const template: string = '<span data-tdal-content="STRING:{?variableFlag}Welcome!{/variableFlag}{?!variableFlag}Please login{/!variableFlag}">Default</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableFlag: false } );
			t.is( result, expected );
		} );
	}
}

{
	prefix = 'data-tdal-replace';
	test( prefix + ': should replace entire element with text', ( t ) => {
		const expected: string = 'Hello World';
		const template: string = '<span data-tdal-replace="string">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should escape HTML by default', ( t ) => {
		const expected: string = '&lt;b&gt;Bold&lt;/b&gt;';
		const template: string = '<span data-tdal-replace="stringHtml">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should render HTML with structure prefix', ( t ) => {
		const expected: string = '<b>Bold</b>';
		const template: string = '<span data-tdal-replace="structure stringHtml">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should remove element when value is false', ( t ) => {
		const expected: string = '';
		const template: string = '<span data-tdal-replace="missing">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'data-tdal-attributes';
	test( prefix + ': should set single attribute', ( t ) => {
		const expected: string = '<a href="https://www.example.org">Link</a>';
		const template: string = '<a data-tdal-attributes="href stringUrl">Link</a>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should set multiple attributes', ( t ) => {
		const expected: string = '<a href="https://www.example.org" class="button">Link</a>';
		const template: string = '<a data-tdal-attributes="href stringUrl;;class stringClass">Link</a>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should preserve existing attribute with TRUE', ( t ) => {
		const expected: string = '<img src="/default.jpg"/>';
		const template: string = '<img src="/default.jpg" data-tdal-attributes="src TRUE" />';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should replace existing attribute', ( t ) => {
		const expected: string = '<img src="/test.jpg"/>';
		const template: string = '<img src="/default.jpg" data-tdal-attributes="src stringPath" />';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should remove attribute with FALSE', ( t ) => {
		const expected: string = '<img alt="Image"/>';
		const template: string = '<img src="/default.jpg" alt="Image" data-tdal-attributes="src FALSE" />';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle STRING: in attributes', ( t ) => {
		const expected: string = '<a href="https://www.example.org/about">Link</a>';
		const template: string = '<a data-tdal-attributes="href STRING:https://www.example.org/{stringPage}">Link</a>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': if attribute value is empty, remove it', ( t ) => {
		const expected: string = '<a>Link</a>';
		const template: string = '<a data-tdal-attributes="href stringEmpty" href="http://www.example.org">Link</a>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': if attribute STRING value is empty, remove it', ( t ) => {
		const expected: string = '<a>Link</a>';
		const template: string = '<a data-tdal-attributes="href STRING:{stringEmpty}" href="http://www.example.org">Link</a>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'data-tdal-omittag';
	test( prefix + ': should keep tag when condition is false', ( t ) => {
		const expected: string = '<span>Content</span>';
		const template: string = '<span data-tdal-omittag="FALSE">Content</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should remove tag but keep content when condition is true', ( t ) => {
		const expected: string = 'Content';
		const template: string = '<span data-tdal-omittag="TRUE">Content</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	{
		prefix = 'data-tdal-omittag: should handle dynamic conditions';
		test( prefix + ': when true', ( t ) => {
			const expected: string = 'Content';
			const template: string = '<span data-tdal-omittag="variableFlag">Content</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableFlag: true } );
			t.is( result, expected );
		} );

		test( prefix + ': when false', ( t ) => {
			const expected: string = '<span>Content</span>';
			const template: string = '<span data-tdal-omittag="variableFlag">Content</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableFlag: false } );
			t.is( result, expected );
		} );
	}
}

{
	prefix = 'Macros';
	test( prefix + ': should register and use macro in content', ( t ) => {
		const expected: string = '<div>&lt;b&gt;Hello World!&lt;/b&gt;</div>';
		templateEngine.MacroAdd( 'greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>' );
		const template: string = '<div data-tdal-content="MACRO:greeting">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should use macro with structure in content', ( t ) => {
		const expected: string = '<div><b>Hello World!</b></div>';
		templateEngine.MacroAdd( 'greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>' );
		const template: string = '<div data-tdal-content="structure MACRO:greeting">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should register and use macro in replace', ( t ) => {
		const expected: string = '<b>Hello World!</b>';
		templateEngine.MacroAdd( 'greeting', '<b>Hello <span data-tdal-replace="stringName">Guest</span>!</b>' );
		const template: string = '<div data-tdal-replace="structure MACRO:greeting">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle missing macro', ( t ) => {
		const expected: string = '<div></div>';
		const template: string = '<div data-tdal-content="MACRO:nonexistent">Default</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'Combined attributes';
	test( prefix + ': should process repeat with content', ( t ) => {
		const expected: string = '<li>A</li><li>B</li><li>C</li>';
		const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should process repeat with attributes', ( t ) => {
		const expected: string = '<img src="https://www.example.org/1.jpg"/><img src="https://www.example.org/2.jpg"/><img src="https://www.example.org/3.jpg"/>';
		const template: string = '<img data-tdal-repeat="id arrayNumbers" data-tdal-attributes="src STRING:https://www.example.org/{id}.jpg" />';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should process omittag with content', ( t ) => {
		const expected: string = 'Hello World';
		const template: string = '<span data-tdal-omittag="TRUE" data-tdal-content="string">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle complex nested structure', ( t ) => {
		const expected: string = `<div>
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
		const template: string = `
<div data-tdal-condition="objectUser">
<h1 data-tdal-content="objectUser/name">Name</h1>
<ul data-tdal-condition="objectUser/posts">
<li data-tdal-repeat="post objectUser/posts" data-tdal-omittag="!post/visible">
<a data-tdal-attributes="href post/url" data-tdal-content="post/title">Post</a>
</li>
</ul>
</div>
            `;
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	{
		prefix = 'Combined attributes should process attributes in correct order - condition then content';
		test( prefix + ': when condition is true', ( t ) => {
			const expected: string = '<div>Hello World</div>';
			const template: string = '<div data-tdal-condition="variableFlag" data-tdal-content="string">Default</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: true } );
			t.is( result, expected );
		} );

		test( prefix + ': when condition is false', ( t ) => {
			const expected: string = '';
			const template: string = '<div data-tdal-condition="variableFlag" data-tdal-content="string">Default</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: false } );
			t.is( result, expected );
		} );
	}

	{
		prefix = 'Combined attributes should process condition with repeat';
		test( prefix + ': when condition is true', ( t ) => {
			const expected: string = '<ul><li>A</li><li>B</li><li>C</li></ul>';
			const template: string = '<ul data-tdal-condition="variableFlag"><li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li></ul>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: true } );
			t.is( result, expected );
		} );

		test( prefix + ': when condition is false', ( t ) => {
			const expected: string = '';
			const template: string = '<ul data-tdal-condition="variableFlag"><li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li></ul>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: false } );
			t.is( result, expected );
		} );
	}

	{
		prefix = 'Combined attributes should process attributes with condition';
		test( prefix + ': when condition is true', ( t ) => {
			const expected: string = '<a href="https://www.example.org">Click here</a>';
			const template: string = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="STRING:Click here">Link</a>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: true } );
			t.is( result, expected );
		} );

		test( prefix + ': when condition is false', ( t ) => {
			const expected: string = '';
			const template: string = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="STRING:Click here">Link</a>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { ...testData, variableFlag: false } );
			t.is( result, expected );
		} );
	}
}

{
	prefix = 'Edge cases and special scenarios';
	test( prefix + ': should handle self-closing tags', ( t ) => {
		const expected: string = '<img src="/test.jpg"/>';
		const template: string = '<img data-tdal-attributes="src stringPath" />';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle HTML5 void elements', ( t ) => {
		const expected: string = '<br/>';
		const template: string = '<br data-tdal-condition="TRUE">';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle comments removal when strip is true', ( t ) => {
		const expected: string = '<div>Content</div>';
		const template: string = '<!-- Comment --><div>Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should keep comments when strip is false', ( t ) => {
		templateEngine = new jTDAL( true, false );
		const expected: string = '<!-- Comment --><div>Content</div>';
		const template: string = '<!-- Comment --><div>Content</div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle empty template', ( t ) => {
		const expected: string = '';
		const template: string = '';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle template with no TAL attributes', ( t ) => {
		const expected: string = '<div><span>Plain HTML</span></div>';
		const template: string = '<div><span>Plain HTML</span></div>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle deeply nested paths', ( t ) => {
		const expected: string = '<span>Deep value</span>';
		const template: string = '<span data-tdal-content="nested/b/c/d/e">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle function values in data', ( t ) => {
		const expected: string = '<span>Function result</span>';
		const template: string = '<span data-tdal-content="functionReturn">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	/*
	test( prefix + ': should handle multilines?', ( t ) => {
		const expected: string = '<span>Line 1\nLine 2\t&lt;tag&gt;</span>';
		const template: string = '<span data-tdal-content="STRING:Line 1\nLine 2\t&lt;tag&gt;">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
*/
	{
		prefix = 'Edge cases and special scenarios should handle trim option';
		test( prefix + ': when trim is true', ( t ) => {
			const expected: string = '<div>Content</div>';
			const template: string = '  <div>Content</div>  ';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': when trim is false', ( t ) => {
			templateEngine = new jTDAL( false );
			const expected: string = '  <div>Content</div>  ';
			const template: string = '  <div>Content</div>  ';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = 'Edge cases and special scenarios should handle null and undefined values';
		test( prefix + ': when value is null', ( t ) => {
			const expected: string = '<span>Default</span>';
			const template: string = '<span data-tdal-content="variableValue | STRING:Default">Original</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableValue: null } );
			t.is( result, expected );
		} );

		test( prefix + ': when value is undefined', ( t ) => {
			const expected: string = '<span>Default</span>';
			const template: string = '<span data-tdal-content="variableValue | STRING:Default">Original</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { variableValue: undefined } );
			t.is( result, expected );
		} );
	}
}

{
	prefix = 'CompileToString method';
	test( prefix + ': should return function as string', ( t ) => {
		const expected: string = '<div>Hello World</div>';
		const template: string = '<div data-tdal-content="string">Default</div>';
		const functionString = templateEngine.CompileToString( template );
		t.regex( functionString, /^function\(d\){.*}$/ );

		// Test if the string can be evaluated to a function
		const compiledFunction = eval( '(' + functionString + ')' );
		const result: string = compiledFunction( testData );
		t.is( result, expected );
	} );
}

{
	prefix = 'Performance and stress tests';
	test( prefix + ': should handle large repeat loops', ( t ) => {
		const template: string = '<li data-tdal-repeat="item largeArray" data-tdal-content="item">Default</li>';
		const compiled = templateEngine.CompileToFunction( template );
		const largeArray = Array.from( { length: 1000 }, ( _: any, i: any ) => `Item ${ i }` );
		const result: string = compiled( { largeArray } );
		let expected: string = '';
		largeArray.forEach(
			( item: any ) => {
				expected += `<li>${ item }</li>`;
			}
		);
		t.is( result, expected );
	} );
	test( prefix + ': should handle deeply nested templates', ( t ) => {
		let expected: string = '<div>';
		const levels = 10;
		for( let i = 0; i < levels; i++ ) {
			expected += `<div data-value="Level ${ i }">`;
		}
		for( let i = 0; i < levels; i++ ) {
			expected += '</div>';
		}
		expected += '</div>';
		let template: string = '<div data-tdal-condition="TRUE">';
		for( let i = 0; i < levels; i++ ) {
			template += `<div data-tdal-attributes="data-value STRING:Level ${i}">`;
		}
		for( let i = 0; i < levels; i++ ) {
			template += '</div>';
		}
		template += '</div>';

		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );

	test( prefix + ': should handle GLOBAL paths', ( t ) => {
		const expected: string = '<span>World</span>';
		const template: string = '<span data-tdal-content="GLOBAL/stringName">Default</span>';
		const compiled = templateEngine.CompileToFunction( template );
		const result: string = compiled( testData );
		t.is( result, expected );
	} );
}
