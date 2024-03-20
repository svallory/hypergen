import type { ActionsMap, GeneratorInfo, ResolvedTemplatePathConfig } from './types';
import { ConflictResolutionStrategy } from './types';
export declare const actionKeyFor: (generator: string, action: string) => string;
export declare function loadGenerators(templates: ResolvedTemplatePathConfig[], conflictStrategy: ConflictResolutionStrategy): {
    generators: Map<string, GeneratorInfo>;
    actionsMap: ActionsMap;
};
//# sourceMappingURL=generators.d.ts.map