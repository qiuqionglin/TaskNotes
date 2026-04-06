# TaskNotes

A lightweight desktop to-do app with daily task management, desktop reminders, and GitHub-based cloud sync.

![TaskNotes](https://img.shields.io/badge/Electron-28-blue) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Daily Task Management** — Create, edit, complete and delete tasks organized by date
- **Desktop Reminders** — Native OS notifications with in-app reminder banners
- **GitHub Auto-Sync** — Backup tasks to a GitHub repository with auto-sync support
- **System Tray** — Runs quietly in the background with tray icon controls
- **Dark/Modern UI** — Clean purple-themed interface
- **Cross-Platform** — Windows, macOS, and Linux support

---

## Screenshots

> _(Add your screenshots here)_

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/qiuqionglin/TaskNotes.git
cd TaskNotes

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build

```bash
# Build for current platform (portable .exe for Windows)
npm run package

# Build installer
npm run package:installer
```

The output will be in the `release/` directory.

---

## Usage Guide

### Configure GitHub Sync

1. Go to **Settings** page
2. Generate a GitHub Personal Access Token:
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Grant `repo` permission (full control of private repositories)
3. Fill in the settings:
   - **GitHub Token**: `ghp_xxxxxxxxxxxxx`
   - **Repository**: `yourusername/your-repo` (e.g. `qiuqionglin/task-notes`)
   - **Branch**: `main` (or your preferred branch)
   - **Root Path**: `tasks` (the folder path in your repo)
4. Click **保存设置** (Save Settings), then click **立即同步** (Sync Now)

Your tasks will be synced to `tasks/YYYY/MM/YYYY-MM-DD.json` in your repository.

### Create a Task

1. Click **✨ 新建任务** (New Task) on the Today page
2. Fill in:
   - **Title** (required)
   - **Content** (optional)
   - **Date** — defaults to today, can be any date
   - **Reminder** — enable and set a time to receive a desktop notification
3. Click **保存** (Save)

### Change Data Directory

By default, data is stored in:
- **Windows**: `C:\Users\<username>\AppData\Roaming\task-notes\task-notes-data`

To change this location:
1. Go to **Settings** → **💾 数据存储**
2. Edit the **数据目录** (Data Directory) path
3. Save — the change takes effect after restarting the app

---

## Project Structure

```
task-notes/
├── electron/               # Main process (Electron)
│   ├── main.ts            # Entry point, window management
│   ├── preload.ts         # Context bridge (IPC exposure)
│   ├── ipc/
│   │   └── handlers.ts    # IPC request handlers
│   └── services/
│       ├── store.ts       # Local data storage (JSON files)
│       ├── github.ts      # GitHub sync via Octokit
│       ├── reminder.ts    # Desktop notifications & timers
│       ├── logger.ts      # Application logging
│       └── tray.ts        # System tray management
├── src/                   # Renderer process (React)
│   ├── App.tsx           # Root component
│   ├── pages/
│   │   ├── TodayPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   └── TaskModal.tsx
│   ├── types/
│   │   └── index.ts      # Shared TypeScript types
│   └── styles/
│       └── global.css
├── webpack.*.config.js   # Webpack configs (main, renderer)
├── package.json
└── tsconfig.json
```

---

## Data Format

Tasks are stored as JSON files organized by date:

```json
// tasks/2026/04/2026-04-06.json
{
  "date": "2026-04-06",
  "tasks": [
    {
      "id": "uuid-v4",
      "title": "Review PR",
      "content": "Check the new authentication module",
      "taskDate": "2026-04-06",
      "remindAt": "2026-04-06T14:00:00.000Z",
      "isReminderEnabled": true,
      "isCompleted": false,
      "reminderStatus": "pending",
      "githubSyncStatus": "pending",
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:00:00.000Z"
    }
  ]
}
```

---

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `githubToken` | GitHub personal access token | `""` |
| `githubRepo` | Target repository (owner/repo) | `""` |
| `githubBranch` | Branch to sync to | `"main"` |
| `githubBasePath` | Root path in the repo | `"tasks"` |
| `autoSyncEnabled` | Enable auto-sync | `false` |
| `autoSyncIntervalMinutes` | Auto-sync interval | `30` |
| `soundEnabled` | Play sound on reminder | `true` |
| `dataDir` | Local data directory | (system default) |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

Issues and pull requests are welcome!
