import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { DataParser } from '../src/parser';

const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'sample-project');

describe('DataParser', () => {
  let parser: DataParser;

  beforeEach(() => {
    parser = new DataParser(FIXTURE_ROOT);
  });

  describe('loadIndex()', () => {
    it('returns correct entries count and structure', () => {
      const index = parser.loadIndex();

      expect(index.version).toBe('1.0');
      expect(index.project).toBe('sample-project');
      expect(index.entries).toHaveLength(4);

      const first = index.entries[0];
      expect(first.id).toBe('entry-1000-aaa1');
      expect(first.title).toBe('Union types constrain domain values');
      expect(first.experience_level).toBe('intermediate');
      expect(first.topics).toEqual(['typescript', 'type-system']);
      expect(first.decision_type).toBe('pattern');
      expect(first.lifecycle).toBe('active');
      expect(first.references).toHaveLength(1);
      expect(first.references[0].file).toBe('src/types.ts');
    });
  });

  describe('loadSession()', () => {
    it('returns session with correct entries', () => {
      const session = parser.loadSession('analyze-2026-04-01-001');

      expect(session.session_id).toBe('analyze-2026-04-01-001');
      expect(session.summary).toBe('Test session');
      expect(session.entries).toHaveLength(3);
      expect(session.entries[0].id).toBe('entry-1000-aaa1');
      expect(session.entries[0].explanation).toBe(
        'Union literal types restrict a value to specific strings.'
      );
    });
  });

  describe('getEntryWithContent()', () => {
    it('merges index metadata with session content', () => {
      const full = parser.getEntryWithContent('entry-1000-aaa1');

      // Index fields
      expect(full.id).toBe('entry-1000-aaa1');
      expect(full.title).toBe('Union types constrain domain values');
      expect(full.topics).toEqual(['typescript', 'type-system']);

      // Session content fields
      expect(full.code_snippet).toBe("export type Status = 'active' | 'archived'");
      expect(full.explanation).toBe(
        'Union literal types restrict a value to specific strings.'
      );
      expect(full.alternatives_considered).toBe(
        'Could use an enum, but string literals are simpler.'
      );
      expect(full.key_concepts).toEqual(['Union types', 'Literal types']);

      // Reference resolutions should be present
      expect(full.reference_resolutions).toHaveLength(1);
    });

    it('returns breakdowns, issues, improvements for explain entries', () => {
      const entry = parser.getEntryWithContent('entry-explain-test-001');

      expect(entry.breakdowns).toBeDefined();
      expect(entry.breakdowns).toHaveLength(1);
      expect(entry.breakdowns![0].code_excerpt).toBe('return bar(42);');
      expect(entry.breakdowns![0].explanation).toBe(
        'Delegates to the bar function with the literal 42.'
      );
      expect(entry.breakdowns![0].pattern).toBe('delegation');

      expect(entry.issues).toBeDefined();
      expect(entry.issues).toHaveLength(1);
      expect(entry.issues![0].severity).toBe('warning');
      expect(entry.issues![0].description).toBe(
        'Magic number 42 is used without explanation'
      );
      expect(entry.issues![0].suggestion).toBe('Extract to a named constant');

      expect(entry.improvements).toBeDefined();
      expect(entry.improvements).toHaveLength(1);
      expect(entry.improvements![0].description).toBe('Add JSDoc comment');
      expect(entry.improvements![0].rationale).toBe(
        'Improves IDE hints and code discoverability'
      );
    });

    it('returns undefined breakdowns/issues/improvements for existing entries', () => {
      const entry = parser.getEntryWithContent('entry-1000-aaa1');

      expect(entry.breakdowns).toBeUndefined();
      expect(entry.issues).toBeUndefined();
      expect(entry.improvements).toBeUndefined();
    });
  });

  describe('loadConfig()', () => {
    it('returns defaults when no config.json exists', () => {
      const config = parser.loadConfig();

      expect(config.user_experience_level).toBe('intermediate');
      expect(config.preferred_topics).toEqual([]);
      expect(config.archival_threshold_days).toBe(90);
      expect(config.auto_suggest_archival).toBe(true);
      expect(config.show_external_docs).toBe(true);
      expect(config.default_view).toBe('active');
      expect(config.sessions_visible_by_default).toBe(5);
      expect(config.api_key).toBeNull();
      expect(config.api_model).toBeNull();
    });
  });

  describe('invalidateCache()', () => {
    it('forces a fresh read from disk', () => {
      const index1 = parser.loadIndex();
      parser.invalidateCache();
      const index2 = parser.loadIndex();

      // Both reads should return the same data
      expect(index2.entries).toHaveLength(index1.entries.length);
      expect(index2.project).toBe(index1.project);

      // They should be separate objects (not the cached reference)
      expect(index2).not.toBe(index1);
    });
  });

  describe('error handling', () => {
    it('throws when index file is missing', () => {
      const badParser = new DataParser('/tmp/nonexistent-project');

      expect(() => badParser.loadIndex()).toThrow(/Index file not found/);
    });
  });
});
