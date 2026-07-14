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

Runs on Node.js and in browsers. Written in TypeScript.

* 0 dependencies
* Only ~2.7KB gzipped
* Designer-friendly — templates work in any WYSIWYG editor or browser preview
* No custom syntax to break HTML validation
* Compile templates to optimized JavaScript functions

## Why another template engine?

I wanted a fast, attribute-based JavaScript template engine and couldn't find one. Mustache is great, but its syntax always felt foreign to me. With data attributes, templates stay valid HTML — you can design them in any WYSIWYG editor or preview them in a browser without rendering data.

## Installation and Usage

### Browser

```html
<script type="module">
    import jTDAL from 'https://unpkg.com/jtdal/jTDAL.min.js';

    const templateEngine = new jTDAL();
    const template = '<span data-tdal-content="message">placeholder</span>';
    const render = templateEngine.CompileToFunction(template);
    const result = render({ message: "Hello World" });

    document.getElementById('result').innerHTML = result;
</script>
```

### Node.js

Install via npm:

```bash
npm install jtdal
```

Use it in your project:

```javascript
import jTDAL from 'jtdal';

const templateEngine = new jTDAL();
const template = '<span data-tdal-content="message">placeholder</span>';
const render = templateEngine.CompileToFunction(template);
const result = render({ message: "Hello World" });

console.log(result);
// Output: Hello World
```

## Constructor

```javascript
constructor(trim = true, strip = true)
```

- `trim` — Trim leading and trailing whitespace from the rendered output
- `strip` — Remove HTML comments from the template before compilation

## API

### CompileToFunction(template)

Compiles a template string into a callable function that accepts a data object.

```javascript
const render = templateEngine.CompileToFunction(template);
const html = render({ name: "Alice", items: [1, 2, 3] });
```

### CompileToString(template)

Compiles a template string into a string containing the generated function code. Useful for precompiling templates and saving them as JavaScript files.

```javascript
const code = templateEngine.CompileToString(template);
// Returns a string like: "function(d){...}"
```

## Template Language

### Path Expressions

A path expression identifies a value in the data object using forward-slash notation.

Given this data:

```javascript
const data = {
  logged: true,
  user: { name: "Alice", permissions: { canEdit: false } }
};
```

Paths resolve as follows:

- `logged` resolves to `true`
- `user/name` resolves to `"Alice"`
- `user/permissions/canEdit` resolves to `false`

#### Fallback Paths

Use the pipe `|` character to provide fallback values. The first existing path is used:

```plaintext
missing/path | fallback/path | last/resort
```

#### Falsy Values

These values evaluate as falsy:

- `false`, `null`, `undefined`
- `""` (empty string)
- `0`
- `[]` (empty array)
- `{}` (empty object)

Everything else is truthy.

#### Path Modifiers

**Boolean Negation:**
Prefix with `!` to negate a boolean:

```plaintext
!isDisabled
```

**Uppercase Keywords:**
- `TRUE` — Always returns `true` (stops fallback evaluation)
- `FALSE` — Always returns `false` (stops fallback evaluation)
- `GLOBAL` — Search in global context, bypassing local scopes (e.g. `GLOBAL/variableName`)
- `REPEAT` — Search in the repeat context, bypassing local scopes (e.g. `REPEAT/variableName`)

### String Expressions

A string expression generates text using path expressions as placeholders. Prefix with `STRING:`:

```plaintext
STRING:This is text with {placeholder} and {another/path}
```

Placeholders are replaced with resolved path values.

**Conditional Inclusion:**

Use `{?condition}...{/condition}` to conditionally include text:

```plaintext
STRING:Hello {name}{?user/isPremium} (Premium){/user/isPremium}
```

Use `{?!condition}...{/!condition}` to negate:

```plaintext
STRING:Status: {?!isActive}Inactive{/!isActive}{?isActive}Active{/isActive}
```

## Attributes

The template processor applies attributes in this order:

1. `data-tdal-condition` — Conditional rendering
2. `data-tdal-repeat` — Loop iteration
3. `data-tdal-content` — Replace tag content
4. `data-tdal-replace` — Replace entire tag
5. `data-tdal-attributes` — Dynamic attributes
6. `data-tdal-omittag` — Remove tag wrapper

### data-tdal-condition

Renders the tag only if the expression evaluates to true; removes it otherwise. The expression can be a path with optional `!` negation, a `STRING:` expression, or a chain of fallbacks separated by `|`.

**Examples:**

```html
<!-- Show if isLoggedIn is truthy -->
<div data-tdal-condition="isLoggedIn">Welcome back!</div>

<!-- Show if isGuest is falsy -->
<div data-tdal-condition="!isGuest">Member content</div>

<!-- Check nested path with fallback -->
<div data-tdal-condition="user/permissions/canView | config/defaultVisible">
  Content
</div>

<!-- Always show -->
<div data-tdal-condition="TRUE">Always visible</div>
```

### data-tdal-repeat

Repeats the element for each item in an array or each key in an object. Expects two arguments separated by a space: a name for the loop variable and a path to the collection. A `REPEAT` object is available to child expressions during iteration.

