import { BrowserWindow, Notification, NotificationConstructorOptions, powerMonitor } from 'electron';
import { Task, AppSettings } from '../../src/types';
import { StoreService } from './store';
import { LoggerService } from './logger';

export class ReminderService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private store: StoreService;
  private logger: LoggerService;
  private mainWindow: BrowserWindow | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(store: StoreService, logger: LoggerService) {
    this.store = store;
    this.logger = logger;
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  /** Start the reminder system */
  async start(): Promise<void> {
    await this.refresh();

    // Check every 30 seconds for due reminders
    this.checkInterval = setInterval(() => this.checkReminders(), 30_000);

    // Handle system resume from sleep
    powerMonitor.on('resume', async () => {
      await this.logger.info('System resumed from sleep, checking missed reminders');
      await this.checkMissedReminders();
    });

    await this.logger.info('Reminder service started');
  }

  /** Stop all timers and the check interval */
  stop(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /** Refresh: reload all tasks with reminders and schedule them */
  async refresh(): Promise<void> {
    const dates = await this.store.getAvailableDates();
    const settings = await this.store.getSettings();

    // Clear existing timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Schedule reminders for all tasks across all dates
    for (const date of dates) {
      const daily = await this.store.getTasksByDate(date);
      for (const task of daily.tasks) {
        if (
          task.isReminderEnabled &&
          task.remindAt &&
          (task.reminderStatus === 'pending' || task.reminderStatus === 'snoozed')
        ) {
          this.scheduleReminder(task, settings);
        }
      }
    }
  }

  /** Schedule a single reminder */
  private scheduleReminder(task: Task, settings: AppSettings): void {
    if (!task.remindAt) return;

    const remindTime = new Date(task.remindAt).getTime();
    const now = Date.now();
    const delay = remindTime - now;

    if (delay <= 0) {
      // Already past due — trigger immediately
      this.triggerReminder(task, settings);
      return;
    }

    // Cap at 24 hours to avoid overflow; the checkInterval will re-check
    const cappedDelay = Math.min(delay, 24 * 60 * 60 * 1000);

    const timer = setTimeout(() => {
      this.triggerReminder(task, settings);
      this.timers.delete(task.id);
    }, cappedDelay);

    this.timers.set(task.id, timer);
  }

  /** Trigger a reminder notification */
  private async triggerReminder(task: Task, settings: AppSettings): Promise<void> {
    await this.logger.info(`Reminder triggered: ${task.title}`);

    // Show desktop notification (no actions - they are unreliable on Windows)
    try {
      const notification = new Notification({
        title: `提醒: ${task.title}`,
        body: task.content || '任务时间到了',
        silent: !settings.soundEnabled,
      });

      notification.on('click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send('reminder:triggered', task);
        }
      });

      notification.show();
    } catch (err) {
      await this.logger.error('Failed to show notification', err);
      // Fallback: bring window to front as alert
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.webContents.send('reminder:triggered', task);
      }
    }

    // Update task reminder status
    try {
      const daily = await this.store.getTasksByDate(task.taskDate);
      const t = daily.tasks.find((x) => x.id === task.id);
      if (t) {
        t.reminderStatus = 'triggered';
        t.updatedAt = new Date().toISOString();
        await this.store.saveTasksByDate(daily);
      }
    } catch (err) {
      await this.logger.error('Failed to update reminder status', err);
    }

    // Notify renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('reminder:triggered', task);
    }
  }

  /** Snooze a reminder by N minutes */
  async snoozeReminder(taskId: string, taskDate: string, minutes: number): Promise<void> {
    await this.logger.info(`Snoozing task ${taskId} for ${minutes} minutes`);

    const daily = await this.store.getTasksByDate(taskDate);
    const task = daily.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    task.remindAt = snoozeUntil.toISOString();
    task.reminderStatus = 'snoozed';
    task.updatedAt = new Date().toISOString();
    await this.store.saveTasksByDate(daily);

    // Schedule the new reminder
    const settings = await this.store.getSettings();
    this.scheduleReminder(task, settings);
  }

  /** Check for reminders that are now due */
  private async checkReminders(): Promise<void> {
    const dates = await this.store.getAvailableDates();
    const settings = await this.store.getSettings();
    const now = Date.now();

    for (const date of dates) {
      const daily = await this.store.getTasksByDate(date);
      for (const task of daily.tasks) {
        if (
          task.isReminderEnabled &&
          task.remindAt &&
          (task.reminderStatus === 'pending' || task.reminderStatus === 'snoozed') &&
          new Date(task.remindAt).getTime() <= now
        ) {
          await this.triggerReminder(task, settings);
        }
      }
    }
  }

  /** Check for missed reminders after system resume */
  private async checkMissedReminders(): Promise<void> {
    const dates = await this.store.getAvailableDates();
    const settings = await this.store.getSettings();
    const now = Date.now();

    for (const date of dates) {
      const daily = await this.store.getTasksByDate(date);
      for (const task of daily.tasks) {
        if (
          task.isReminderEnabled &&
          task.remindAt &&
          (task.reminderStatus === 'pending' || task.reminderStatus === 'snoozed') &&
          new Date(task.remindAt).getTime() <= now
        ) {
          await this.logger.info(`Catching up missed reminder: ${task.title}`);
          await this.triggerReminder(task, settings);
        }
      }
    }
  }

}
