import cron from 'node-cron';
import { Habit, PushSubscription, IHabit } from '../models';
import { sendPushToUser } from '../routes/push.routes';

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Check if a habit was completed today
 */
function isCompletedToday(habit: IHabit): boolean {
  const today = getTodayDateString();
  return (
    habit.completions?.some((c: { date: string; completed: boolean }) => {
      const completionDate = new Date(c.date).toISOString().split('T')[0];
      return completionDate === today;
    }) || false
  );
}

/**
 * Send habit reminder to a user
 */
async function sendHabitReminder(
  userId: string,
  pendingHabits: { name: string; color: string }[]
): Promise<void> {
  try {
    const habitCount = pendingHabits.length;
    const habitNames = pendingHabits
      .slice(0, 3)
      .map(h => h.name)
      .join(', ');
    const moreText = habitCount > 3 ? ` and ${habitCount - 3} more` : '';

    await sendPushToUser(userId, {
      title: "🔥 Don't break your streak!",
      body: `You have ${habitCount} habit${habitCount > 1 ? 's' : ''} pending: ${habitNames}${moreText}`,
      icon: '/icon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: 'habit-reminder',
      data: { url: '/streaks' },
      actions: [
        { action: 'view', title: 'Complete Now' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: true,
    });

    console.log(
      `[CRON] Sent habit reminder to user ${userId} for ${habitCount} habits`
    );
  } catch (error) {
    console.error(`[CRON] Failed to send reminder to user ${userId}:`, error);
  }
}

/**
 * Process a single user's habit reminders
 */
async function processUserReminder(userId: string): Promise<void> {
  try {
    // Get user's active habits
    const habits = await Habit.find({
      user: userId,
      isArchived: { $ne: true },
    });

    if (habits.length === 0) {
      return;
    }

    // Find habits not completed today
    const pendingHabits = habits.filter(habit => !isCompletedToday(habit));

    if (pendingHabits.length > 0) {
      await sendHabitReminder(
        userId,
        pendingHabits.map(h => ({
          name: h.name,
          color: h.color || '#f97316',
        }))
      );
    }
  } catch (error) {
    console.error(`[CRON] Error processing user ${userId}:`, error);
  }
}

/**
 * Main cron job function - runs at 9:00 PM every day
 */
async function sendHabitReminders(): Promise<void> {
  console.log('[CRON] Starting habit reminder job...');

  try {
    // Get all users who have push subscriptions
    const usersWithPush = await PushSubscription.find({
      isActive: true,
    }).distinct('user');

    if (usersWithPush.length === 0) {
      console.log('[CRON] No users with active push subscriptions');
      return;
    }

    // Process all users in parallel
    await Promise.all(
      usersWithPush.map(userId => processUserReminder(userId.toString()))
    );

    console.log('[CRON] Habit reminder job completed');
  } catch (error) {
    console.error('[CRON] Habit reminder job failed:', error);
  }
}

/**
 * Initialize the habit reminder cron job
 * Runs every day at 9:00 PM (21:00)
 */
export function initHabitReminderCron(): void {
  // Cron expression: minute hour day month weekday
  // '0 21 * * *' = 9:00 PM every day
  cron.schedule(
    '0 21 * * *',
    () => {
      sendHabitReminders();
    },
    {
      timezone: 'Asia/Kolkata', // Adjust timezone as needed, or use user's timezone
    }
  );

  console.log('[CRON] Habit reminder scheduled for 9:00 PM daily');
}

// Export for testing
export { sendHabitReminders };
