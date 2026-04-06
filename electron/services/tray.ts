import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import { createAppIcon } from './icon';

export class TrayService {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private onSync: () => void;

  constructor(mainWindow: BrowserWindow, onSync: () => void) {
    this.mainWindow = mainWindow;
    this.onSync = onSync;
  }

  /** Create and set up the system tray with a proper icon */
  create(): void {
    const icon = createAppIcon(32);
    this.tray = new Tray(icon);
    this.tray.setToolTip('TaskNotes - 每日备忘提醒');

    this.tray.on('double-click', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });

    this.rebuildMenu();
  }

  rebuildMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🌸 打开主界面',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      {
        label: '✏️ 新建任务',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send('navigate', 'today');
          this.mainWindow.webContents.send('open-create-task');
        },
      },
      {
        label: '📋 查看今日任务',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send('navigate', 'today');
        },
      },
      { type: 'separator' },
      {
        label: '🔄 立即同步',
        click: () => {
          this.onSync();
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
