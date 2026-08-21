import { describe, it, expect } from 'vitest';
import { toInt, buildSearchQuery, buildSearchUrl, nextDelayMinutes, shouldOpenMore } from './search';
import { SEARCH_LEAD_INS, SEARCH_TOPICS, SEARCH_TAILS } from '../data/searchTerms';

// Measures what the generator actually reaches, rather than trusting a formula
// over the word lists that could drift from the shapes it really emits.
function countDistinctQueries(samples: number): number {
  const seen = new Set<string>();
  for (let i = 0; i < samples; i++) seen.add(buildSearchQuery());
  return seen.size;
}

const VOCAB = new Set(
  [...SEARCH_LEAD_INS, ...SEARCH_TOPICS, ...SEARCH_TAILS].flatMap((phrase) => phrase.split(' '))
);

describe('toInt', () => {
  it('parses integer strings', () => {
    expect(toInt('5', 9)).toBe(5);
  });
  it('falls back on NaN / null / undefined (the parseInt ?? bug)', () => {
    expect(toInt('abc', 9)).toBe(9);
    expect(toInt(undefined, 9)).toBe(9);
    expect(toInt(null, 9)).toBe(9);
  });
  it('passes through numbers', () => {
    expect(toInt(7, 9)).toBe(7);
  });
});

describe('buildSearchQuery', () => {
  it('builds natural multi-word queries from real words, no random prefix', () => {
    for (let i = 0; i < 300; i++) {
      const q = buildSearchQuery();
      // Real words separated by single spaces, starting with a letter/digit —
      // never a lone random character or gibberish string.
      expect(q).toMatch(/^[a-z0-9]+( [a-z0-9]+)+$/);
      for (const token of q.split(' ')) {
        expect(VOCAB.has(token)).toBe(true);
      }
    }
  });

  it('varies between calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(buildSearchQuery());
    expect(seen.size).toBeGreaterThan(20);
  });

  // Microsoft does not credit a query it has already seen today, so the pool has
  // to be large enough that a heavy day (90+ searches) rarely repeats itself.
  it('can build at least 10k distinct queries', () => {
    expect(countDistinctQueries(60_000)).toBeGreaterThanOrEqual(10_000);
  });

  it('rarely repeats a query across a heavy day of searches', () => {
    const daysWithRepeat = Array.from({ length: 2000 }, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 90; i++) seen.add(buildSearchQuery());
      return seen.size < 90;
    }).filter(Boolean).length;
    expect(daysWithRepeat / 2000).toBeLessThan(0.1);
  });
});

describe('buildSearchUrl', () => {
  it('url-encodes the query into the Bing search URL', () => {
    expect(buildSearchUrl('best coffee')).toBe(
      'https://www.bing.com/search?q=best%20coffee&qs=n&form=QBLH&sp=-1&pq='
    );
  });
});

describe('nextDelayMinutes', () => {
  it('returns the base timeout in minutes when jitter is zero', () => {
    expect(nextDelayMinutes(60, 0)).toBeCloseTo(1, 5);
  });

  // Regression: the spread used to reach down to 15s at the default 60s timeout.
  // Chrome silently clamps any sub-30s alarm in a packed build, and searches
  // arriving in that fast a burst risk not being credited at all.
  it('never schedules an alarm below the 30s platform minimum', () => {
    for (const timeout of [0, 1, 5, 20, 30, 60, 300]) {
      for (let i = 0; i < 500; i++) {
        expect(nextDelayMinutes(timeout)).toBeGreaterThanOrEqual(0.5 - 1e-9);
      }
    }
  });

  it('spreads the delay ±50% around the base and varies between calls', () => {
    const values = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = nextDelayMinutes(60);
      values.add(v);
      // base 60s → [30s, 90s] → [0.5, 1.5] minutes
      expect(v).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(v).toBeLessThanOrEqual(1.5 + 1e-9);
    }
    expect(values.size).toBeGreaterThan(50);
  });

  it('keeps the configured timeout as the average', () => {
    const mean = Array.from({ length: 20000 }, () => nextDelayMinutes(120)).reduce((a, b) => a + b, 0) / 20000;
    expect(mean).toBeCloseTo(2, 1);
  });
});

describe('shouldOpenMore', () => {
  it('is true while fewer than `searches` tabs have opened', () => {
    expect(shouldOpenMore(1, 12)).toBe(true);
  });
  it('is false once `searches` tabs have opened (exact-count fix)', () => {
    expect(shouldOpenMore(12, 12)).toBe(false);
    expect(shouldOpenMore(1, 1)).toBe(false);
  });
});
