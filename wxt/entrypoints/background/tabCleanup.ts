import { browser } from 'wxt/browser';
import { getStorageItem, setStorageItem } from '@/entrypoints/hooks/useStorage';
import { StorageValues } from '@/entrypoints/enums/storageValues';

// Tab ids the extension opened, each mapped to the wall-clock time by which it
// must be gone.
type TrackedTabs = Record<string, number>;

const REGISTRY_KEY = 'trackedTabs';
const CLEANUP_ALARM = 'closeStaleTabs';
// Chrome's floor for a repeating alarm. A tab whose in-memory timer was lost
// therefore closes within about a minute of its deadline instead of never.
const SWEEP_PERIOD_MINUTES = 1;

export function isCleanupAlarm(name: string): boolean {
    return name === CLEANUP_ALARM;
}

// Records a tab the extension opened so that it still gets closed when the
// setTimeout meant to close it never runs. That is the normal case in an MV3
// service worker: it is torn down after ~30s idle, taking pending timers and
// runtime-registered tab listeners with it, which is why search and daily-set
// tabs used to pile up. Alarms survive that teardown, so the sweep does not.
export async function trackTab(tabId: number, closeAfterMs: number): Promise<void> {
    const tracked = await readRegistry();
    await writeRegistry({ ...tracked, [tabId]: Date.now() + closeAfterMs });
    browser.alarms.create(CLEANUP_ALARM, { periodInMinutes: SWEEP_PERIOD_MINUTES });
}

// Called once a tab has closed on time, so the sweep has nothing left to do.
export async function untrackTab(tabId: number): Promise<void> {
    const tracked = await readRegistry();
    if (!(String(tabId) in tracked)) return;
    await saveRemaining(without(tracked, tabId));
}

export async function sweepStaleTabs(): Promise<void> {
    const entries = Object.entries(await readRegistry());
    const now = Date.now();
    const due = entries.filter(([, deadline]) => deadline <= now);
    const remaining = Object.fromEntries(entries.filter(([, deadline]) => deadline > now));

    await Promise.all(due.map(([tabId]) => closeTab(Number(tabId))));
    await saveRemaining(remaining);
}

// Tab ids do not survive a browser restart, so a registry carried over from the
// previous session points at tabs that no longer exist.
export async function clearTrackedTabs(): Promise<void> {
    await saveRemaining({});
}

async function readRegistry(): Promise<TrackedTabs> {
    return (await getStorageItem<TrackedTabs>(REGISTRY_KEY, StorageValues.LOCAL)) ?? {};
}

async function writeRegistry(tracked: TrackedTabs): Promise<void> {
    await setStorageItem(REGISTRY_KEY, tracked, StorageValues.LOCAL);
}

// Nothing tracked means nothing to sweep, so the alarm is dropped rather than
// waking the worker every minute for the rest of the session.
async function saveRemaining(tracked: TrackedTabs): Promise<void> {
    await writeRegistry(tracked);
    if (Object.keys(tracked).length === 0) await browser.alarms.clear(CLEANUP_ALARM);
}

function without(tracked: TrackedTabs, tabId: number): TrackedTabs {
    return Object.fromEntries(Object.entries(tracked).filter(([id]) => id !== String(tabId)));
}

async function closeTab(tabId: number): Promise<void> {
    try {
        await browser.tabs.get(tabId);
        await browser.tabs.remove(tabId);
    } catch {
        // Already gone — closed by its own timer, or by the user.
    }
}
