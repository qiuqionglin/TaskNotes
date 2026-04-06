import * as fs from 'fs/promises';
import * as path from 'path';

export class LoggerService {
  private logDir: string;

  constructor(dataDir: string) {
    this.logDir = path.join(dataDir, 'logs');
    fs.mkdir(this.logDir, { recursive: true }).catch(() => {});
  }

  private getLogFilePath(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return path.join(this.logDir, `sync-${now.getFullYear()}-${mm}.log`);
  }

  async info(message: string): Promise<void> {
    await this.writeLog('INFO', message);
  }

  async warn(message: string): Promise<void> {
    await this.writeLog('WARN', message);
  }

  async error(message: string, error?: unknown): Promise<void> {
    const detail = error instanceof Error ? ` | ${error.message}` : error ? ` | ${String(error)}` : '';
    await this.writeLog('ERROR', message + detail);
  }

  private async writeLog(level: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    try {
      await fs.appendFile(this.getLogFilePath(), line, 'utf-8');
    } catch {
      console.error('Failed to write log:', line.trim());
    }
  }
}
