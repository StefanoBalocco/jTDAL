```html
<div>
  Hello there, <span data-tdal-replace="name">world</span>
</div>
```
```json
{
  "name": "General Kenobi"
}
```

# jTDAL

**Template Attribute Language for JavaScript**

[![npm](https://img.shields.io/npm/v/jtdal.svg)](https://www.npmjs.com/package/jtdal)
[![License](https://img.shields.io/github/license/stefanobalocco/jTDAL)](https://github.com/StefanoBalocco/jTDAL/blob/master/LICENSE)
![GZipped size](https://img.badgesize.io/stefanobalocco/jTDAL/master/jTDAL.min.js?compression=gzip)

Small template engine based on Zope TAL, using data attributes.

Written in TypeScript, for Node.js and the browser.

* 🏝️ 0 dependencies
* 🪶 Only ~2.7KB gzipped!
* ⚡️ Written in TypeScript
* 🎨 Designer-friendly
  * Templates work in any WYSIWYG editor or browser preview
  * No special syntax to break HTML validation
* 🚀 Compile templates

## Why another template engine?

Because I didn't find a fast JavaScript template engine based on attributes. While Mustache is absolutely awesome, I find its syntax quite weird. Using attributes, the page can be designed with any WYSIWYG editor or previewed in the browser without the need for the actual rendering data.

## Installation and Usage

You can use jTDAL directly in the browser or as an npm package.

### Browser

```html
<script type="module">
    import jTDAL from 'https://unpkg.com/jtdal/jTDAL.min.js';
    
    const templateEngine = new jTDAL( );
    
    // Define a macro that contains a dynamic element
    templateEngine.MacroAdd( 'macrofoo', '<span data-tdal-content="foo"></span>, ' );

    // Template that uses the macro with replace AND adds another element
    const template = `<span data-tdal-replace="MACRO:macrofoo"></span><span data-tdal-content="bar"></span>`;
    
    const t = templateEngine.CompileToFunction(template);
    const data = { foo: "Hello", bar: "World" };
    const result = t(data);
    
    document.getElementById( 'result' ).innerHTML = result;
    // Output: Hello, World
</script>
```

### Node.js

Install jTDAL via npm:

```bash
npm install jtdal
```

Then use it in your project:

```javascript
import jTDAL from 'jtdal';

// Create template engine
const templateEngine = new jTDAL( );

// Add a macro that contains a dynamic element
templateEngine.MacroAdd( 'macrofoo', '<span data-tdal-content="foo"></span>, ' );

// Template that uses the macro with replace AND adds another element
const template = `<span data-tdal-replace="MACRO:macrofoo"></span><span data-tdal-content="bar"></span>`;

const t = templateEngine.CompileToFunction(template);
const data = { foo: "Hello", bar: "World" };
const result = t(data);

console.log(result);
// Output: Hello, World
```

## Constructor

Constructor takes 2 parameters that controls trim and strip behaviour:

```code
constructor( trim = true, strip = true )
```

## Methods

### CompileToFunction(template)
Compile the template returning a callable function with an optional parameter `data`.

### CompileToString(template)
Compile the template returning a string containing the function code. Usefull to precompile templates and save as javascript files.

## Template language documentation

### Path Expressions

A path expression indicates the position of the value in the data object. Given the following data:

```javascript
data = { foo: "bar", foobar: { bar: "foo" } };
```

- `foobar/bar` resolves to `foo`
- `foo` resolves to `bar`

The syntax of a path expression is:

```plaintext
path/nonexistent | existing/path | never/reached
```

The first existing and truthy path is used as the result. If no paths match, `false` is returned.

**Truthy/Falsy evaluation:**
- Falsy values: `false`, `null`, `undefined`, `""` (empty string), `0`, `[]` (empty array), `{}` (empty object)
- Everything else is considered truthy

#### Modifiers

- **Booleans**: Prefix with `!` for negation.
- **Strings**: Prepend `STRING:` to define static strings or templates with placeholders.

Special keywords:

- `TRUE`: Always returns `true` (halts parsing)
- `FALSE`: Always returns `false` (halts parsing)
- `GLOBAL`: search directly in the global context bypassing other contexts (es. `GLOBAL/variableName`)
- `REPEAT`: search directly in the repeat context bypassing other contexts (es. `REPEAT/variableName`)

### Strings
A string is a path prefixed with `STRING:`. It can contain placeholders in the form {path-expression|another-path|last-path-but-not-a-string}. The placeholders are replaced with the value of the path expression.
In strings is possible to use `{?condition}` or `{?!condition}` for conditional inclusions.
Each {?condition} must be closed with a {?/condition}. Same for {?!condition}.

```code
STRING:This is a string with a {foo}{?bar} and a {bar}{/bar} placeholder.
```

### Attributes

The engine supports the following `data-` attributes. These attributes are resolved in the specified order:

1. `data-tdal-condition="path-expression-boolean-mod-allowed"`

2. `data-tdal-repeat="variable-name path-expression"`

3. `data-tdal-content="path-expression-string/macro-allowed`

4. `data-tdal-replace="path-expression-string/macro-allowed"`

5. `data-tdal-attributes="attribute path-expression-string-allowed[;;attribute path-expression-string-allowed]"`
   - For boolean flag attributes, append `?` to the attribute name: `attribute? path-expression`

6. `data-tdal-omittag="path-expression-boolean-mod-allowed"`

In the documentation below, the attributes are described in the following order for better understanding:

1. Omittag
2. Attributes
3. Content
4. Replace
5. Condition
6. Repeat

### Attribute Details

#### Omittag

Removes the tag while keeping its content if the path expression evaluates to `true`.

**Examples:**
```html
<!-- Always remove the tag -->
<span data-tdal-omittag="TRUE">Content</span>
<!-- Result: Content -->

<!-- Never remove the tag -->
<span data-tdal-omittag="FALSE">Content</span>
<!-- Result: <span>Content</span> -->

<!-- Remove tag if variable is truthy -->
<span data-tdal-omittag="hideWrapper">Content</span>

<!-- Remove tag if variable is falsy -->
<span data-tdal-omittag="!showWrapper">Content</span>

<!-- Remove tag based on nested path -->
<span data-tdal-omittag="config/removeWrappers">Content</span>
```

#### Attributes

Adds or modifies multiple attributes based on the path expression. Each attribute-value pair is separated by `;;`. Existing attribute values are preserved if the expression evaluates to `true`.

**Boolean Flag Attributes:**
If an attribute name ends with `?`, it will be added as a boolean attribute (without value) when truthy, or removed when falsy.

**Examples:**
```html
<!-- Keep existing attribute value -->
<img src="default.jpg" data-tdal-attributes="src TRUE" />

<!-- Replace with dynamic value -->
<a href="#" data-tdal-attributes="href user/profileUrl">Profile</a>

<!-- Use string template -->
<img src="default.jpg" data-tdal-attributes="src STRING:https://example.com/images/{imageId}.jpg" />

<!-- Remove attribute -->
<input type="text" disabled data-tdal-attributes="disabled FALSE" />

<!-- Boolean flag attributes (HTML5 boolean attributes) -->
<input type="checkbox" data-tdal-attributes="checked? isChecked" />
<button data-tdal-attributes="disabled? !canSubmit">Submit</button>
<option data-tdal-attributes="selected? isDefault | FALSE">Default</option>

<!-- Multiple attributes including flags -->
<input data-tdal-attributes="type STRING:checkbox;;checked? user/preferences/newsletter;;disabled? !isEditable" />

<!-- Multiple attributes -->
<a data-tdal-attributes="href link/url;;class STRING:btn btn-{type};;title link/description">Link</a>

<!-- Fallback to keeping existing value -->
<img src="default.jpg" data-tdal-attributes="src dynamicUrl | TRUE" />
```

#### Content

Replaces the tag's content with the result of the path expression. If the expression is false, the content is removed.

**Examples:**
```html
<!-- Simple content replacement -->
<span data-tdal-content="username">Default username</span>

<!-- With HTML structure (not escaped) -->
<div data-tdal-content="structure richTextContent">Default content</div>

<!-- String template -->
<h1 data-tdal-content="STRING:Welcome, {user/name}!">Welcome!</h1>

<!-- Conditional content -->
<div data-tdal-content="errorMessage | STRING:No errors">Error placeholder</div>

<!-- Using macro -->
<div data-tdal-content="MACRO:userCard">User info</div>
```

#### Replace

Replaces the tag and its contents with the result of the path expression. If the expression is false, the tag and its contents are removed.

**Examples:**
```html
<!-- Replace entire element with value -->
<div data-tdal-replace="statusMessage">Status placeholder</div>

<!-- Replace with HTML (not escaped) -->
<div data-tdal-replace="structure htmlContent">Placeholder</div>

<!-- String template replacement -->
<span data-tdal-replace="STRING:<strong>{username}</strong>">Username</span>

<!-- Using macro -->
<div data-tdal-replace="MACRO:navigationMenu">Nav placeholder</div>
```

#### Condition

Removes the tag and its contents if the path expression evaluates to `false`.

**Examples:**
```html
<!-- Show if variable is truthy -->
<div data-tdal-condition="isLoggedIn">Welcome back!</div>

<!-- Show if variable is falsy -->
<div data-tdal-condition="!isGuest">Member content</div>

<!-- Always show -->
<div data-tdal-condition="TRUE">Always visible</div>

<!-- Never show -->
<div data-tdal-condition="FALSE">Never visible</div>

<!-- Check nested path -->
<div data-tdal-condition="user/permissions/canEdit">Edit button</div>

<!-- With fallback -->
<div data-tdal-condition="feature/enabled | config/defaultEnabled">Feature content</div>
```

#### Repeat

Repeats the tag for each element in an array or object. While iterating, a `REPEAT` object and the loop variable are available.

**Examples:**
```html
<!-- Simple array iteration -->
<ul>
  <li data-tdal-repeat="item items" data-tdal-content="item">Item</li>
</ul>

<!-- Object iteration with properties -->
<div data-tdal-repeat="user users">
  <h3 data-tdal-content="user/name">Name</h3>
  <p data-tdal-content="user/email">Email</p>
</div>

<!-- Using REPEAT variables -->
<tr data-tdal-repeat="row data" data-tdal-attributes="class STRING:{?REPEAT/row/odd}odd{?/REPEAT/row/odd}{?REPEAT/row/even}even{?/REPEAT/row/even}">
  <td data-tdal-content="REPEAT/row/number">Index</td>
  <td data-tdal-content="row/value">Value</td>
</tr>

<!-- Nested repeats -->
<div data-tdal-repeat="category categories">
  <h2 data-tdal-content="category/name">Category</h2>
  <ul>
    <li data-tdal-repeat="product category/products" data-tdal-content="product/name">Product</li>
  </ul>
</div>
```

The `REPEAT` object provides:

- `index`: Current index (or key for objects)
- `number`: Current iteration, starting from 1
- `even`, `odd`: Boolean flags for even/odd iterations
- `first`, `last`: Boolean flags for the first/last element
- `length`: Total items in the array or keys in the object

## Macros

jTDAL support macros (equivalent of TAL's METAL or partials in Mustache) in content and replace.

First you need to add your macro to the template:

```javascript
const macro = `Hello, <span data-tdal-replace="name|STRING:World"></span>!`;
templateEngine.MacroAdd( "helloworld", macro );
```

Then you can call it from the template:

#### Content

```html
<span data-tdal-content="MACRO:helloworld">Something</span>
<span data-tdal-content="structure MACRO:helloworld">Something</span>
```

Replaces the tag's content with the template foo

#### Replace

```html
<div data-tdal-replace="MACRO:helloworld">Replaced content</div>
<div data-tdal-replace="structure MACRO:helloworld">Replaced content</div>
```

Replaces the tag with the template foo

## 🎯 Cheat Sheet

```text
╔════════════════════╦═══════════════════════════════╦══════════════════════╗
║ Attribute          ║ Purpose                       ║ Example              ║
╠════════════════════╬═══════════════════════════════╬══════════════════════╣
║ data-tdal-content  ║ Replace inner content         ║ "name"               ║
║ data-tdal-replace  ║ Replace entire element        ║ "structure html"     ║
║ data-tdal-repeat   ║ Loop over arrays/objects      ║ "item items"         ║
║ data-tdal-condition║ Show/hide based on condition  ║ "isLoggedIn"         ║
║ data-tdal-attributes║ Set element attributes       ║ "href url;;class c"  ║
║ data-tdal-omittag  ║ Remove wrapper tag only       ║ "TRUE"               ║
╚════════════════════╩═══════════════════════════════╩══════════════════════╝
```