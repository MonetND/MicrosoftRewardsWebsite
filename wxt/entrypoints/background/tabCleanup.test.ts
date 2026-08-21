// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { clearTrackedTabs, isCleanupAlarm, sweepStaleTabs, trackTab, untrackTab } from './tabCleanup';

const CLEANUP_ALARM = 'closeStaleTabs';

async function openTab(id: number): Promise<void> {
  await fakeBrowser.tabs.create({ url: `https://example.com/${id}` });
}

async function openTabIds(): Promise<number[]> {
  return (await fakeBrowser.tabs.query({})).map((tab) => tab.id!);
}

describe('tabCleanup', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('arms the sweep alarm as soon as a tab is tracked', async () => {
    await trackTab(1, 5000);

    expect(await fakeBrowser.alarms.get(CLEANUP_ALARM)).toBeDefined();
  });

  // The precise close runs on a setTimeout, which an MV3 service worker does not
  // keep alive. This sweep is what actually closes the tab when that timer is
  // lost, so a run no longer leaves Bing tabs piled up behind it.
  it('closes a tracked tab once its deadline has passed', async () => {
    await openTab(1);
    const [tabId] = await openTabIds();
    await trackTab(tabId, 5000);

    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));
    await sweepStaleTabs();

    expect(await openTabIds()).not.toContain(tabId);
  });

  it('leaves a tracked tab alone while its deadline is in the future', async () => {
    await openTab(1);
    const [tabId] = await openTabIds();
    await trackTab(tabId, 60000);

    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));
    await sweepStaleTabs();

    expect(await openTabIds()).toContain(tabId);
    expect(await fakeBrowser.alarms.get(CLEANUP_ALARM)).toBeDefined();
  });

  it('stops sweeping once nothing is tracked any more', async () => {
    await openTab(1);
    const [tabId] = await openTabIds();
    await trackTab(tabId, 5000);

    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));
    await sweepStaleTabs();

    expect(await fakeBrowser.alarms.get(CLEANUP_ALARM)).toBeUndefined();
  });

  it('does not close a tab that was untracked after closing itself on time', async () => {
    await openTab(1);
    const [tabId] = await openTabIds();
    await trackTab(tabId, 5000);
    await untrackTab(tabId);

    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));
    await sweepStaleTabs();

    expect(await openTabIds()).toContain(tabId);
    expect(await fakeBrowser.alarms.get(CLEANUP_ALARM)).toBeUndefined();
  });

  it('survives a tab that is already gone', async () => {
    await trackTab(4242, 5000);

    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));

    await expect(sweepStaleTabs()).resolves.toBeUndefined();
  });

  // Tab ids do not survive a browser restart, so anything carried over from the
  // previous session points at tabs that no longer exist.
  it('drops the whole registry on request', async () => {
    await openTab(1);
    const [tabId] = await openTabIds();
    await trackTab(tabId, 5000);

    await clearTrackedTabs();
    vi.setSystemTime(new Date('2026-08-21T10:00:06Z'));
    await sweepStaleTabs();

    expect(await openTabIds()).toContain(tabId);
    expect(await fakeBrowser.alarms.get(CLEANUP_ALARM)).toBeUndefined();
  });

  it('recognises only its own alarm', () => {
    expect(isCleanupAlarm(CLEANUP_ALARM)).toBe(true);
    expect(isCleanupAlarm('openTabAlarm')).toBe(false);
  });
});
