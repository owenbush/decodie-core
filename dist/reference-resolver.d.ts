import { Reference, ReferenceResolution, IndexEntry } from './types';
/** Cache for file contents within a single resolution pass. */
declare class FileContentCache {
    private cache;
    read(filePath: string): string | null;
    clear(): void;
}
export declare function resolveReference(ref: Reference, projectRoot: string, cache?: FileContentCache): ReferenceResolution;
export declare function resolveAllReferences(entries: IndexEntry[], projectRoot: string): Map<string, ReferenceResolution[]>;
export {};
//# sourceMappingURL=reference-resolver.d.ts.map