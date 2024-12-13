# jTDAL
Small template engine based on Zope TAL, using data attributes

Written in Typescript, for node & browser.

## Why another template engine?
Because I didn't found a fast javascript template engine based on attributes.
While mustache is absolutely awesome, if find it syntax quite weird.
Using attributes the page can be designed with any WYSIWYG editor or preview in the browser without the need of the actual rendering data.

## Usage     
    <script type="module">
    import JTDAL from 'https://unpkg.com/jtdal/jTDAL.min.js';
    ...
    </script>
or

    import JTDAL from 'jTDAL';
    ...
    const t = jTDAL.CompileToFunction( template );
    let result = t( data ); 

## Attributes
The engine support the following data-attribute (the order isn't casual, is the resolve order):
* data-tdal-condition="path-expression-boolean-mod-allowed"
* data-tdal-repeat="repeat-variabile path-expression"
* data-tdal-content="path-expression-string-allowed" OR
* data-tdal-replace="path-expression-string-allowed"
* data-tdal-attributes="attribute path-expression-string-allowed[;;attributes path-expression-string-allowed]"
* data-tdal-omittag="path-expression-boolean-mod-allowed"

I plan the implement the jTDAL equivalent of the TAL's METAL (partials in mustache) in a future update.

### Path expression
A path expression indicate the position of the value in the data object.
Having:

    data = { foo: "bar", foobar: { bar: "foo" } };

"foobar/bar" resolve to foo, while "foo" resolve to bar.

The syntax of a path expression is:

    path/notexistant| existing/path | never/reached

The first that exists and is not false, is the used as result of the path expression. Otherwise false is returned.

If the path expression supports booleans, you can prepend [!] to a path.

If the path expression supports strings, you can append, as last path

    STRING:this is a string {and/you/can/have/paths/too}! {?this/path/is/true} showed only if the condition is true{?this/path/is/true}{?!this/is/false} visible only unless is true{?!this/is/false}

In a boolean check, empty lists or empty string will be considered "false".

There are also special keywords availabe in the path expression: TRUE and FALSE. When one of those is reached, the expression parsing will stop.

    FALSE | never/reached
    TRUE | never/reached

### Condition
    data-tdal-condition="!exists | !TRUE | FALSE | element"

If the result of the path expression is false, the tag and its contents will be removed.

### Repeat
    data-tdal-repeat="variable-name path/array | path/object | FALSE"

If the result of the path expression is an object or an array, you can iterate between the elements.

While iterating, a special REPEAT array and a variable will became availables.
The REPEAT array is reachable throught any path expression and contains:
* index: currently index of the array (or the key if is an object)
* number: current iteration, starting from 1
* even: true if the current iteration is even
* odd: true if the current iteration is odd
* first: true if is the first element
* last: true if is the last element
* length: the number of items in the array or the number of keys in the object

### Content
    data-tdal-content="path-expression-string-allowed"

Replace the content of the tag with the result of the path-expression. Mutually exclusive with Replace (will change in a near future).

If the result of the path expression is false, the content will be removed. If is true, the default content will be kept.

### Replace
    data-tdal-content="path-expression-string-allowed"

Replace the tag and its content with the result of the path-expression. Mutually exclusive with Content (will change in a near future).

If the result of the path expression is "false", the tag and its contents will be removed (like a false data-tdal-condition). If is "true", the default content will be kept.

### Attribute
    data-tdal-attributes="href link | STRING:https://www.example.org/{page};;class STRING:link-color-blue"

Add an attribute or replace the content of an attribute with the result of the path expression. If the expression value is "true" current attribute content will be kept.

### Omittag
    data-tdal-omittag="!exists | !TRUE | FALSE | element"

If the result of the path expression is true, remove the tag but not its content.
