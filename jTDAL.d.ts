export default class jTDAL {
    private static readonly _keywords;
    private static readonly _regexpPatternPath;
    private static readonly _regexpPatternString;
    private static readonly _regexpPatternMacro;
    private static readonly _regexpPatternPathBoolean;
    private static readonly _regexpPatternExpressionAllowedBoolean;
    private static readonly _regexpPatternExpressionAllowedBooleanMacro;
    private static readonly _regexpTagWithTDAL;
    private static readonly _regexpTagAttributes;
    private static readonly _regexpPathString;
    private static readonly _regexpCondition;
    private static readonly _regexpRepeat;
    private static readonly _regexpContent;
    private static readonly _regexpAttributes;
    private static readonly _regexpAttributesTDAL;
    private static readonly _HTML5VoidElements;
    private _macros;
    private static _ParseString;
    private static _ParsePath;
    private _Parse;
    MacroAdd(macroName: string, template: string, trim?: boolean, strip?: boolean): boolean;
    constructor(macros?: [string, string][], trim?: boolean, strip?: boolean);
    private _Compile;
    CompileToFunction(template: string, trim?: boolean, strip?: boolean): Function;
    CompileToString(template: string, trim?: boolean, strip?: boolean): string;
}
