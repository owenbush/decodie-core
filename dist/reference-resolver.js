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
exports.resolveReference = resolveReference;
exports.resolveAllReferences = resolveAllReferences;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '.decodie',
    '.next', '.nuxt', 'coverage', '.cache', '__pycache__',
]);
function computeAnchorHash(anchor) {
    return crypto.createHash('sha256').update(anchor).digest('hex').slice(0, 8);
}
function stripWhitespace(s) {
    return s.replace(/\s+/g, '');
}
/**
 * Extract a likely function/class name from an anchor string.
 * Looks for common patterns like `function foo`, `class Foo`, `const foo =`, etc.
 */
function extractIdentifier(anchor) {
    // function/class/const/let/var/export declarations
    const match = anchor.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s+|class\s+|const\s+|let\s+|var\s+)(\w+)/);
    if (match)
        return match[1];
    // Method definition: `methodName(`
    const methodMatch = anchor.match(/^(\w+)\s*\(/);
    if (methodMatch)
        return methodMatch[1];
    return null;
}
/**
 * Collect all files with a given extension from a project root,
 * skipping directories in SKIP_DIRS.
 */
function collectFiles(dir, ext, results = []) {
    let dirEntries;
    try {
        dirEntries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return results;
    }
    for (const entry of dirEntries) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                collectFiles(path.join(dir, entry.name), ext, results);
            }
        }
        else if (entry.isFile() && entry.name.endsWith(ext)) {
            results.push(path.join(dir, entry.name));
        }
    }
    return results;
}
/** Cache for file contents within a single resolution pass. */
class FileContentCache {
    constructor() {
        this.cache = new Map();
    }
    read(filePath) {
        if (this.cache.has(filePath)) {
            return this.cache.get(filePath);
        }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.cache.set(filePath, content);
            return content;
        }
        catch {
            this.cache.set(filePath, null);
            return null;
        }
    }
    clear() {
        this.cache.clear();
    }
}
/**
 * Search for an anchor in file content. Returns the 1-based line number or -1.
 */
function findAnchorLine(content, anchor) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(anchor)) {
            return i + 1;
        }
    }
    return -1;
}
/**
 * Fuzzy search: try to find a line that contains the anchor with whitespace differences,
 * or that contains the identifier extracted from the anchor.
 * Returns { line, confidence } or null.
 */
function fuzzyFindAnchor(content, anchor) {
    const lines = content.split('\n');
    const strippedAnchor = stripWhitespace(anchor);
    // Pass 1: whitespace-insensitive match
    for (let i = 0; i < lines.length; i++) {
        if (stripWhitespace(lines[i]) === strippedAnchor) {
            return { line: i + 1, confidence: 0.9 };
        }
    }
    // Pass 2: substring match after stripping whitespace
    for (let i = 0; i < lines.length; i++) {
        const strippedLine = stripWhitespace(lines[i]);
        if (strippedLine.includes(strippedAnchor) || strippedAnchor.includes(strippedLine)) {
            if (strippedLine.length > 5) {
                return { line: i + 1, confidence: 0.7 };
            }
        }
    }
    // Pass 3: identifier match
    const identifier = extractIdentifier(anchor);
    if (identifier) {
        for (let i = 0; i < lines.length; i++) {
            // Match whole word
            const re = new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            if (re.test(lines[i])) {
                return { line: i + 1, confidence: 0.5 };
            }
        }
    }
    return null;
}
function resolveReference(ref, projectRoot, cache) {
    const ownCache = cache ?? new FileContentCache();
    const absolutePath = path.resolve(projectRoot, ref.file);
    // Step 1: Try exact match in the referenced file
    const content = ownCache.read(absolutePath);
    if (content !== null) {
        const line = findAnchorLine(content, ref.anchor);
        if (line !== -1) {
            // Verify hash
            const hash = computeAnchorHash(ref.anchor);
            if (hash === ref.anchor_hash) {
                return {
                    reference: ref,
                    status: 'resolved',
                    resolved_file: ref.file,
                    resolved_line: line,
                    confidence: 1.0,
                    message: `Anchor found at ${ref.file}:${line}`,
                };
            }
            // Hash mismatch but text found — still resolved but note the hash difference
            return {
                reference: ref,
                status: 'resolved',
                resolved_file: ref.file,
                resolved_line: line,
                confidence: 0.95,
                message: `Anchor found at ${ref.file}:${line} (hash mismatch — anchor text may have been re-recorded)`,
            };
        }
        // Anchor text not found exactly in the right file — try fuzzy in same file
        const fuzzy = fuzzyFindAnchor(content, ref.anchor);
        if (fuzzy) {
            return {
                reference: ref,
                status: 'fuzzy',
                resolved_file: ref.file,
                resolved_line: fuzzy.line,
                confidence: fuzzy.confidence,
                message: `Fuzzy match in ${ref.file}:${fuzzy.line} (confidence: ${fuzzy.confidence})`,
            };
        }
    }
    // Step 2: File doesn't exist or anchor not found — search other files (drifted check)
    const ext = path.extname(ref.file);
    if (ext) {
        const candidates = collectFiles(projectRoot, ext);
        for (const candidate of candidates) {
            if (candidate === absolutePath)
                continue;
            const candidateContent = ownCache.read(candidate);
            if (candidateContent === null)
                continue;
            const line = findAnchorLine(candidateContent, ref.anchor);
            if (line !== -1) {
                const relPath = path.relative(projectRoot, candidate);
                return {
                    reference: ref,
                    status: 'drifted',
                    resolved_file: relPath,
                    resolved_line: line,
                    confidence: 0.8,
                    message: `Anchor moved from ${ref.file} to ${relPath}:${line}`,
                };
            }
        }
        // Step 3: Try fuzzy in other files
        for (const candidate of candidates) {
            if (candidate === absolutePath)
                continue;
            const candidateContent = ownCache.read(candidate);
            if (candidateContent === null)
                continue;
            const fuzzy = fuzzyFindAnchor(candidateContent, ref.anchor);
            if (fuzzy && fuzzy.confidence >= 0.5) {
                const relPath = path.relative(projectRoot, candidate);
                return {
                    reference: ref,
                    status: 'fuzzy',
                    resolved_file: relPath,
                    resolved_line: fuzzy.line,
                    confidence: fuzzy.confidence * 0.8, // Reduce confidence since it's a different file
                    message: `Possible fuzzy match in ${relPath}:${fuzzy.line} (confidence: ${(fuzzy.confidence * 0.8).toFixed(2)})`,
                };
            }
        }
    }
    // Step 4: Nothing found
    const fileExists = content !== null;
    return {
        reference: ref,
        status: 'stale',
        confidence: 0,
        message: fileExists
            ? `Anchor not found in ${ref.file} or any other ${ext} files`
            : `File ${ref.file} does not exist and anchor not found elsewhere`,
    };
}
function resolveAllReferences(entries, projectRoot) {
    const cache = new FileContentCache();
    const results = new Map();
    for (const entry of entries) {
        const resolutions = [];
        for (const ref of entry.references) {
            resolutions.push(resolveReference(ref, projectRoot, cache));
        }
        results.set(entry.id, resolutions);
    }
    cache.clear();
    return results;
}
//# sourceMappingURL=reference-resolver.js.map