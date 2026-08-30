import test from 'ava';
import type { TemplateEngine } from '../../dist/jTDAL.js';
import jTDALOriginal from '../../dist/jTDAL.js';
// @ts-expect-error jTDAL.min.js intentionally shares the original public API.
import jTDALMinified from '../../dist/jTDAL.min.js';

const targets: readonly { tag: string; jTDAL: typeof jTDALOriginal; }[] = [
	{
		tag: 'jTDAL>original>',
		jTDAL: jTDALOriginal
	},
	{
		tag: 'jTDAL>minified>',
		jTDAL: jTDALMinified as typeof jTDALOriginal
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

	arrayStrings: [ 'A', 'B', 'C' ],
	arrayNumbers: [ 1, 2, 3 ],
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

	functionReturn: function() { return 'Function result'; },

	valueNull: null,
	valueUndefined: undefined
};

for( const target of targets ) {
	const tag: string = target.tag;
	const jTDAL: typeof jTDALOriginal = target.jTDAL;
	let templateEngine: jTDALOriginal;
	let prefix: string;

	test.before( () => {
		templateEngine = new jTDAL();
	} );

	{
		prefix = tag + ' data-tdal-condition';
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


		test( prefix + ': static FALSE should not stop parsing following TDAL elements', ( t ) => {
			const expected: string = '<span>Hello World</span>';
			const template: string =
				'<div data-tdal-condition="FALSE">Never shown</div>' +
				'<span data-tdal-content="string">Default</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': static FALSE should skip malformed later attributes', ( t ) => {
			const template: string = '<div data-tdal-condition="FALSE" data-tdal-attributes="title REPEAT/item">drop</div><span>keep</span>';
			const compiled: TemplateEngine = templateEngine.CompileToFunction( template );
			const result: string = compiled( {} );
			t.is( result, '<span>keep</span>' );
		} );

		test( prefix + ': static FALSE should not prevent following repeat from being parsed', ( t ) => {
			const expected: string = '<li>A</li><li>B</li><li>C</li>';
			const template: string =
				'<div data-tdal-condition="FALSE">Never shown</div>' +
				'<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': discarded tags should not activate helper metadata', ( t ) => {
			const template: string = '<div data-tdal-condition="booleanTrue" data-tdal-replace="FALSE">Default</div>';
			const compiled: string = templateEngine.CompileToString( template );
			const helperDeclarations: readonly string[] = [ 'const r=', 'c=(a,c,e)=>', 'b=v=>', 't=[1]' ];
			for( const declaration of helperDeclarations ) {
				t.false( compiled.includes( declaration ) );
			}
			t.is( templateEngine.CompileToFunction( template )( testData ), '' );
		} );

		test( prefix + ': static FALSE branches should not activate helper metadata', ( t ) => {
			templateEngine.MacroAdd( 'static-false-macro', '<span data-tdal-content="string">Default</span>' );
			const template: string = '<div data-tdal-condition="FALSE"><span data-tdal-repeat="item arrayStrings" data-tdal-content="MACRO:static-false-macro" data-tdal-attributes="title string">Default</span></div>';
			const compiled: string = templateEngine.CompileToString( template );
			const helperDeclarations: readonly string[] = [ 'const r=', 't=[1]', 'c=(a,c,e)=>', 'b=v=>', 'let q;', 'f=/[&<>"]/g', 's={"&"' ];
			const cL1: number = helperDeclarations.length;
			for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
				const declaration: string = helperDeclarations[ iL1 ];
				t.false( compiled.includes( declaration ) );
			}
			t.false( compiled.includes( 'm={' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '' );
		} );

		test( prefix + ': should handle negation of FALSE keyword (!FALSE)', ( t ) => {
			const expected: string = '<div>Always shown</div>';
			const template: string = '<div data-tdal-condition="!FALSE">Always shown</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle negation of TRUE keyword (!TRUE)', ( t ) => {
			const expected: string = '';
			const template: string = '<div data-tdal-condition="!TRUE">Never shown</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' data-tdal-repeat';
		test( prefix + ': should repeat element for array items', ( t ) => {
			const expected: string = '<li>A</li><li>B</li><li>C</li>';
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should replace each repeated element', ( t ) => {
			const expected: string = 'ABC';
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-replace="item">Default</li>';
			const compiled: TemplateEngine = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should repeat element for object properties', ( t ) => {
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
			const expected: string = '<div>a</div><div>b</div>';
			const template: string = '<div data-tdal-repeat="item object" data-tdal-content="REPEAT/item/index">Default</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle negated REPEAT variable in condition', ( t ) => {
			const expected: string = '<li>Not first</li><li>Not first</li>';
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-omittag="REPEAT/item/first"><span data-tdal-condition="!REPEAT/item/first" data-tdal-omittag="TRUE">Not first</span></li>';
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

		test( prefix + ': should always emit REPEAT metadata from generated code', ( t ) => {
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>';
			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( 'r.REPEAT.item={' ) );
			t.true( compiled.includes( 'delete r.REPEAT.item' ) );
			t.true( compiled.includes( 'delete r.item' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<li>A</li><li>B</li><li>C</li>' );
		} );

		test( prefix + ': should keep used REPEAT metadata in generated code', ( t ) => {
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/number">Default</li>';
			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( 'r.REPEAT.item={' ) );
		} );

		test( prefix + ': should keep used REPEAT metadata for self-closed repeats', ( t ) => {
			const template: string = '<input data-tdal-repeat="item arrayStrings" data-tdal-content="REPEAT/item/number" />';
			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( 'r.REPEAT.item={' ) );
			t.true( compiled.includes( 'delete r.REPEAT.item' ) );
			t.true( compiled.includes( 'delete r.item' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<input>1</input><input>2</input><input>3</input>' );
		} );

		test( prefix + ': should initialize an empty repeat root for a bare REPEAT read', ( t ) => {
			const template: string = '<span data-tdal-content="REPEAT/item/number">Default</span>';
			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( 'r={}' ) );
			t.false( compiled.includes( 'r={REPEAT:{}}' ) );
			t.is( templateEngine.CompileToFunction( template )( {} ), '<span></span>' );
		} );

		test( prefix + ': should handle static TRUE value (empty output)', ( t ) => {
			const expected: string = '';
			const template: string = '<li data-tdal-repeat="item TRUE">Content</li>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle static FALSE value (empty output)', ( t ) => {
			const expected: string = '';
			const template: string = '<li data-tdal-repeat="item FALSE">Content</li>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': static repeat drop should skip malformed later omittag', ( t ) => {
			const template: string = '<div data-tdal-repeat="item FALSE" data-tdal-omittag="REPEAT/item">drop</div><span>keep</span>';
			const compiled: TemplateEngine = templateEngine.CompileToFunction( template );
			const result: string = compiled( {} );
			t.is( result, '<span>keep</span>' );
		} );

		test( prefix + ': should isolate repeat state across nested repeat iterations', ( t ) => {
			const data: { groups: { name: string; items: string[]; }[]; } = {
				groups: [
					{ name: 'G1', items: [ 'a1', 'a2', 'a3' ] },
					{ name: 'G2', items: [ 'b1' ] }
				]
			};
			const expected: string =
				'<div>[<span>G1</span><ul><li>a1</li><li>a2</li><li>a3</li></ul><span>G1</span><span>1</span></div>' +
				'<div>[<span>G2</span><ul><li>b1</li></ul><span>G2</span><span>2</span><span>G2</span></div>';
			const template: string =
				'<div data-tdal-repeat="group groups">[<span data-tdal-content="group/name">N</span>' +
				'<ul><li data-tdal-repeat="item group/items" data-tdal-content="item">I</li></ul>' +
				'<span data-tdal-content="group/name">N</span><span data-tdal-content="REPEAT/group/number">0</span>' +
				'<span data-tdal-condition="REPEAT/group/last" data-tdal-content="group/name">LAST</span></div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( data );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' data-tdal-content';
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
	}

	{
		prefix = tag + ' data-tdal-replace';
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

		test( prefix + ': should remove element with static FALSE', ( t ) => {
			const expected: string = '';
			const template: string = '<span data-tdal-replace="FALSE">Default content</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': static replace drop should skip malformed later attributes', ( t ) => {
			const template: string = '<div data-tdal-replace="FALSE" data-tdal-attributes="title REPEAT/item">drop</div><span>keep</span>';
			const compiled: TemplateEngine = templateEngine.CompileToFunction( template );
			const result: string = compiled( {} );
			t.is( result, '<span>keep</span>' );
		} );
	}

	{
		prefix = tag + ' data-tdal-attributes';
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

		test( prefix + ': should handle a data path in attributes', ( t ) => {
			const expected: string = '<a href="about">Link</a>';
			const template: string = '<a data-tdal-attributes="href stringPage">Link</a>';
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

		test( prefix + ': should handle flag attribute with dynamic true condition', ( t ) => {
			const expected: string = '<input disabled/>';
			const template: string = '<input data-tdal-attributes="disabled? booleanTrue" />';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle flag attribute with dynamic false condition', ( t ) => {
			const expected: string = '<input/>';
			const template: string = '<input data-tdal-attributes="disabled? booleanFalse" />';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle existing attribute without value', ( t ) => {
			const expected: string = '<input disabled/>';
			const template: string = '<input disabled data-tdal-attributes="disabled booleanTrue" />';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': attribute values are not HTML-escaped', ( t ) => {
			const template: string = '<a data-tdal-attributes="href url">Link</a>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( { url: 'javascript:alert(1)" onclick="alert(2)' } );
			t.is( result, '<a href="javascript:alert(1)" onclick="alert(2)">Link</a>' );
		} );

		test( prefix + ': should handle namespaced attributes like xlink:href', ( t ) => {
			const expected: string = '<use xlink:href="/test.jpg"></use>';
			const template: string = '<use xlink:href="#a" data-tdal-attributes="xlink:href stringPath"></use>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' data-tdal-omittag';
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
			prefix = tag + ' data-tdal-omittag: should handle dynamic conditions';
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

		test( prefix + ': should preserve outer whitespace and negation in raw condition and omittag expressions', ( t ) => {
			const conditionTemplate: string = '<div data-tdal-condition=" !visible ">Content</div>';
			const omitTemplate: string = '<span data-tdal-omittag=" !visible ">Content</span>';
			t.is( templateEngine.CompileToFunction( conditionTemplate )( { visible: false } ), '<div>Content</div>' );
			t.is( templateEngine.CompileToFunction( conditionTemplate )( { visible: true } ), '' );
			t.is( templateEngine.CompileToFunction( omitTemplate )( { visible: false } ), 'Content' );
			t.is( templateEngine.CompileToFunction( omitTemplate )( { visible: true } ), '<span>Content</span>' );
		} );
	}

	{
		prefix = tag + ' Macros';
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

		test( prefix + ': should emit repeat metadata for a reachable macro repeat declaration', ( t ) => {
			templateEngine.MacroAdd( 'repeat-declaration', '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>' );
			const template: string = '<div data-tdal-content="structure MACRO:repeat-declaration">Default</div>';
			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( 'r={REPEAT:{}}' ) );
			t.true( compiled.includes( 'r.REPEAT.item={' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<div><li>A</li><li>B</li><li>C</li></div>' );
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

		test( prefix + ': should treat inherited macro names as unknown', ( t ) => {
			const template: string = '<div data-tdal-content="MACRO:toString">Default</div>';
			const compiled: string = templateEngine.CompileToString( template );

			t.false( compiled.includes( 'm={' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<div></div>' );
		} );

		test( prefix + ': should ignore literal helper markers inline and in a reachable macro', ( t ) => {
			const literal: string = 't[ r[ c( b( q= .replace(f, m["x"]';
			const inline: string = templateEngine.CompileToString( '<div>' + literal + '</div>' );
			const helperDeclarations: readonly string[] = [ 'const r=', 't=[1]', 'c=(a,c,e)=>', 'b=v=>', 'let q;', 'f=/[&<>"]/g', 's={"&"' ];
			let cL1: number = helperDeclarations.length;
			for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
				const declaration: string = helperDeclarations[ iL1 ];
				t.false( inline.includes( declaration ) );
			}

			templateEngine.MacroAdd( 'x', '<span>X</span>' );
			templateEngine.MacroAdd( 'literal-markers', literal );
			const macro: string = templateEngine.CompileToString( '<div data-tdal-content="structure MACRO:literal-markers">Default</div>' );
			const macroHelperDeclarations: readonly string[] = [ 'const r=', 't=[1]', 'c=(a,c,e)=>', 'b=v=>', 'f=/[&<>"]/g', 's={"&"' ];
			cL1 = macroHelperDeclarations.length;
			for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
				const declaration: string = macroHelperDeclarations[ iL1 ];
				t.false( macro.includes( declaration ) );
			}
			t.true( macro.includes( 'm={"literal-markers":()=>') );
			t.false( macro.includes( '"x":()=>') );
		} );

		test( prefix + ': should include only the reachable nested macro closure', ( t ) => {
			templateEngine.MacroAdd( 'metadata-closure-c', '<span>C</span>' );
			templateEngine.MacroAdd( 'metadata-closure-b', '<div data-tdal-content="structure MACRO:metadata-closure-c">B</div>' );
			templateEngine.MacroAdd( 'metadata-closure-a', '<div data-tdal-content="structure MACRO:metadata-closure-b">A</div>' );
			templateEngine.MacroAdd( 'metadata-closure-unrelated', '<span>Unrelated</span>' );
			const template: string = '<div data-tdal-content="structure MACRO:metadata-closure-a">Default</div>';
			const compiled: string = templateEngine.CompileToString( template );

			t.true( compiled.includes( '"metadata-closure-a":()=>') );
			t.true( compiled.includes( '"metadata-closure-b":()=>') );
			t.true( compiled.includes( '"metadata-closure-c":()=>') );
			t.false( compiled.includes( '"metadata-closure-unrelated":()=>') );
			t.true( compiled.indexOf( '"metadata-closure-a":()=>') < compiled.indexOf( '"metadata-closure-b":()=>') );
			t.true( compiled.indexOf( '"metadata-closure-b":()=>') < compiled.indexOf( '"metadata-closure-c":()=>') );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<div><div><div><span>C</span></div></div></div>' );
		} );

		test( prefix + ': should activate repeat metadata used by a reachable macro', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			engine.MacroAdd( 'metadata-repeat-number', '<span data-tdal-content="REPEAT/item/number">Default</span>' );
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="structure MACRO:metadata-repeat-number">Default</li>';
			const compiled: string = engine.CompileToString( template );

			t.true( compiled.includes( 'r.REPEAT.item={' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<li><span>1</span></li><li><span>2</span></li><li><span>3</span></li>' );
		} );

		test( prefix + ': should resolve macro dynamic content against the enclosing repeat item for every iteration', ( t ) => {
			templateEngine.MacroAdd( 'item-label', '<b data-tdal-content="item/label">M</b>' );
			const data: { items: { label: string; }[]; } = {
				items: [ { label: 'L1' }, { label: 'L2' } ]
			};
			const expected: string = '<div><i><b>L1</b></i><u>L1</u></div><div><i><b>L2</b></i><u>L2</u></div>';
			const template: string = '<div data-tdal-repeat="item items"><i data-tdal-content="structure MACRO:item-label">M</i><u data-tdal-content="item/label">L</u></div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( data );
			t.is( result, expected );
		} );

		test( prefix + ': should preserve comments in macro when strip is false', ( t ) => {
			const noStripEngine = new jTDAL( true, false );
			const expected: string = '<div><!-- comment --><b>Hello</b></div>';
			noStripEngine.MacroAdd( 'withcomment', '<!-- comment --><b>Hello</b>' );
			const template: string = '<div data-tdal-content="structure MACRO:withcomment">Default</div>';
			const compiled = noStripEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should reject invalid macro names', ( t ) => {
			t.throws(
				() => templateEngine.MacroAdd( 'invalid macro', '<b>Content</b>' ),
				{ message: 'MacroAdd: Invalid macro name' }
			);
		} );

		test( prefix + ': should throw when macro parsing fails without registering it', ( t ) => {
			const failedMacroName: string = 'invalid-template-propagation';
			t.throws( () => templateEngine.MacroAdd( failedMacroName, '<div data-tdal-condition="TRUE">Content' ), { message: 'Parse: Unclosed tag <div>' } );
			const template: string = '<div data-tdal-content="MACRO:' + failedMacroName + '">Default</div>';
			const compiled: string = templateEngine.CompileToString( template );
			t.false( compiled.includes( 'm={' ) );
			t.is( templateEngine.CompileToFunction( template )( testData ), '<div></div>' );
		} );

		test( prefix + ': should register a macro when trim is false', ( t ) => {
			const noTrimEngine = new jTDAL( false );
			const expected: string = ' <b>Hello</b> ';
			noTrimEngine.MacroAdd( 'notrim', ' <b>Hello</b> ' );
			const template: string = '<div data-tdal-replace="structure MACRO:notrim">Default</div>';
			const compiled = noTrimEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' Combined attributes';
		test( prefix + ': should process repeat with attributes', ( t ) => {
			const expected: string = '<img src="1"/><img src="2"/><img src="3"/>';
			const template: string = '<img data-tdal-repeat="id arrayNumbers" data-tdal-attributes="src id" />';
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
			prefix = tag + ' Combined attributes should process attributes in correct order - condition then content';
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
			prefix = tag + ' Combined attributes should process condition with repeat';
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
			prefix = tag + ' Combined attributes should process attributes with condition';
			test( prefix + ': when condition is true', ( t ) => {
				const expected: string = '<a href="https://www.example.org">Hello World</a>';
				const template: string = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="string">Link</a>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( { ...testData, variableFlag: true } );
				t.is( result, expected );
			} );

			test( prefix + ': when condition is false', ( t ) => {
				const expected: string = '';
				const template: string = '<a data-tdal-condition="variableFlag" data-tdal-attributes="href stringUrl" data-tdal-content="string">Link</a>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( { ...testData, variableFlag: false } );
				t.is( result, expected );
			} );
		}
	}

	{
		prefix = tag + ' Edge cases and special scenarios';
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

		test( prefix + ': should throw for unclosed tags', ( t ) => {
			const template: string = '<div data-tdal-condition="TRUE">Content';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Unclosed tag <div>' } );
		} );

		test( prefix + ': should throw for unopened closing tags', ( t ) => {
			const template: string = '</div>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Unopened tag </div>' } );
		} );

		test( prefix + ': should throw for mismatched closing tags', ( t ) => {
			const template: string = '<div data-tdal-condition="TRUE">Content</span>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Mismatched closing tag </span>, expected </div>' } );
		} );

		test( prefix + ': should throw for a mismatched closing tag against the innermost open tag', ( t ) => {
			const template: string = '<div><span></div>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Mismatched closing tag </div>, expected </span>' } );
		} );

		test( prefix + ': should throw for self-closed non-void tags', ( t ) => {
			const template: string = '<div data-tdal-condition="TRUE" />';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Self-closed non-void tag <div>' } );
		} );

		test( prefix + ': should throw for a self-closed non-void tag with content', ( t ) => {
			const template: string = '<div data-tdal-content="string" />';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Self-closed non-void tag <div>' } );
		} );

		test( prefix + ': should preserve TDAL inside nested template regions', ( t ) => {
			const template: string = '<template><template><span data-tdal-content="string">Default</span></template></template>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, template );
		} );

		test( prefix + ': should preserve TDAL inside script nested in template', ( t ) => {
			const template: string = '<template><script><span data-tdal-content="string">Default</span></script></template>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, template );
		} );

		test( prefix + ': should preserve and balance all opaque-region tag cases', ( t ) => {
			const template: string =
				'<template>' +
				'<div data-tdal-content="string">Template content</div>' +
				'<template><span data-tdal-condition="FALSE">Nested template</span></template>' +
				'<script><template><span data-tdal-content="string">Script content</span></template></script>' +
				'</template>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, template );
		} );

		test( prefix + ': should convert void element to non-void when content is added', ( t ) => {
			const expected: string = '<input>Hello World</input>';
			const template: string = '<input data-tdal-content="string" />';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should preserve ordinary attributes when converting a void element with content', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const expected: string = '<input type="text">Hello World</input>';
			const template: string = '<input type="text" data-tdal-content="string" />';
			const compiled: TemplateEngine = engine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should omit a self-closed void element when omittag is true', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const expected: string = '';
			const template: string = '<input type="text" data-tdal-omittag="TRUE" />';
			const compiled: TemplateEngine = engine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle > inside quoted attribute values', ( t ) => {
			const expected: string = '<a title="1>2">link</a>';
			const template: string = '<a title="1>2" data-tdal-condition="TRUE">link</a>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle > inside single-quoted attribute values', ( t ) => {
			const expected: string = '<a title=\'1>2\'>link</a>';
			const template: string = '<a title=\'1>2\' data-tdal-condition="TRUE">link</a>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle < inside quoted attribute values of nested tags', ( t ) => {
			const expected: string = '<div><div title="a<b">x</div></div>';
			const template: string = '<div data-tdal-condition="TRUE"><div title="a<b">x</div></div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		{
			prefix = tag + ' Literal quoting';
			test( prefix + ': should preserve text containing both quote types', ( t ) => {
				const engine: jTDALOriginal = new jTDAL();
				const expected: string = '<div>She said "hello" and \'goodbye\'</div>';
				const template: string = '<div data-tdal-condition="TRUE">She said "hello" and \'goodbye\'</div>';
				const compiled: TemplateEngine = engine.CompileToFunction( template );
				const result: string = compiled( testData );
				t.is( result, expected );
			} );

			test( prefix + ': should preserve text containing both quote types and a backtick', ( t ) => {
				const engine: jTDALOriginal = new jTDAL();
				const expected: string = '<div>She said "hello", \'goodbye\', and `maybe`</div>';
				const template: string = '<div data-tdal-condition="TRUE">She said "hello", \'goodbye\', and `maybe`</div>';
				const compiled: TemplateEngine = engine.CompileToFunction( template );
				const result: string = compiled( testData );
				t.is( result, expected );
			} );
		}

		test( prefix + ': should handle comments removal when strip is true', ( t ) => {
			const expected: string = '<div>Before</div><div>After</div>';
			const template: string = '<div>Before</div><!-- Comment --><div>After</div>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should strip a document-leading comment when strip is true', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const expected: string = '<div>Content</div>';
			const template: string = '<!-- Comment --><div>Content</div>';
			const compiled: TemplateEngine = engine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should preserve comments inside template elements when strip is true', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const expected: string = '<template><!-- Comment --><span>Content</span></template>';
			const template: string = '<template><!-- Comment --><span>Content</span></template>';
			const compiled: TemplateEngine = engine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should throw for an unclosed comment', ( t ) => {
			const template: string = '<div>Before</div><!-- Comment';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'Parse: Unclosed comment' } );
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

		test( prefix + ': should preserve literal ") ?" text', ( t ) => {
			t.is( templateEngine.CompileToFunction( '<div>) ?</div>' )( {} ), '<div>) ?</div>' );
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

		test( prefix + ': should throw for invalid REPEAT path syntax', ( t ) => {
			const template: string = '<div data-tdal-content="REPEAT/item">Default</div>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'ParsePath: Invalid REPEAT syntax' } );
		} );

		test( prefix + ': should throw for invalid GLOBAL path syntax', ( t ) => {
			const template: string = '<div data-tdal-content="GLOBAL">Default</div>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'ParsePath: Invalid GLOBAL syntax' } );
		} );

		test( prefix + ': should throw for an invalid leading-slash path length', ( t ) => {
			const template: string = '<div data-tdal-content="/item">Default</div>';
			t.throws( () => templateEngine.CompileToFunction( template ), { message: 'ParsePath: Invalid path length' } );
		} );

		test( prefix + ': should ignore an unknown foo:bar directive', ( t ) => {
			const expected: string = '<span>Default</span>';
			const template: string = '<span data-tdal-content="foo:bar">Default</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		{
			prefix = tag + ' Edge cases and special scenarios: should handle trim option';
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
			prefix = tag + ' Edge cases and special scenarios: should handle falsy values';
			test( prefix + ': when value is null', ( t ) => {
				const expected: string = '<span>Hello World</span>';
				const template: string = '<span data-tdal-content="variableValue | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( { ...testData, variableValue: null } );
				t.is( result, expected );
			} );

			test( prefix + ': when value is undefined', ( t ) => {
				const expected: string = '<span>Hello World</span>';
				const template: string = '<span data-tdal-content="variableValue | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( { ...testData, variableValue: undefined } );
				t.is( result, expected );
			} );

			test( prefix + ': when value is 0', ( t ) => {
				const expected: string = '<span>Hello World</span>';
				const template: string = '<span data-tdal-content="numberZero | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( { ...testData, numberZero: 0 } );
				t.is( result, expected );
			} );

			test( prefix + ': when value is an empty string', ( t ) => {
				const expected: string = '<span>Hello World</span>';
				const template: string = '<span data-tdal-content="stringEmpty | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( testData );
				t.is( result, expected );
			} );

			test( prefix + ': when value is an empty array', ( t ) => {
				const expected: string = '<span></span>';
				const template: string = '<span data-tdal-content="arrayEmpty | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( testData );
				t.is( result, expected );
			} );

			test( prefix + ': when value is an empty object', ( t ) => {
				const expected: string = '<span></span>';
				const template: string = '<span data-tdal-content="objectEmpty | string">Original</span>';
				const compiled = templateEngine.CompileToFunction( template );
				const result: string = compiled( testData );
				t.is( result, expected );
			} );
		}
	}

	{
		prefix = tag + ' Global paths';

		test( prefix + ': should retry a TDAL-empty local boolean path against global data', ( t ) => {
			const expected: string = '<ul><li>Shown</li></ul>';
			const template: string = '<ul data-tdal-repeat="item items"><li data-tdal-condition="item/value">Shown</li></ul>';
			const compiled = templateEngine.CompileToFunction( template );
			const data: { items: { value: Record<string, never>; }[]; item: { value: boolean; }; } = {
				items: [ { value: {} } ],
				item: { value: true }
			};
			const result: string = compiled( data );
			t.is( result, expected );
		} );

		test( prefix + ': should resolve GLOBAL path in content', ( t ) => {
			const expected: string = '<span>World</span>';
			const template: string = '<span data-tdal-content="GLOBAL/stringName">Default</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle negated GLOBAL path in condition', ( t ) => {
			const expected: string = '';
			const template: string = '<span data-tdal-condition="!GLOBAL/booleanTrue">Hidden</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );

		test( prefix + ': should handle GLOBAL path in condition', ( t ) => {
			const expected: string = '<span>Shown</span>';
			const template: string = '<span data-tdal-condition="GLOBAL/booleanTrue">Shown</span>';
			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' CompileToFunction method';
		test( prefix + ': should propagate new Function construction errors', ( t ) => {
			const originalFunction: FunctionConstructor = globalThis.Function;
			const throwingFunction: FunctionConstructor = function( ..._args: string[] ): Function {
				throw new SyntaxError( 'Injected Function error' );
			} as FunctionConstructor;
			globalThis.Function = throwingFunction;

			try {
				t.throws( () => templateEngine.CompileToFunction( '<div>Content</div>' ), { instanceOf: SyntaxError, message: 'Injected Function error' } );
			} finally {
				globalThis.Function = originalFunction;
			}
		} );
	}

	{
		prefix = tag + ' CompileToString method';

		test( prefix + ': should emit bitmask resolver flags', ( t ) => {
			const defaultBoolean: string = templateEngine.CompileToString( '<span data-tdal-condition="booleanTrue">Shown</span>' );
			const defaultRaw: string = templateEngine.CompileToString( '<span data-tdal-content="string">Default</span>' );
			const repeatBoolean: string = templateEngine.CompileToString( '<span data-tdal-condition="REPEAT/item/first">Shown</span>' );
			const globalBoolean: string = templateEngine.CompileToString( '<span data-tdal-condition="GLOBAL/booleanTrue">Shown</span>' );

			t.true( defaultBoolean.includes( 'c(r,"booleanTrue",3)' ) );
			t.true( defaultBoolean.includes( 'b=v=>!!v&&' ) );
			t.true( defaultRaw.includes( 'c(r,"string",1)' ) );
			t.false( defaultRaw.includes( 'b=v=>!!v&&' ) );
			t.true( repeatBoolean.includes( 'c(r,"REPEAT/item/first",2)' ) );
			t.true( globalBoolean.includes( 'c(d,"booleanTrue",2)' ) );
		} );

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

		test( prefix + ': should throw when parsing fails', ( t ) => {
			const template: string = '<div data-tdal-condition="TRUE">Content';
			t.throws( () => templateEngine.CompileToString( template ), { message: 'Parse: Unclosed tag <div>' } );
		} );
	}

	{
		prefix = tag + ' Performance and stress tests';
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
				expected += `<div data-value="Hello World">`;
			}
			for( let i = 0; i < levels; i++ ) {
				expected += '</div>';
			}
			expected += '</div>';
			let template: string = '<div data-tdal-condition="TRUE">';
			for( let i = 0; i < levels; i++ ) {
				template += `<div data-tdal-attributes="data-value string">`;
			}
			for( let i = 0; i < levels; i++ ) {
				template += '</div>';
			}
			template += '</div>';

			const compiled = templateEngine.CompileToFunction( template );
			const result: string = compiled( testData );
			t.is( result, expected );
		} );
	}

	{
		prefix = tag + ' Generated source';
		test( prefix + ': should emit a single template literal for static output', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<div><span>Plain HTML</span></div>' );
			t.true( compiled.includes( 'return`<div><span>Plain HTML</span></div>`.trim()' ) );
		} );

		test( prefix + ': should emit interpolations for dynamic fragments', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<span data-tdal-content="string">Default</span>' );
			t.true( compiled.includes( 'return`<span>${' ) );
			t.true( compiled.includes( '${' ) );
		} );

		test( prefix + ': should not emit quoted-string concatenation', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<div data-tdal-condition="booleanTrue">Content</div>' );
			t.false( compiled.includes( '"+"' ) );
			t.false( compiled.includes( '\\"\\"' ) );
		} );

		test( prefix + ': should emit a backtick attribute branch for non-boolean dynamic attributes', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<a data-tdal-attributes="href stringUrl">Link</a>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '` href="${q}"`' ) );
			t.false( compiled.includes( `?' href="'+q+'"'` ) );
			t.is( engine.CompileToFunction( template )( testData ), '<a href="https://www.example.org">Link</a>' );

			const staticTemplate: string = '<a data-tdal-attributes="href stringEmpty" href="http://www.example.org">Link</a>';
			t.is( engine.CompileToFunction( staticTemplate )( testData ), '<a>Link</a>' );
		} );

		test( prefix + ': should keep an existing quoted static attribute as fallback for a falsy dynamic value', ( t ) => {
			const template: string = '<i title="d" data-tdal-attributes="title v | TRUE">x</i>';
			const result: string = templateEngine.CompileToFunction( template )( { v: false } );
			t.is( result, '<i title="d">x</i>' );

			const compiled: string = templateEngine.CompileToString( template );
			t.true( compiled.includes( '` title="${q}"`' ) );
			t.false( compiled.includes( `?' title="'+q+'"'` ) );
		} );

		test( prefix + ': should copy a physical carriage return into generated source', ( t ) => {
			const engine: jTDALOriginal = new jTDAL( false );
			const cr: string = String.fromCharCode( 13 );
			const template: string = '<div>a' + cr + 'b</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'a' + cr + 'b' ) );
			t.false( compiled.includes( 'a\\rb' ) );
		} );

		test( prefix + ': should copy a physical CRLF into generated source and keep the line feed physical', ( t ) => {
			const engine: jTDALOriginal = new jTDAL( false );
			const cr: string = String.fromCharCode( 13 );
			const template: string = '<div>a' + cr + '\n' + 'b</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'a' + cr + '\n' + 'b' ) );
			t.false( compiled.includes( 'a\\r\nb' ) );
			t.is( engine.CompileToFunction( template )( {} ), '<div>a\nb</div>' );
		} );

		test( prefix + ': should emit branch template literals for conditions', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<div data-tdal-condition="booleanTrue">Content</div>' );
			t.true( compiled.includes( '?`<div>Content</div>`:``' ) );
		} );

		test( prefix + ': should emit a nested template literal for repeat bodies', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<li data-tdal-repeat="item arrayStrings" data-tdal-content="item">Default</li>' );
			t.true( compiled.includes( 'return o+`' ) );
		} );

		test( prefix + ': should emit an empty template literal for an empty template', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '' );
			t.true( compiled.includes( 'return``' ) );
			t.is( engine.CompileToFunction( '' )( {} ), '' );
		} );

		test( prefix + ': should escape backticks in static text', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<div>a ` b</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'a \\` b' ) );
			t.is( engine.CompileToFunction( template )( {} ), template );
		} );

		test( prefix + ': should escape ${ in static text', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<div>a ${ b</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'a \\${ b' ) );
			t.is( engine.CompileToFunction( template )( {} ), template );
		} );

		test( prefix + ': should escape backslashes in static text', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<div>a \\ b</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'a \\\\ b' ) );
			t.is( engine.CompileToFunction( template )( {} ), template );
		} );
	}

	{
		prefix = tag + ' Generated property access';
		test( prefix + ': should emit dot access for valid identifiers', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			engine.MacroAdd( 'validMacro', '<b>X</b>' );
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-content="structure MACRO:validMacro">Default</li>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'r.item=(!0===q)?v:q[v];' ) );
			t.true( compiled.includes( 'r.REPEAT.item={' ) );
			t.true( compiled.includes( 'delete r.REPEAT.item,delete r.item' ) );
			t.true( compiled.includes( 'm.validMacro()' ) );
			t.false( compiled.includes( 'q=true' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<li><b>X</b></li><li><b>X</b></li><li><b>X</b></li>' );
		} );

		test( prefix + ': should emit bracket access for names with hyphens or leading digits', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const hyphenTemplate: string = '<li data-tdal-repeat="my-item arrayStrings" data-tdal-content="my-item">Default</li>';
			const hyphenCompiled: string = engine.CompileToString( hyphenTemplate );
			t.true( hyphenCompiled.includes( 'r["my-item"]=(!0===q)?v:q[v];' ) );
			t.true( hyphenCompiled.includes( 'r.REPEAT["my-item"]={' ) );
			t.true( hyphenCompiled.includes( 'delete r.REPEAT["my-item"],delete r["my-item"]' ) );
			t.is( engine.CompileToFunction( hyphenTemplate )( testData ), '<li>A</li><li>B</li><li>C</li>' );

			const digitTemplate: string = '<li data-tdal-repeat="1st arrayStrings" data-tdal-content="1st">Default</li>';
			const digitCompiled: string = engine.CompileToString( digitTemplate );
			t.true( digitCompiled.includes( 'r["1st"]=(!0===q)?v:q[v];' ) );
			t.is( engine.CompileToFunction( digitTemplate )( testData ), '<li>A</li><li>B</li><li>C</li>' );
		} );

		test( prefix + ': should emit bracket access for hyphenated macro names', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			engine.MacroAdd( 'my-macro', '<b>Y</b>' );
			const template: string = '<div data-tdal-content="structure MACRO:my-macro">Default</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'm["my-macro"]()' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<div><b>Y</b></div>' );
		} );
	}

	{
		prefix = tag + ' Generated resolver';
		test( prefix + ': should emit the compact resolver with loose typeof and comma loop', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<span data-tdal-content="string">Default</span>' );
			t.true( compiled.includes( 'c=(a,c,e)=>{let z=a,y=c.split("/"),x=0,w,l=y.length,m=2&e;for(;x<l&&1!==z;)z="object"==typeof z&&null!==z&&void 0!==(w="function"==typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w,x++,1&e&&(!1===z||x==l&&m&&!b(z))&&(z=d,e=0,x=0);return m?b(z):z}' ) );
			t.true( compiled.includes( 'void 0!==' ) );
			t.true( compiled.includes( 'null!==z' ) );
			t.true( compiled.includes( '1!==z' ) );
			t.true( compiled.includes( '!1===z' ) );
			t.false( compiled.includes( '===typeof' ) );
			t.false( compiled.includes( '!==typeof' ) );
			const booleanCompiled: string = engine.CompileToString( '<span data-tdal-condition="booleanTrue">Shown</span>' );
			t.true( booleanCompiled.includes( '"object"!=typeof v' ) );
		} );
	}

	{
		prefix = tag + ' Dynamic value handling';
		test( prefix + ': should handle content values false, true, 0, NaN, and HTML', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<span data-tdal-content="v">Fallback</span>';
			t.is( engine.CompileToFunction( template )( { v: false } ), '<span></span>' );
			t.is( engine.CompileToFunction( template )( { v: true } ), '<span>Fallback</span>' );
			t.is( engine.CompileToFunction( template )( { v: 0 } ), '<span>0</span>' );
			t.is( engine.CompileToFunction( template )( { v: NaN } ), '<span></span>' );
			t.is( engine.CompileToFunction( template )( { v: '<x>' } ), '<span>&lt;x&gt;</span>' );
		} );

		test( prefix + ': should emit inverted content ternary with loose typeof', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<span data-tdal-content="v">Fallback</span>' );
			t.true( compiled.includes( '${q=c(r,"v",1),!1===q||"string"!=typeof q&&("number"!=typeof q||isNaN(q))?!0!==q?``:' ) );
			t.true( compiled.includes( ':String(q).replace(f,m=>s[m])}' ) );
			t.false( compiled.includes( '!1!==q' ) );
		} );

		test( prefix + ': should handle value attributes false, true, 0, NaN, empty, and non-empty strings', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<a title="Static" data-tdal-attributes="title v">Link</a>';
			t.is( engine.CompileToFunction( template )( { v: false } ), '<a>Link</a>' );
			t.is( engine.CompileToFunction( template )( { v: NaN } ), '<a>Link</a>' );
			t.is( engine.CompileToFunction( template )( { v: '' } ), '<a>Link</a>' );
			t.is( engine.CompileToFunction( template )( { v: true } ), '<a title="Static">Link</a>' );
			t.is( engine.CompileToFunction( template )( { v: 0 } ), '<a title="0">Link</a>' );
			t.is( engine.CompileToFunction( template )( { v: 'x' } ), '<a title="x">Link</a>' );
			const bareTemplate: string = '<a data-tdal-attributes="title v">Link</a>';
			t.is( engine.CompileToFunction( bareTemplate )( { v: true } ), '<a title>Link</a>' );
		} );

		test( prefix + ': should emit inverted value attribute ternary with loose typeof', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const compiled: string = engine.CompileToString( '<a title="Static" data-tdal-attributes="title v">Link</a>' );
			t.true( compiled.includes( '${q=c(r,"v",1),!1===q||(!q||"string"!=typeof q)&&("number"!=typeof q||isNaN(q))?!0!==q?``:' ) );
			t.true( compiled.includes( '` title="${q}"`' ) );
			t.false( compiled.includes( '!1!==q' ) );
		} );
	}

	{
		prefix = tag + ' Direct negated ternary inversion';
		test( prefix + ': should invert condition ternary for direct negated resolver calls', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<div data-tdal-condition="!booleanTrue">Content</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '${c(r,"booleanTrue",3)?``:`<div>Content</div>`}' ) );
			t.false( compiled.includes( '!c(' ) );
			t.is( engine.CompileToFunction( template )( testData ), '' );
			t.is( engine.CompileToFunction( template )( { booleanTrue: false } ), '<div>Content</div>' );
		} );

		test( prefix + ': should keep leading !c for OR fallback conditions', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<div data-tdal-condition="!booleanTrue | booleanFalse">Content</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '!c(r,"booleanTrue",3)||c(r,"booleanFalse",3)?' ) );
			t.is( engine.CompileToFunction( template )( testData ), '' );
			t.is( engine.CompileToFunction( template )( { booleanTrue: false } ), '<div>Content</div>' );
		} );

		test( prefix + ': should invert flag attribute ternary', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<input data-tdal-attributes="disabled? !booleanFalse" />';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '${c(r,"booleanFalse",3)?``:` disabled`}' ) );
			t.false( compiled.includes( '!c(' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<input disabled/>' );
			t.is( engine.CompileToFunction( template )( { booleanFalse: true } ), '<input/>' );
		} );

		test( prefix + ': should invert omittag prefix and both suffixes', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<span data-tdal-omittag="!booleanTrue">Content</span>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '${c(r,"booleanTrue",3)?`' ) );
			t.true( compiled.includes( ':``}' ) );
			t.false( compiled.includes( '!c(' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<span>Content</span>' );
			t.is( engine.CompileToFunction( template )( { booleanTrue: false } ), 'Content' );
		} );

		test( prefix + ': should invert omittag inside repeat bodies', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const template: string = '<li data-tdal-repeat="item arrayStrings" data-tdal-omittag="!REPEAT/item/first"><span data-tdal-content="item">Default</span></li>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( '${c(r,"REPEAT/item/first",2)?`' ) );
			t.true( compiled.includes( ':``}' ) );
			t.is( engine.CompileToFunction( template )( testData ), '<li><span>A</span></li><span>B</span><span>C</span>' );
		} );

		test( prefix + ': should keep q=!c for content and non-flag attribute negations', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const contentTemplate: string = '<span data-tdal-content="!booleanTrue">Default</span>';
			const contentCompiled: string = engine.CompileToString( contentTemplate );
			t.true( contentCompiled.includes( 'q=!c(r,"booleanTrue",3)' ) );
			t.is( engine.CompileToFunction( contentTemplate )( testData ), '<span></span>' );

			const attrTemplate: string = '<a title="S" data-tdal-attributes="title !booleanTrue">Link</a>';
			const attrCompiled: string = engine.CompileToString( attrTemplate );
			t.true( attrCompiled.includes( 'q=!c(r,"booleanTrue",3)' ) );
			t.is( engine.CompileToFunction( attrTemplate )( testData ), '<a>Link</a>' );
		} );
	}

	{
		prefix = tag + ' Static literal preservation';
		test( prefix + ': should keep generator-like tokens verbatim in static text', ( t ) => {
			const engine: jTDALOriginal = new jTDAL();
			const literal: string = 'q=!0===q?!c(r,"x",3)?y:z:delete r.REPEAT["k"],b="object"==typeof q&&null!==z';
			const template: string = '<div>' + literal + '</div>';
			const compiled: string = engine.CompileToString( template );
			t.true( compiled.includes( 'return`<div>' + literal + '</div>`.trim()' ) );
			t.is( engine.CompileToFunction( template )( {} ), '<div>' + literal + '</div>' );
		} );
	}
}
