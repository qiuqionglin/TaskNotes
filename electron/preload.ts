import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types';

const api: ElectronAPI = {
  // Tasks
  getTasksByDate: (date: string) => ipcRenderer.invoke('task:getByDate', date),

  createTask: (date: string, input) => ipcRenderer.invoke('task:create', date, input),

  updateTask: (date: string, task) => ipcRenderer.invoke('task:update', date, task),

  deleteTask: (date: string, taskId: string) => ipcRenderer.invoke('task:delete', date, taskId),

  toggleTask: (date: string, taskId: string) => ipcRenderer.invoke('task:toggle', date, taskId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Sync
  manualSync: () => ipcRenderer.invoke('sync:manual'),

  getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),

  // Reminder
  snoozeReminder: (taskId: string, taskDate: string, minutes: number) =>
    ipcRenderer.invoke('reminder:snooze', taskId, taskDate, minutes),

  // Data directory
  setDataDir: (path: string) => ipcRenderer.invoke('dataDir:set', path),

  // Events from main process
  onReminderTriggered: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('reminder:triggered', handler);
    return () => {
      ipcRenderer.removeListener('reminder:triggered', handler);
    };
  },

  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_event: any, page: string) => callback(page));
  },

  onOpenCreateTask: (callback) => {
    ipcRenderer.on('open-create-task', () => callback());
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
