import React, { useState, useEffect, useCallback } from 'react';
import { SyncState, Task } from './types';
import Sidebar from './components/Sidebar';
import TodayPage from './pages/TodayPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

type Page = 'today' | 'history' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('today');
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [trayCreateTask, setTrayCreateTask] = useState(false);
  const [reminderTask, setReminderTask] = useState<Task | null>(null);

  // Load sync state
  const loadSyncState = useCallback(async () => {
    try {
      const ss = await window.electronAPI.getSyncStatus();
      setSyncState(ss);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSyncState();
  }, [loadSyncState]);

  // Listen for navigate events from main process (tray)
  useEffect(() => {
    window.electronAPI.onNavigate((page: string) => {
      setCurrentPage(page as Page);
    });
  }, []);

  // Listen for "open create task" from tray
  useEffect(() => {
    window.electronAPI.onOpenCreateTask(() => {
      setCurrentPage('today');
      setTrayCreateTask(true);
    });
  }, []);

  // Listen for reminder triggered events
  useEffect(() => {
    const unsubscribe = window.electronAPI.onReminderTriggered((task: Task) => {
      setCurrentPage('today');
      setReminderTask(task);
    });
    return unsubscribe;
  }, []);

  // Listen for sync completed events
  useEffect(() => {
    // Refresh sync state when page becomes visible or sync completes
    const interval = setInterval(loadSyncState, 30_000);
    return () => clearInterval(interval);
  }, [loadSyncState]);

  const handleTrayCreateConsumed = useCallback(() => {
    setTrayCreateTask(false);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'today':
        return (
          <TodayPage
            onCreateTaskFromTray={trayCreateTask}
            onCreateTaskConsumed={handleTrayCreateConsumed}
          />
        );
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        syncState={syncState}
      />
      <main className="main-content">{renderPage()}</main>

      {/* Reminder alert banner */}
      {reminderTask && (
        <div className="reminder-banner">
          <div className="reminder-banner-icon">🔔</div>
          <div className="reminder-banner-content">
            <div className="reminder-banner-label">任务提醒</div>
            <div className="reminder-banner-title">{reminderTask.title}</div>
            {reminderTask.content && (
              <div className="reminder-banner-body">{reminderTask.content}</div>
            )}
          </div>
          <button
            className="reminder-banner-close"
            onClick={() => setReminderTask(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
