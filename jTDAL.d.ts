declare namespace jTDAL {
    function CompileToFunction(template: string, trim?: boolean, strip?: boolean): Function;
    function CompileToString(template: string, trim?: boolean, strip?: boolean): string;
}
declare const _default: {
    CompileToFunction: typeof jTDAL.CompileToFunction;
    CompileToString: typeof jTDAL.CompileToString;
};
export default _default;
