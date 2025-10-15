import { describe, it, expect } from 'vitest';
import { parseModelJson, extractFirstJson } from '../src/lib/ai-output';

describe('ai-output parsing', () => {
  it('extracts JSON from fenced codeblocks', () => {
    const input = "Some text\n```json\n{\"a\":1, \"b\": [1,2,3]}\n```\nmore text";
    const extracted = extractFirstJson(input);
    expect(extracted).toBe('{"a":1, "b": [1,2,3]}');
  });

  it('parseModelJson returns object', () => {
    const s = 'prefix ```json {"description":"ok","healthScore":90,"suggestions":["s1"]} ``` suffix';
    const parsed = parseModelJson(s) as unknown;
    expect(typeof parsed === 'object' && parsed !== null).toBe(true);
    const rec = parsed as { description?: string; healthScore?: number };
    expect(rec.description).toBe('ok');
    expect(rec.healthScore).toBe(90);
  });
});
