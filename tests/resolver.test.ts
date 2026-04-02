import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { resolveReference } from '../src/reference-resolver';
import type { Reference } from '../src/types';

const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'sample-project');

describe('resolveReference()', () => {
  it('returns resolved status when anchor exists exactly in the referenced file', () => {
    const ref: Reference = {
      file: 'src/types.ts',
      anchor: "export type Status = 'active' | 'archived'",
      anchor_hash: '3917c83a',
    };

    const result = resolveReference(ref, FIXTURE_ROOT);

    expect(result.status).toBe('resolved');
    expect(result.confidence).toBe(1.0);
    expect(result.resolved_file).toBe('src/types.ts');
    expect(result.resolved_line).toBe(1);
  });

  it('returns stale status when referenced file does not exist', () => {
    const ref: Reference = {
      file: 'src/deleted-file.ts',
      anchor: 'function oldFunction() {',
      anchor_hash: '6ee079eb',
    };

    const result = resolveReference(ref, FIXTURE_ROOT);

    expect(result.status).toBe('stale');
    expect(result.confidence).toBe(0);
    expect(result.message).toMatch(/does not exist/);
  });

  it('returns fuzzy status when anchor has whitespace differences', () => {
    // The actual file has "export class UserRepository {"
    // We provide an anchor with extra whitespace
    const ref: Reference = {
      file: 'src/repo.ts',
      anchor: 'export  class  UserRepository  {',
      anchor_hash: 'ffffffff',
    };

    const result = resolveReference(ref, FIXTURE_ROOT);

    expect(result.status).toBe('fuzzy');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.resolved_file).toBe('src/repo.ts');
    expect(result.resolved_line).toBe(1);
  });
});
