import { initHabitReminderCron } from './habit-reminder';

/**
 * Initialize all cron jobs
 */
export function initCronJobs(): void {
  console.log('[CRON] Initializing cron jobs...');

  // Habit reminder at 9:00 PM daily
  initHabitReminderCron();

  console.log('[CRON] All cron jobs initialized');
}
