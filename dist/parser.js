"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const reference_resolver_1 = require("./reference-resolver");
const DEFAULT_CONFIG = {
    user_experience_level: 'intermediate',
    preferred_topics: [],
    excluded_topics: [],
    archival_threshold_days: 90,
    auto_suggest_archival: true,
    show_external_docs: true,
    default_view: 'active',
    sessions_visible_by_default: 5,
    api_key: null,
    api_model: null,
};
class DataParser {
    constructor(projectRoot) {
        this.cachedIndex = null;
        this.projectRoot = path.resolve(projectRoot);
        this.decodieDir = path.join(this.projectRoot, '.decodie');
    }
    /** Invalidate the cached index so the next read goes to disk. */
    invalidateCache() {
        this.cachedIndex = null;
    }
    /** Read and parse .decodie/index.json */
    loadIndex() {
        if (this.cachedIndex) {
            return this.cachedIndex;
        }
        const indexPath = path.join(this.decodieDir, 'index.json');
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Index file not found at ${indexPath}. Is this a project with a .decodie/ directory?`);
        }
        let raw;
        try {
            raw = fs.readFileSync(indexPath, 'utf-8');
        }
        catch (err) {
            throw new Error(`Failed to read index file: ${err.message}`);
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (err) {
            throw new Error(`Failed to parse index.json: ${err.message}`);
        }
        const index = parsed;
        if (!index.version || !index.project || !Array.isArray(index.entries)) {
            throw new Error('Invalid index.json: missing required fields (version, project, entries)');
        }
        this.cachedIndex = index;
        return index;
    }
    /** Read a session file by session ID */
    loadSession(sessionId) {
        const sessionPath = path.join(this.decodieDir, 'sessions', `${sessionId}.json`);
        if (!fs.existsSync(sessionPath)) {
            throw new Error(`Session file not found: ${sessionPath}`);
        }
        let raw;
        try {
            raw = fs.readFileSync(sessionPath, 'utf-8');
        }
        catch (err) {
            throw new Error(`Failed to read session file: ${err.message}`);
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (err) {
            throw new Error(`Failed to parse session file ${sessionId}.json: ${err.message}`);
        }
        const session = parsed;
        if (!session.session_id || !Array.isArray(session.entries)) {
            throw new Error(`Invalid session file ${sessionId}.json: missing required fields`);
        }
        return session;
    }
    /** Read .decodie/config.json or return defaults */
    loadConfig() {
        const configPath = path.join(this.decodieDir, 'config.json');
        if (!fs.existsSync(configPath)) {
            return { ...DEFAULT_CONFIG };
        }
        let raw;
        try {
            raw = fs.readFileSync(configPath, 'utf-8');
        }
        catch {
            return { ...DEFAULT_CONFIG };
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return { ...DEFAULT_CONFIG };
        }
        // Merge with defaults so all fields are present
        return { ...DEFAULT_CONFIG, ...parsed };
    }
    /** Write config to .decodie/config.json */
    saveConfig(config) {
        const current = this.loadConfig();
        const merged = { ...current, ...config };
        const configPath = path.join(this.decodieDir, 'config.json');
        if (!fs.existsSync(this.decodieDir)) {
            fs.mkdirSync(this.decodieDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
        return merged;
    }
    /** Get a single entry merged with its session content and resolved references */
    getEntryWithContent(entryId) {
        const index = this.loadIndex();
        const indexEntry = index.entries.find((e) => e.id === entryId);
        if (!indexEntry) {
            throw new Error(`Entry not found: ${entryId}`);
        }
        // Resolve references for this entry
        const referenceResolutions = indexEntry.references.map((ref) => (0, reference_resolver_1.resolveReference)(ref, this.projectRoot));
        // Try to load session content
        let sessionContent = {};
        try {
            const session = this.loadSession(indexEntry.session_id);
            const sessionEntry = session.entries.find((e) => e.id === entryId);
            if (sessionEntry) {
                sessionContent = {
                    code_snippet: sessionEntry.code_snippet,
                    explanation: sessionEntry.explanation,
                    alternatives_considered: sessionEntry.alternatives_considered,
                    key_concepts: sessionEntry.key_concepts,
                };
            }
        }
        catch {
            // Session file missing or malformed — continue without content
        }
        return {
            ...indexEntry,
            ...sessionContent,
            reference_resolutions: referenceResolutions,
        };
    }
    /** Update fields on an entry in index.json and write back to disk */
    updateEntry(entryId, updates) {
        const index = this.loadIndex();
        const entryIndex = index.entries.findIndex((e) => e.id === entryId);
        if (entryIndex === -1) {
            throw new Error(`Entry not found: ${entryId}`);
        }
        // Only allow updating safe fields
        const safeKeys = new Set([
            'lifecycle',
            'title',
            'topics',
            'experience_level',
            'decision_type',
            'superseded_by',
            'external_docs',
            'cross_references',
        ]);
        const safeUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (safeKeys.has(key)) {
                safeUpdates[key] = value;
            }
        }
        // Also support the 'pinned' field as an additional property
        if ('pinned' in updates) {
            safeUpdates['pinned'] = updates['pinned'];
        }
        const updatedEntry = { ...index.entries[entryIndex], ...safeUpdates };
        index.entries[entryIndex] = updatedEntry;
        // Write back to disk
        const indexPath = path.join(this.decodieDir, 'index.json');
        try {
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
        }
        catch (err) {
            throw new Error(`Failed to write index.json: ${err.message}`);
        }
        // Invalidate cache so next read picks up changes
        this.cachedIndex = index;
        return updatedEntry;
    }
    /** Compute summary statistics */
    getStats() {
        let index;
        try {
            index = this.loadIndex();
        }
        catch {
            return {
                total_entries: 0,
                active: 0,
                archived: 0,
                superseded: 0,
                stale_references: 0,
                sessions: 0,
                last_updated: null,
            };
        }
        const entries = index.entries;
        const active = entries.filter((e) => e.lifecycle === 'active').length;
        const archived = entries.filter((e) => e.lifecycle === 'archived').length;
        const superseded = entries.filter((e) => e.lifecycle === 'superseded').length;
        // Resolve references to count stale ones
        const resolutions = (0, reference_resolver_1.resolveAllReferences)(entries, this.projectRoot);
        let staleCount = 0;
        for (const [, refs] of resolutions) {
            for (const r of refs) {
                if (r.status === 'stale')
                    staleCount++;
            }
        }
        // Unique sessions
        const sessionIds = new Set(entries.map((e) => e.session_id));
        // Most recent timestamp
        const timestamps = entries
            .map((e) => e.timestamp)
            .filter(Boolean)
            .sort();
        const lastUpdated = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
        return {
            total_entries: entries.length,
            active,
            archived,
            superseded,
            stale_references: staleCount,
            sessions: sessionIds.size,
            last_updated: lastUpdated,
        };
    }
}
exports.DataParser = DataParser;
//# sourceMappingURL=parser.js.map