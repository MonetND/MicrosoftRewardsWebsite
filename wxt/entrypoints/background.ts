import { defineBackground } from '#imports';
import { browser } from 'wxt/browser';
import { handleInstallOrUpdate, handleStartup, runRewards } from './background/dailySchedule';
import { handleAlarmStep, stopSearches, watchSearchesToggle } from './background/searchRunner';
import { isCleanupAlarm, sweepStaleTabs } from './background/tabCleanup';

export default defineBackground(() => {
    browser.runtime.onInstalled.addListener(handleInstallOrUpdate);
    browser.runtime.onStartup.addListener(handleStartup);
    watchSearchesToggle();
    browser.runtime.onMessage.addListener((request: { action?: string }) => {
        if (request.action === 'popup') void runRewards();
        else if (request.action === 'stop') void stopSearches();
    });
    // Registered here, at the worker's top level, so the browser wakes a
    // torn-down service worker for it — the only kind of timer that survives.
    browser.alarms.onAlarm.addListener((alarm) => {
        if (isCleanupAlarm(alarm.name)) void sweepStaleTabs();
        else void handleAlarmStep(alarm);
    });
});
