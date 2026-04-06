// ===== Task Types =====

export type ReminderStatus = 'pending' | 'triggered' | 'snoozed';

export type GithubSyncStatus = 'pending' | 'synced' | 'failed';

export type Task = {
  id: string;
  title: string;
  content: string;
  taskDate: string; // YYYY-MM-DD
  remindAt?: string; // ISO datetime string
  isReminderEnabled: boolean;
  isCompleted: boolean;
  reminderStatus: ReminderStatus;
  githubSyncStatus: GithubSyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type DailyTaskFile = {
  date: string; // YYYY-MM-DD
  tasks: Task[];
};

// ===== Settings =====

export type AppSettings = {
  githubToken: string;
  githubRepo: string; // format: "owner/repo"
  githubBranch: string;
  githubBasePath: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  soundEnabled: boolean;
  dataDir: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  githubToken: '',
  githubRepo: '',
  githubBranch: 'main',
  githubBasePath: 'tasks',
  autoSyncEnabled: false,
  autoSyncIntervalMinutes: 30,
  soundEnabled: true,
  dataDir: '',
};

// ===== Sync State =====

export type SyncRetryEntry = {
  date: string;
  retryCount: number;
  lastAttempt: string;
};

export type SyncState = {
  lastSyncTime: string | null;
  lastSyncResult: 'success' | 'failed' | null;
  pendingRetries: SyncRetryEntry[];
};

export const DEFAULT_SYNC_STATE: SyncState = {
  lastSyncTime: null,
  lastSyncResult: null,
  pendingRetries: [],
};

// ===== Create Task Input =====

export type CreateTaskInput = {
  title: string;
  content: string;
  taskDate: string;
  remindAt?: string;
  isReminderEnabled: boolean;
};

// ===== Electron API (exposed via preload) =====

export interface ElectronAPI {
  // Tasks
  getTasksByDate(date: string): Promise<DailyTaskFile>;
  createTask(date: string, input: CreateTaskInput): Promise<Task>;
  updateTask(date: string, task: Task): Promise<Task>;
  deleteTask(date: string, taskId: string): Promise<void>;
  toggleTask(date: string, taskId: string): Promise<Task>;

  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // Sync
  manualSync(): Promise<{ success: number; failed: number }>;
  getSyncStatus(): Promise<SyncState>;

  // Reminder
  snoozeReminder(taskId: string, taskDate: string, minutes: number): Promise<void>;

  // Data directory
  setDataDir(path: string): Promise<void>;

  // Events from main process
  onReminderTriggered(callback: (task: Task) => void): () => void;
  onNavigate(callback: (page: string) => void): void;
  onOpenCreateTask(callback: () => void): void;
}

// Global window declaration
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
