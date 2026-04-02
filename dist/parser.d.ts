import { LearningIndex, IndexEntry, SessionFile, Config, FullEntry } from './types';
export declare class DataParser {
    private projectRoot;
    private decodieDir;
    private cachedIndex;
    constructor(projectRoot: string);
    /** Invalidate the cached index so the next read goes to disk. */
    invalidateCache(): void;
    /** Read and parse .decodie/index.json */
    loadIndex(): LearningIndex;
    /** Read a session file by session ID */
    loadSession(sessionId: string): SessionFile;
    /** Read .decodie/config.json or return defaults */
    loadConfig(): Config;
    /** Write config to .decodie/config.json */
    saveConfig(config: Partial<Config>): Config;
    /** Get a single entry merged with its session content and resolved references */
    getEntryWithContent(entryId: string): FullEntry;
    /** Update fields on an entry in index.json and write back to disk */
    updateEntry(entryId: string, updates: Partial<IndexEntry>): IndexEntry;
    /** Compute summary statistics */
    getStats(): {
        total_entries: number;
        active: number;
        archived: number;
        superseded: number;
        stale_references: number;
        sessions: number;
        last_updated: string | null;
    };
}
//# sourceMappingURL=parser.d.ts.map