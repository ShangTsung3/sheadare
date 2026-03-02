import { DISCOVER_INTERVAL_MS, REFRESH_INTERVAL_MS } from '../config.js';
import { runDiscoverJob } from './discover-job.js';
import { runRefreshJob } from './refresh-job.js';

let discoverTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  console.log('[Scheduler] Starting job scheduler');
  console.log(`[Scheduler] Discover interval: ${DISCOVER_INTERVAL_MS / 1000 / 60 / 60}h`);
  console.log(`[Scheduler] Refresh interval: ${REFRESH_INTERVAL_MS / 1000 / 60 / 60}h`);

  // Run discover once on start (after a short delay)
  setTimeout(() => {
    runDiscoverJob().catch((e) => console.error('[Scheduler] Discover error:', e));
  }, 5000);

  // Schedule recurring jobs
  discoverTimer = setInterval(() => {
    runDiscoverJob().catch((e) => console.error('[Scheduler] Discover error:', e));
  }, DISCOVER_INTERVAL_MS);

  refreshTimer = setInterval(() => {
    runRefreshJob().catch((e) => console.error('[Scheduler] Refresh error:', e));
  }, REFRESH_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (discoverTimer) {
    clearInterval(discoverTimer);
    discoverTimer = null;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  console.log('[Scheduler] Stopped');
}
