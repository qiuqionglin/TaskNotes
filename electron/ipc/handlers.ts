import { ipcMain, BrowserWindow, app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StoreService } from '../services/store';
import { GithubService } from '../services/github';
import { ReminderService } from '../services/reminder';
import { LoggerService } from '../services/logger';
import { Task, CreateTaskInput, DailyTaskFile } from '../../src/types';

export function registerIpcHandlers(
  store: StoreService,
  github: GithubService,
  reminder: ReminderService,
  logger: LoggerService,
  getMainWindow: () => BrowserWindow | null
): void {
  // ==================== Tasks ====================

  ipcMain.handle('task:getByDate', async (_event, date: string): Promise<DailyTaskFile> => {
    return store.getTasksByDate(date);
  });

  ipcMain.handle('task:create', async (_event, date: string, input: CreateTaskInput): Promise<Task> => {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      content: input.content,
      taskDate: input.taskDate,
      remindAt: input.remindAt,
      isReminderEnabled: input.isReminderEnabled,
      isCompleted: false,
      reminderStatus: input.isReminderEnabled && input.remindAt ? 'pending' : 'pending',
      githubSyncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await store.createTask(date, task);

    // Refresh reminders since a new task may have a reminder
    await reminder.refresh();

    return task;
  });

  ipcMain.handle('task:update', async (_event, date: string, task: Task): Promise<Task> => {
    task.updatedAt = new Date().toISOString();
    task.githubSyncStatus = 'pending';
    const updated = await store.updateTask(date, task);

    await reminder.refresh();

    return updated;
  });

  ipcMain.handle('task:delete', async (_event, date: string, taskId: string): Promise<void> => {
    await store.deleteTask(date, taskId);
    await reminder.refresh();
  });

  ipcMain.handle('task:toggle', async (_event, date: string, taskId: string): Promise<Task> => {
    const task = await store.toggleTask(date, taskId);
    await reminder.refresh();
    return task;
  });

  // ==================== Settings ====================

  ipcMain.handle('settings:get', async (): Promise<ReturnType<typeof store.getSettings>> => {
    return store.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings: Parameters<typeof store.saveSettings>[0]): Promise<void> => {
    await store.saveSettings(settings);
    await logger.info('Settings updated');
  });

  // ==================== Sync ====================

  ipcMain.handle('sync:manual', async (): Promise<{ success: number; failed: number }> => {
    await logger.info('Manual sync triggered');
    const result = await github.syncAll();
    // Notify renderer about sync completion
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('sync:completed', result);
    }
    return result;
  });

  ipcMain.handle('sync:getStatus', async (): Promise<ReturnType<typeof store.getSyncState>> => {
    return store.getSyncState();
  });

  // ==================== Reminder ====================

  ipcMain.handle('reminder:snooze', async (_event, taskId: string, taskDate: string, minutes: number): Promise<void> => {
    await reminder.snoozeReminder(taskId, taskDate, minutes);
  });

  // ==================== Data Directory ====================

  ipcMain.handle('dataDir:set', async (_event, newDataDir: string): Promise<void> => {
    // Save the data dir path to a config file at userData level (not inside data dir)
    const configPath = path.join(app.getPath('userData'), 'data-dir.json');
    await fs.writeFile(configPath, JSON.stringify({ dataDir: newDataDir }, null, 2), 'utf-8');
    await logger.info(`Data directory config updated to: ${newDataDir}`);
  });
}
