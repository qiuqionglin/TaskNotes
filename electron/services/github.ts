import { Octokit } from 'octokit';
import { Task, AppSettings } from '../../src/types';
import { StoreService } from './store';
import { LoggerService } from './logger';

export class GithubService {
  private octokit: Octokit | null = null;
  private store: StoreService;
  private logger: LoggerService;

  constructor(store: StoreService, logger: LoggerService) {
    this.store = store;
    this.logger = logger;
  }

  /** Initialize or re-initialize Octokit with current settings */
  async initialize(): Promise<boolean> {
    const settings = await this.store.getSettings();
    if (!settings.githubToken || !settings.githubRepo) {
      this.octokit = null;
      return false;
    }
    this.octokit = new Octokit({ auth: settings.githubToken });
    return true;
  }

  /** Get current settings shortcut */
  private async getSettings(): Promise<AppSettings> {
    return this.store.getSettings();
  }

  /** Parse owner/repo from settings */
  private parseRepo(repo: string): { owner: string; repo: string } {
    const [owner, repoName] = repo.split('/');
    return { owner, repo: repoName };
  }

  /** Convert a day's tasks to Markdown format */
  convertToMarkdown(tasks: Task[], date: string): string {
    const pending = tasks.filter((t) => !t.isCompleted);
    const completed = tasks.filter((t) => t.isCompleted);

    let md = `# Tasks for ${date}\n\n`;

    if (pending.length > 0) {
      md += `## 未完成\n\n`;
      for (const t of pending) {
        const time = t.isReminderEnabled && t.remindAt
          ? new Date(t.remindAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' '
          : '';
        md += `- [ ] ${time}${t.title}\n`;
        if (t.content.trim()) {
          md += `  - 备注：${t.content.replace(/\n/g, '\n  ')}\n`;
        }
      }
      md += '\n';
    }

    if (completed.length > 0) {
      md += `## 已完成\n\n`;
      for (const t of completed) {
        const time = t.isReminderEnabled && t.remindAt
          ? new Date(t.remindAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' '
          : '';
        md += `- [x] ${time}${t.title}\n`;
        if (t.content.trim()) {
          md += `  - 备注：${t.content.replace(/\n/g, '\n  ')}\n`;
        }
      }
      md += '\n';
    }

    if (tasks.length === 0) {
      md += `> 暂无任务\n`;
    }

    return md;
  }

  /** Build the GitHub file path for a date */
  private buildFilePath(basePath: string, date: string): string {
    const [year, month, day] = date.split('-');
    return `${basePath}/${year}/${month}/${day}/tasks.md`;
  }

  /** Get the SHA of an existing file (needed for updates) */
  private async getFileSha(
    owner: string,
    repo: string,
    branch: string,
    filePath: string
  ): Promise<string | null> {
    if (!this.octokit) return null;
    try {
      const resp = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });
      if ('sha' in resp.data) {
        return resp.data.sha;
      }
    } catch {
      // File doesn't exist yet — that's fine
    }
    return null;
  }

  /** Upload (create or update) a file to GitHub */
  private async uploadFile(
    filePath: string,
    content: string,
    message: string
  ): Promise<boolean> {
    if (!this.octokit) return false;
    const settings = await this.getSettings();
    const { owner, repo } = this.parseRepo(settings.githubRepo);

    const sha = await this.getFileSha(owner, repo, settings.githubBranch, filePath);

    try {
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: settings.githubBranch,
        ...(sha ? { sha } : {}),
      });
      return true;
    } catch (err) {
      await this.logger.error(`GitHub upload failed for ${filePath}`, err);
      return false;
    }
  }

  /** Sync a single day's tasks to GitHub */
  async syncDate(date: string): Promise<boolean> {
    const initialized = await this.initialize();
    if (!initialized) {
      await this.logger.warn('GitHub sync skipped: token or repo not configured');
      return false;
    }

    const settings = await this.getSettings();
    const daily = await this.store.getTasksByDate(date);

    const markdown = this.convertToMarkdown(daily.tasks, date);
    const filePath = this.buildFilePath(settings.githubBasePath, date);
    const message = `chore: sync tasks for ${date}`;

    const success = await this.uploadFile(filePath, markdown, message);

    if (success) {
      // Update sync status for all tasks of that date
      for (const task of daily.tasks) {
        task.githubSyncStatus = 'synced';
        task.updatedAt = new Date().toISOString();
      }
      await this.store.saveTasksByDate(daily);
      await this.logger.info(`Synced ${date} to GitHub successfully`);
    } else {
      for (const task of daily.tasks) {
        task.githubSyncStatus = 'failed';
        task.updatedAt = new Date().toISOString();
      }
      await this.store.saveTasksByDate(daily);
    }

    return success;
  }

  /** Sync all dates that have pending tasks */
  async syncAll(): Promise<{ success: number; failed: number }> {
    const initialized = await this.initialize();
    if (!initialized) {
      await this.logger.warn('GitHub syncAll skipped: not configured');
      return { success: 0, failed: 0 };
    }

    const dates = await this.store.getAvailableDates();
    let success = 0;
    let failed = 0;

    for (const date of dates) {
      const daily = await this.store.getTasksByDate(date);
      const hasPending = daily.tasks.some((t) => t.githubSyncStatus !== 'synced');
      if (!hasPending) continue;

      const ok = await this.syncDate(date);
      if (ok) success++;
      else failed++;
    }

    // Update sync state
    const syncState = await this.store.getSyncState();
    syncState.lastSyncTime = new Date().toISOString();
    syncState.lastSyncResult = failed === 0 ? 'success' : 'failed';
    await this.store.saveSyncState(syncState);

    await this.logger.info(
      `SyncAll completed: ${success} success, ${failed} failed`
    );

    return { success, failed };
  }
}
