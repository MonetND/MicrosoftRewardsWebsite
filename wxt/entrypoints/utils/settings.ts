// Single source of truth for setting defaults, used by install seeding,
// background reads (fallbacks), and the popup's useStorage defaults.
export const DEFAULTS = {
    active: true,
    autoDaily: true,
    accountLevel: 'member',
    timeout: 60,
    searches: 5,
    closeTime: 5,
    // When on, each search tab opens its first organic result after a short
    // random delay (without stealing focus); otherwise the tab just loads the SERP.
    // Off by default: navigating off the results page risks the search not being
    // credited, so this stays opt-in.
    openFirstResult: false,
} as const;

// Selecting an account level sets a sensible default number of daily searches
// (the user can still override the number manually).
export const LEVEL_SEARCHES: Record<string, number> = {
    member: 5,
    silver: 10,
    gold: 20,
};