**Syntax:**

```html
<li data-tdal-repeat="variable collection/path">...</li>
```

The `REPEAT` object provides:

- `index` — Current index or object key
- `number` — Iteration count, starting from 1
- `even` — True on even iterations (2, 4, 6...)
- `odd` — True on odd iterations (1, 3, 5...)
- `first` — True for the first element
- `last` — True for the last element
- `length` — Total number of items

**Examples:**

```html
<!-- Simple array iteration -->
<ul>
  <li data-tdal-repeat="item items" data-tdal-content="item">Item</li>
</ul>

<!-- Object iteration -->
<div data-tdal-repeat="user users">
  <h3 data-tdal-content="user/name">Name</h3>
  <p data-tdal-content="user/email">Email</p>
</div>

<!-- Using REPEAT variables -->
<tr data-tdal-repeat="row rows" data-tdal-attributes="class STRING:{?REPEAT/row/odd}odd{?/REPEAT/row/odd}{?REPEAT/row/even}even{?/REPEAT/row/even}">
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

### data-tdal-content

Replaces the tag's inner content with the result of the expression. The expression can be a path, a `STRING:` expression, or a `MACRO:` reference, with optional `!` negation and `|` fallbacks. Prefix with `structure` to insert raw HTML without escaping. If the expression evaluates to false, the content is removed.

**Examples:**

```html
<!-- Simple content replacement -->
<span data-tdal-content="username">Default username</span>

<!-- String template -->
<h1 data-tdal-content="STRING:Welcome, {user/name}!">Welcome!</h1>

<!-- With fallback -->
<div data-tdal-content="errorMessage | STRING:No errors">Error</div>

<!-- Using a macro -->
<div data-tdal-content="MACRO:userCard">User info</div>

<!-- HTML content (not escaped) -->
<div data-tdal-content="structure richTextContent">Default</div>
```

### data-tdal-replace

Replaces the entire tag and its contents with the result of the expression. Accepts the same expressions as `data-tdal-content`. If the expression evaluates to false, the tag and its contents are removed.

**Examples:**

```html
<!-- Replace tag with value -->
<span data-tdal-replace="status">Status</span>

<!-- String template replacement -->
<span data-tdal-replace="STRING:<strong>{username}</strong>">Username</span>

<!-- Using a macro -->
<div data-tdal-replace="MACRO:navigationMenu">Nav</div>

<!-- HTML content (not escaped) -->
<div data-tdal-replace="structure htmlContent">Placeholder</div>
```

### data-tdal-attributes

Sets or modifies tag attributes. Each pair follows the format `attribute expression`, separated by `;;`. Expressions can be paths, `STRING:` expressions, with optional `!` negation and `|` fallbacks. Append `?` to the attribute name for HTML5 boolean attributes: present when truthy, absent when falsy.

**Examples:**

```html
<!-- Dynamic single attribute -->
<a href="#" data-tdal-attributes="href user/profileUrl">Profile</a>

<!-- String template attribute -->
<img data-tdal-attributes="src STRING:https://example.com/{imageId}.jpg" />

<!-- Multiple attributes -->
<a data-tdal-attributes="href link/url;;class STRING:btn btn-{type}">Link</a>

<!-- Boolean flag attributes -->
<input type="checkbox" data-tdal-attributes="checked? user/isActive" />
<button data-tdal-attributes="disabled? !canSubmit">Submit</button>
<option data-tdal-attributes="selected? isDefault">Default</option>

<!-- Mixed attributes -->
<input data-tdal-attributes="type STRING:checkbox;;checked? isEnabled;;disabled? isLocked" />

<!-- Fallback to preserve existing value -->
<img src="default.jpg" data-tdal-attributes="src dynamicUrl | TRUE" />
```

### data-tdal-omittag

Removes the tag wrapper while keeping its content when the expression evaluates to true. The expression can be a path with optional `!` negation, a `STRING:` expression, or a chain of fallbacks separated by `|`.

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
```

## Macros

Macros are reusable template fragments (equivalent to TAL's METAL or Mustache partials). Register them with `MacroAdd`, then reference them using `MACRO:name` in `data-tdal-content` or `data-tdal-replace`.

### Register a Macro

```javascript
const templateEngine = new jTDAL();
const macro = `Hello, <span data-tdal-replace="name | STRING:World"></span>!`;
templateEngine.MacroAdd("helloworld", macro);
```

### Use in Content

Replaces the tag's inner content with the rendered macro:

```html
<span data-tdal-content="MACRO:helloworld">Placeholder</span>
<span data-tdal-content="structure MACRO:helloworld">Placeholder</span>
```

### Use in Replace

Replaces the entire tag with the rendered macro:

```html
<div data-tdal-replace="MACRO:helloworld">Placeholder</div>
<div data-tdal-replace="structure MACRO:helloworld">Placeholder</div>
```

### Macro Context

Macros inherit the data context of the calling template:

```html
<div data-tdal-repeat="item items">
  <div data-tdal-replace="MACRO:helloworld">Item</div>
</div>
```

In this example, the `helloworld` macro accesses `item` within each loop iteration.
