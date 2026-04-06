import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AppSettings,
  DailyTaskFile,
  SyncState,
  Task,
  DEFAULT_SETTINGS,
  DEFAULT_SYNC_STATE,
} from '../../src/types';

export class StoreService {
  private dataDir: string;

  constructor(userDataDir: string) {
    this.dataDir = path.join(userDataDir, 'task-notes-data');
  }

  /** Initialize the data directory structure on first run */
  async initialize(): Promise<void> {
    const dirs = [
      this.dataDir,
      this.join('config'),
      this.join('tasks'),
      this.join('logs'),
      this.join('cache'),
    ];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
    // Create default settings file if not exists
    const settingsPath = this.join('config', 'settings.json');
    try {
      await fs.access(settingsPath);
    } catch {
      const settings: AppSettings = { ...DEFAULT_SETTINGS, dataDir: this.dataDir };
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    }
    // Create default sync state if not exists
    const syncStatePath = this.join('cache', 'sync-state.json');
    try {
      await fs.access(syncStatePath);
    } catch {
      await fs.writeFile(syncStatePath, JSON.stringify(DEFAULT_SYNC_STATE, null, 2), 'utf-8');
    }
  }

  private join(...segments: string[]): string {
    return path.join(this.dataDir, ...segments);
  }

  // ==================== Settings ====================

  async getSettings(): Promise<AppSettings> {
    const filePath = this.join('config', 'settings.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as AppSettings;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const filePath = this.join('config', 'settings.json');
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  // ==================== Tasks ====================

  /** Return the JSON file path for a given date */
  private getTaskFilePath(date: string): string {
    // date format: YYYY-MM-DD
    const [year, month] = date.split('-');
    return this.join('tasks', year, month, `${date}.json`);
  }

  /** Ensure the YYYY/MM directory exists */
  private async ensureTaskDir(date: string): Promise<void> {
    const [year, month] = date.split('-');
    const dir = this.join('tasks', year, month);
    await fs.mkdir(dir, { recursive: true });
  }

  /** Read tasks for a given date; returns empty container if not exists */
  async getTasksByDate(date: string): Promise<DailyTaskFile> {
    const filePath = this.getTaskFilePath(date);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as DailyTaskFile;
    } catch {
      return { date, tasks: [] };
    }
  }

  /** Write the full daily task file */
  async saveTasksByDate(data: DailyTaskFile): Promise<void> {
    await this.ensureTaskDir(data.date);
    const filePath = this.getTaskFilePath(data.date);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** Create a new task for the given date */
  async createTask(date: string, task: Task): Promise<Task> {
    const daily = await this.getTasksByDate(date);
    daily.tasks.push(task);
    await this.saveTasksByDate(daily);
    return task;
  }

  /** Update an existing task */
  async updateTask(date: string, updatedTask: Task): Promise<Task> {
    const daily = await this.getTasksByDate(date);
    const idx = daily.tasks.findIndex((t) => t.id === updatedTask.id);
    if (idx === -1) throw new Error(`Task ${updatedTask.id} not found`);
    daily.tasks[idx] = updatedTask;
    await this.saveTasksByDate(daily);
    return updatedTask;
  }

  /** Delete a task by id */
  async deleteTask(date: string, taskId: string): Promise<void> {
    const daily = await this.getTasksByDate(date);
    daily.tasks = daily.tasks.filter((t) => t.id !== taskId);
    await this.saveTasksByDate(daily);
  }

  /** Toggle task completion */
  async toggleTask(date: string, taskId: string): Promise<Task> {
    const daily = await this.getTasksByDate(date);
    const task = daily.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.isCompleted = !task.isCompleted;
    task.updatedAt = new Date().toISOString();
    task.githubSyncStatus = 'pending';
    await this.saveTasksByDate(daily);
    return task;
  }

  /** Get all dates that have task files (for history browsing) */
  async getAvailableDates(): Promise<string[]> {
    const tasksDir = this.join('tasks');
    const dates: string[] = [];
    try {
      const years = await fs.readdir(tasksDir);
      for (const year of years) {
        const yearDir = path.join(tasksDir, year);
        const stat = await fs.stat(yearDir);
        if (!stat.isDirectory()) continue;
        const months = await fs.readdir(yearDir);
        for (const month of months) {
          const monthDir = path.join(yearDir, month);
          const mStat = await fs.stat(monthDir);
          if (!mStat.isDirectory()) continue;
          const files = await fs.readdir(monthDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              dates.push(file.replace('.json', ''));
            }
          }
        }
      }
    } catch {
      // tasks dir may not exist yet
    }
    return dates.sort().reverse();
  }

  // ==================== Sync State ====================

  async getSyncState(): Promise<SyncState> {
    const filePath = this.join('cache', 'sync-state.json');
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as SyncState;
    } catch {
      return { ...DEFAULT_SYNC_STATE };
    }
  }

  async saveSyncState(state: SyncState): Promise<void> {
    const filePath = this.join('cache', 'sync-state.json');
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  // ==================== Utility ====================

  getDataDir(): string {
    return this.dataDir;
  }

  /** Update data directory path (used when user changes data dir in settings) */
  setDataDir(newDataDir: string): void {
    this.dataDir = newDataDir;
  }
}
