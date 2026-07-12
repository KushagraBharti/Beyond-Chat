import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'bun:test';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import { buildCacheKey, readCache, writeCache } from './cache.js';

const DEFAULT_CACHE_DIR = resolve('.dexter/cache');
const previousCacheDir = process.env.DEXTER_CACHE_DIR;
let testRoot = '';
let testCacheDir = '';
let defaultCacheFingerprint = '';

function directoryFingerprint(root: string): string {
  const hash = createHash('sha256');
  if (!existsSync(root)) return hash.update('missing').digest('hex');
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = join(directory, entry.name);
      const rel = relative(root, absolute).replaceAll('\\', '/');
      hash.update(rel);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) hash.update(readFileSync(absolute));
    }
  };
  visit(root);
  return hash.digest('hex');
}

beforeAll(() => {
  defaultCacheFingerprint = directoryFingerprint(DEFAULT_CACHE_DIR);
});

afterAll(() => {
  if (previousCacheDir === undefined) delete process.env.DEXTER_CACHE_DIR;
  else process.env.DEXTER_CACHE_DIR = previousCacheDir;
  expect(directoryFingerprint(DEFAULT_CACHE_DIR)).toBe(defaultCacheFingerprint);
});

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

describe('buildCacheKey', () => {
  test('produces the same key regardless of param insertion order', () => {
    const paramsA = { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31', interval: 'day', interval_multiplier: 1 };
    const paramsB = { interval_multiplier: 1, end_date: '2024-12-31', ticker: 'AAPL', interval: 'day', start_date: '2024-01-01' };
    expect(buildCacheKey('/prices/', paramsA)).toBe(buildCacheKey('/prices/', paramsB));
  });

  test('sorts array values without mutating the original', () => {
    const items = ['Item-7', 'Item-1', 'Item-1A'];
    const original = [...items];
    buildCacheKey('/filings/items/', { ticker: 'AAPL', item: items });
    expect(items).toEqual(original); // not mutated
  });

  test('produces different keys for different params', () => {
    const keyA = buildCacheKey('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-06-30' });
    const keyB = buildCacheKey('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(keyA).not.toBe(keyB);
  });

  test('includes ticker prefix for readable filenames', () => {
    const key = buildCacheKey('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(key).toMatch(/^prices\/AAPL_/);
    expect(key).toMatch(/\.json$/);
  });

  test('omits undefined and null params', () => {
    const keyA = buildCacheKey('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31', limit: undefined });
    const keyB = buildCacheKey('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(keyA).toBe(keyB);
  });
});

// ---------------------------------------------------------------------------
// readCache / writeCache round-trip
// ---------------------------------------------------------------------------

describe('readCache / writeCache', () => {
  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'beyond-dexter-cache-'));
    testCacheDir = join(testRoot, 'cache');
    process.env.DEXTER_CACHE_DIR = testCacheDir;
  });

  afterEach(() => {
    const resolvedRoot = resolve(testRoot);
    const relativeToTemp = relative(resolve(tmpdir()), resolvedRoot);
    if (!relativeToTemp || relativeToTemp === '..' || relativeToTemp.startsWith(`..${sep}`) || isAbsolute(relativeToTemp)) {
      throw new Error(`Refusing to remove cache test directory outside the OS temp root: ${resolvedRoot}`);
    }
    rmSync(resolvedRoot, { recursive: true, force: true });
    testRoot = '';
    testCacheDir = '';
  });

  test('round-trips data through write then read', () => {
    const endpoint = '/prices/';
    const params = { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31', interval: 'day', interval_multiplier: 1 };
    const data = { prices: [{ open: 100, close: 105, high: 106, low: 99 }] };
    const url = 'https://api.financialdatasets.ai/prices/?ticker=AAPL&start_date=2024-01-01&end_date=2024-12-31';

    writeCache(endpoint, params, data, url);
    const cached = readCache(endpoint, params);

    expect(cached).not.toBeNull();
    expect(cached!.data).toEqual(data);
    expect(cached!.url).toBe(url);
  });

  test('returns null on cache miss (no file)', () => {
    const cached = readCache('/prices/', { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(cached).toBeNull();
  });

  test('returns null and removes file when cache entry is corrupted JSON', () => {
    const endpoint = '/prices/';
    const params = { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31', interval: 'day', interval_multiplier: 1 };

    const key = buildCacheKey(endpoint, params);
    const filepath = join(testCacheDir, key);
    const dir = join(testCacheDir, key.split('/')[0]!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filepath, '{ broken json!!!');

    const cached = readCache(endpoint, params);
    expect(cached).toBeNull();
    expect(existsSync(filepath)).toBe(false);
  });

  test('returns null and removes file when cache entry has invalid structure', () => {
    const endpoint = '/prices/';
    const params = { ticker: 'AAPL', start_date: '2024-01-01', end_date: '2024-12-31', interval: 'day', interval_multiplier: 1 };

    const key = buildCacheKey(endpoint, params);
    const filepath = join(testCacheDir, key);
    const dir = join(testCacheDir, key.split('/')[0]!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filepath, JSON.stringify({ wrong: 'shape' }));

    const cached = readCache(endpoint, params);
    expect(cached).toBeNull();
    expect(existsSync(filepath)).toBe(false);
  });
});
