/// <reference types="jquery" />
declare class jTDAL {
    static readonly regexpPatternPath: string;
    static readonly regexpPatternExpression: string;
    static readonly regexp: {
        [key: string]: RegExp;
    };
    static readonly keywords: string[];
    readonly document: JQuery<HTMLElement>;
    selector: string;
    static GetNearestChilds(item: JQuery<HTMLElement>, selector: JQuery.Selector): JQuery<HTMLElement>;
    static IsArray(item: any): boolean;
    static ExpressionResultToBoolean(result: any): boolean;
    static ParsePath(pathExpression: string, globals: {
        [key: string]: any;
    }, repeat: {
        [key: string]: any;
    }): any;
    static ParseExpression(expression: string, globals: {
        [key: string]: any;
    }, repeat: {
        [key: string]: any;
    }): any;
    constructor(document: HTMLElement);
    private Parse;
    Render(globals?: {
        [key: string]: any;
    }): JQuery<HTMLElement>;
}
