# jTDAL

Small template engine based on Zope TAL, using data attributes.

Written in TypeScript, for Node.js and the browser.

## Why another template engine?

Because I didn't find a fast JavaScript template engine based on attributes. While Mustache is absolutely awesome, I find its syntax quite weird. Using attributes, the page can be designed with any WYSIWYG editor or previewed in the browser without the need for the actual rendering data.

## Installation and Usage

You can use jTDAL directly in the browser or as an npm package.

### Browser

```html
<script type="module">
  import jTDAL from 'https://unpkg.com/jtdal/jTDAL.min.js';
  const template = `<div data-tdal-content="foo"></div>`;
  const t = jTDAL.CompileToFunction(template);
  const data = { foo: "Hello, World!" };
  const result = t(data);
  document.getElementById( 'result' ).innerHTML = result;
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

const template = `<div data-tdal-content="foo"></div>`;
const t = jTDAL.CompileToFunction(template);
const data = { foo: "Hello, World!" };
const result = t(data);
console.log(result);
```

## Attributes

The engine supports the following `data-` attributes. These attributes are resolved in the specified order:

1. `data-tdal-condition="path-expression-boolean-mod-allowed"`

2. `data-tdal-repeat="variable-name path-expression"`

3. `data-tdal-content="path-expression-string-allowed`

4. `data-tdal-replace="path-expression-string-allowed"`

5. `data-tdal-attributes="attribute path-expression-string-allowed[;;attribute path-expression-string-allowed]"`

6. `data-tdal-omittag="path-expression-boolean-mod-allowed"`

In the documentation below, the attributes are described in the following order for better understanding:

1. Omittag
2. Attributes
3. Content
4. Replace
5. Condition
6. Repeat

### Planned Features

Future updates will include the jTDAL equivalent of TAL's METAL (partials in Mustache).

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

#### Modifiers

- **Booleans**: Prefix with `!` for negation.
- **Strings**: Prepend `STRING:` to define static strings or templates with placeholders.
- **Conditions**: Use `{?condition}` or `{?!condition}` for conditional inclusions within strings.

Special keywords:

- `TRUE`: Halts parsing and returns `true`.
- `FALSE`: Halts parsing and returns `false`.

### Attribute Details

#### Omittag

```html
<span data-tdal-omittag="!exists | !TRUE | FALSE | element">Content</span>
```

Removes the tag while keeping its content if the path expression evaluates to `true`.

#### Attributes

```html
<a data-tdal-attributes="href path/link | STRING:https://example.org/{page};;class STRING:blue-link">Link name</a>
```

Adds or modifies multiple attributes based on the path expression. Each attribute-value pair is separated by `;;`. Existing attribute values are preserved if the expression evaluates to `true`.

#### Content

```html
<span data-tdal-content="path-expression">Something</span>
```

Replaces the tag's content with the result of the path expression. If the expression is false, the content is removed.

#### Replace

```html
<div data-tdal-replace="path-expression">Replaced content</div>
```

Replaces the tag and its contents with the result of the path expression. If the expression is false, the tag and its contents are removed.

#### Condition

```html
<div data-tdal-condition="!exists | !TRUE | FALSE | element">Conditional element</div>
```

Removes the tag and its contents if the path expression evaluates to `false`.

#### Repeat

```html
<ul>
  <li data-tdal-repeat="item path/array" data-tdal-content="item">Example item</li>
</ul>
```

Repeats the tag for each element in an array or object. While iterating, a `REPEAT` object and the loop variable are available. The `REPEAT` object provides:

- `index`: Current index (or key for objects).
- `number`: Current iteration, starting from 1.
- `even`, `odd`: Boolean flags for even/odd iterations.
- `first`, `last`: Boolean flags for the first/last element.
- `length`: Total items in the array or keys in the object.

