import React from 'react';
import { SyncState } from '../types';

type Page = 'today' | 'history' | 'settings';

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  syncState: SyncState | null;
};

const Sidebar: React.FC<Props> = ({ currentPage, onNavigate, syncState }) => {
  const syncLabel = () => {
    if (!syncState?.lastSyncTime) return '尚未同步';
    const time = new Date(syncState.lastSyncTime).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${time} ${syncState.lastSyncResult === 'success' ? '同步成功' : '同步失败'}`;
  };

  const syncDotClass = () => {
    if (!syncState?.lastSyncResult) return 'pending';
    return syncState.lastSyncResult;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-mascot">🌸</div>
        <h1>TaskNotes</h1>
        <div className="subtitle">每日备忘 · GitHub 归档</div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${currentPage === 'today' ? 'active' : ''}`}
          onClick={() => onNavigate('today')}
        >
          <span className="icon">📋</span> 今日任务
        </button>
        <button
          className={`sidebar-nav-item ${currentPage === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate('history')}
        >
          <span className="icon">📅</span> 历史任务
        </button>
        <button
          className={`sidebar-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <span className="icon">⚙️</span> 设置
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sync-status">
          <span className={`sync-dot ${syncDotClass()}`} />
          <span>{syncLabel()}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
