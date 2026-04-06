import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StoreService } from './services/store';
import { LoggerService } from './services/logger';
import { GithubService } from './services/github';
import { ReminderService } from './services/reminder';
import { TrayService } from './services/tray';
import { createAppIcon } from './services/icon';
import { registerIpcHandlers } from './ipc/handlers';

const DEFAULT_DATA_DIR_NAME = 'task-notes-data';

async function resolveDataDir(): Promise<string> {
  const configPath = path.join(app.getPath('userData'), 'data-dir.json');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const { dataDir } = JSON.parse(raw);
    if (dataDir) return dataDir;
  } catch {
    // config doesn't exist, use default
  }
  return path.join(app.getPath('userData'), DEFAULT_DATA_DIR_NAME);
}

let mainWindow: BrowserWindow | null = null;
let store: StoreService;
let logger: LoggerService;
let github: GithubService;
let reminder: ReminderService;
let tray: TrayService;
let autoSyncTimer: NodeJS.Timeout | null = null;

const isDev = !app.isPackaged;

function createMainWindow(): BrowserWindow {
  const icon = createAppIcon(64);

  const win = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 720,
    minHeight: 500,
    show: false,
    icon,
    backgroundColor: '#F5F3FF',
    titleBarStyle: 'default',
    title: 'TaskNotes',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  return win;
}

async function bootstrap(): Promise<void> {
  const dataDir = await resolveDataDir();
  store = new StoreService(dataDir);
  await store.initialize();

  // Ensure settings dataDir matches the actual data directory
  const settings = await store.getSettings();
  if (settings.dataDir !== dataDir) {
    settings.dataDir = dataDir;
    await store.saveSettings(settings);
  }

  logger = new LoggerService(store.getDataDir());
  await logger.info('Application starting');

  github = new GithubService(store, logger);
  reminder = new ReminderService(store, logger);

  mainWindow = createMainWindow();
  reminder.setMainWindow(mainWindow);

  registerIpcHandlers(store, github, reminder, logger, () => mainWindow);

  tray = new TrayService(mainWindow, async () => {
    await triggerSync();
  });
  tray.create();

  await reminder.start();
  await setupAutoSync();

  await logger.info('Application ready');
}

async function setupAutoSync(): Promise<void> {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  try {
    const settings = await store.getSettings();
    if (settings.autoSyncEnabled && settings.autoSyncIntervalMinutes > 0) {
      const interval = settings.autoSyncIntervalMinutes * 60 * 1000;
      autoSyncTimer = setInterval(async () => { await triggerSync(); }, interval);
      await logger.info(`Auto-sync enabled, interval: ${settings.autoSyncIntervalMinutes} minutes`);
    }
  } catch (err) {
    await logger.error('Failed to setup auto-sync', err);
  }
}

async function triggerSync(): Promise<void> {
  await logger.info('Auto sync triggered');
  try {
    const result = await github.syncAll();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync:completed', result);
    }
  } catch (err) {
    await logger.error('Auto sync failed', err);
  }
}

app.whenReady().then(bootstrap);
app.on('window-all-closed', () => { /* keep running in tray */ });
app.on('before-quit', () => {
  (app as any).isQuitting = true;
  if (reminder) reminder.stop();
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (tray) tray.destroy();
});
app.on('activate', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});
