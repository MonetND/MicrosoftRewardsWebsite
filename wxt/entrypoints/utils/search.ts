import { getRndInteger } from '@/entrypoints/utils/helpers';
import { SEARCH_LEAD_INS, SEARCH_TOPICS, SEARCH_TAILS } from '@/entrypoints/data/searchTerms';

const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';

// parseInt(undefined)/parseInt('abc') is NaN, and `NaN ?? x` keeps NaN
// (?? only catches null/undefined). This guards that original bug.
export function toInt(value: unknown, fallback: number): number {
    const n = parseInt(String(value), 10);
    return Number.isNaN(n) ? fallback : n;
}

function pick<T>(arr: T[]): T {
    return arr[getRndInteger(0, arr.length - 1)];
}

// Build a natural-looking search query from real words — "<lead-in> <topic>",
// "<topic> <tail>", or "<lead-in> <topic> <tail>" — so it reads like a normal
// search ("best headphones", "gardening for beginners", "cheap laptops on sale")
// with no random-character prefix or gibberish.
//
// The three-part shape is favoured 6:1:1 because it is where nearly all of the
// pool lives (lead-ins x topics x tails), and a repeated query earns no points:
// weighting it this way puts the effective pool in the tens of thousands instead
// of the ~4.5k either two-part shape can reach on its own.
export function buildSearchQuery(): string {
    const topic = pick(SEARCH_TOPICS);
    switch (getRndInteger(0, 7)) {
        case 0:
            return `${pick(SEARCH_LEAD_INS)} ${topic}`;
        case 1:
            return `${topic} ${pick(SEARCH_TAILS)}`;
        default:
            return `${pick(SEARCH_LEAD_INS)} ${topic} ${pick(SEARCH_TAILS)}`;
    }
}

export function buildSearchUrl(query: string): string {
    return `${BING_SEARCH_URL}${encodeURIComponent(query)}${BING_SEARCH_PARAMS}`;
}

// Fraction of the configured gap used as a symmetric random spread, so the time
// between searches varies (base ±50%) instead of being near-fixed — looks less
// robotic while still averaging the user's configured timeout. At the default
// 60s timeout this keeps every gap at or above MIN_DELAY_SECONDS without the
// clamp below having to bite.
const DELAY_JITTER_FRACTION = 0.5;

// Hard floor on the gap between searches. Chrome silently clamps any alarm under
// 30s in a packed build, so anything shorter is fiction there — and searches that
// do arrive in that fast a burst risk not being credited at all.
const MIN_DELAY_SECONDS = 30;

export function nextDelayMinutes(timeoutSeconds: number, jitterMs?: number): number {
    const baseMs = Math.max(timeoutSeconds, 1) * 1000;
    const spread = Math.round(baseMs * DELAY_JITTER_FRACTION);
    const jitter = jitterMs ?? getRndInteger(-spread, spread);
    return Math.max(baseMs + jitter, MIN_DELAY_SECONDS * 1000) / 60000;
}

// True while another search tab should open. Opening exactly `searches` tabs
// (fixes the original off-by-one that opened searches + 1).
export function shouldOpenMore(opened: number, searches: number): boolean {
    return opened < searches;
}
