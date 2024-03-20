/// <reference types="node" />
import path from 'path';
import inflection from 'inflection';
import changeCase from 'change-case';
declare module 'inflection' {
    function undasherize(str: string): string;
}
declare const helpers: {
    capitalize(str: any): string;
    inflection: typeof inflection;
    changeCase: typeof changeCase;
    path: path.PlatformPath;
};
export default helpers;
//# sourceMappingURL=helpers.d.ts.map