import { browser } from 'wxt/browser';
import { storage } from '#imports';
import { getRndInteger } from '@/entrypoints/utils/helpers';
import { buildSearchQuery, buildSearchUrl, nextDelayMinutes, shouldOpenMore, toInt } from '@/entrypoints/utils/search';
import { getStorageItem, getStorageItems, setStorageItem, setStorageItems } from '@/entrypoints/hooks/useStorage';
import { StorageValues } from '@/entrypoints/enums/storageValues';
import { DEFAULTS } from '@/entrypoints/utils/settings';
import { clearBadge, setSearchCountBadge } from '@/entrypoints/utils/browserAction';
import { trackTab, untrackTab } from './tabCleanup';

const ALARM_NAME = 'openTabAlarm';
// A search tab closes `closeTime` after it finishes loading, so the durable
// cleanup deadline has to allow for the load on top of that — a slow page must
// not be swept away before its search has had a chance to register.
const SEARCH_TAB_LOAD_ALLOWANCE_MS = 60000;

// Opens tab #1 immediately (currentSearch = 1), then schedules the rest via alarm.
export async function startSearches(searchTimeout: number, searches: number, closeTimeSeconds: number): Promise<void> {
    await openSearchTab(closeTimeSeconds * 1000);
    await recordProgress(1);
    if (shouldOpenMore(1, searches)) {
        browser.alarms.create(ALARM_NAME, { delayInMinutes: nextDelayMinutes(searchTimeout) });
    } else {
        await stopSearches();
    }
}

export async function handleAlarmStep(alarm: { name: string }): Promise<void> {
    if (alarm.name !== ALARM_NAME) return;
    const s = await getStorageItems(['searches', 'timeout', 'closeTime', 'currentSearch', 'active'], StorageValues.SYNC);
    const searches = toInt(s.searches, DEFAULTS.searches);
    const searchTimeout = toInt(s.timeout, DEFAULTS.timeout);
    const closeTimeMs = toInt(s.closeTime, DEFAULTS.closeTime) * 1000;
    const opened = toInt(s.currentSearch, searches);
    const isSearchesEnabled = s.active ?? DEFAULTS.active;

    // Alarms outlive the setting that created them (they survive a browser
    // restart), so re-check the toggle every step: with "Daily searches" off,
    // a leftover alarm must not keep opening Bing tabs.
    if (!isSearchesEnabled || !shouldOpenMore(opened, searches)) {
        await stopSearches();
        return;
    }
    await openSearchTab(closeTimeMs);
    const nowOpened = opened + 1;
    await recordProgress(nowOpened);
    if (shouldOpenMore(nowOpened, searches)) {
        browser.alarms.create(ALARM_NAME, { delayInMinutes: nextDelayMinutes(searchTimeout) });
    } else {
        await stopSearches();
    }
}

export async function stopSearches(): Promise<void> {
    await setStorageItem('isSearching', false, StorageValues.SYNC);
    clearBadge();
    // Only this run's alarm: clearAll() also wiped the tab-cleanup sweep, which
    // left every tab the run had opened on screen for good.
    await browser.alarms.clear(ALARM_NAME);
}

// Turning "Daily searches" off has to stop a run that is already in flight —
// waiting for the next alarm would leave the popup claiming to be searching.
// Watching storage (rather than reacting to a popup message) also covers the
// toggle being synced from another device.
export function watchSearchesToggle(): void {
    storage.watch<boolean>('sync:active', (isEnabled) => {
        if (isEnabled === false) void stopSearches();
    });
}

// `currentSearch` is the number of search tabs opened in this run; the popup and
// the toolbar badge both read it, so every step must persist it — including the
// last one, or the popup would freeze one short of the total. `isSearching` is
// re-affirmed here (not only at the start) so a run that outlives a service
// worker restart still reports itself as running.
async function recordProgress(opened: number): Promise<void> {
    await setStorageItems({ currentSearch: opened, isSearching: true }, StorageValues.SYNC);
    setSearchCountBadge(opened);
}

// The marAuto marker tells the bing-result content script this tab was opened
// by the extension, so it may open the first organic result. It's only added
// when the user enabled "Open first result in search tabs"; manual Bing
// searches (and tabs opened with the option off) lack the marker and are left
// untouched.
async function openSearchTab(closeTimeMs: number): Promise<void> {
    const openFirstResult = await getStorageItem<boolean>('openFirstResult', StorageValues.SYNC);
    const query = buildSearchUrl(buildSearchQuery());
    const url = openFirstResult ? `${query}&marAuto=1` : query;
    await openAndClose(url, closeTimeMs + getRndInteger(0, 1000));
}

async function openAndClose(url: string, closeTimeMs: number): Promise<void> {
    const tab = await browser.tabs.create({ url, active: false });
    const tabId = tab.id!;
    // Backstop for the close below, whose timer and listener are both lost when
    // the service worker is torn down.
    await trackTab(tabId, closeTimeMs + SEARCH_TAB_LOAD_ALLOWANCE_MS);
    function listener(updatedId: number, changeInfo: { status?: string }): void {
        if (updatedId === tabId && changeInfo.status === 'complete') {
            browser.tabs.onUpdated.removeListener(listener);
            waitAndClose(tabId, closeTimeMs);
        }
    }
    browser.tabs.onUpdated.addListener(listener);
}

function waitAndClose(id: number, closeTimeMs: number): void {
    const timeout = closeTimeMs <= 0 ? 500 : closeTimeMs;
    setTimeout(() => void closeTab(id), Math.max(timeout - 500, 0) + getRndInteger(0, 1000));
}

async function closeTab(id: number): Promise<void> {
    await browser.tabs.get(id).then(() => browser.tabs.remove(id)).catch(() => {});
    await untrackTab(id);
}
