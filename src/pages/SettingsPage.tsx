import React, { useState, useEffect } from 'react';
import { AppSettings, SyncState } from '../types';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [dataDirChanged, setDataDirChanged] = useState(false);
  const [originalDataDir, setOriginalDataDir] = useState('');

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    if (settings && settings.dataDir !== originalDataDir) {
      setDataDirChanged(settings.dataDir !== originalDataDir && originalDataDir !== '');
    }
  }, [settings?.dataDir]);

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI.getSettings();
      setSettings(s);
      setOriginalDataDir(s.dataDir);
      const ss = await window.electronAPI.getSyncStatus();
      setSyncState(ss);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      // If data dir changed, write the new path to the config file first
      if (dataDirChanged) {
        await window.electronAPI.setDataDir(settings.dataDir);
      }
      await window.electronAPI.saveSettings(settings);
      setMessage({
        text: dataDirChanged
          ? '数据目录已保存，重启应用后生效'
          : '设置已保存',
        type: 'success',
      });
      if (dataDirChanged) {
        setDataDirChanged(false);
        setOriginalDataDir(settings.dataDir);
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: '保存失败', type: 'error' });
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.manualSync();
      setMessage({
        text: `同步完成: ${result.success} 成功, ${result.failed} 失败`,
        type: result.failed === 0 ? 'success' : 'error',
      });
      const ss = await window.electronAPI.getSyncStatus();
      setSyncState(ss);
    } catch (err) {
      setMessage({ text: '同步失败', type: 'error' });
      console.error('Failed to sync:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="loading-text">加载中...</div>;

  const update = (key: keyof AppSettings, value: string | number | boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="page-settings">
      <div className="page-header">
        <div>
          <h2>⚙️ 设置</h2>
          <div className="date-label">配置 GitHub 同步和提醒选项</div>
        </div>
      </div>

      {/* GitHub Settings */}
      <div className="settings-section">
        <h3><span className="section-emoji">🐙</span> GitHub 同步配置</h3>

        <div className="form-group">
          <label>GitHub Token</label>
          <input
            type="password"
            value={settings.githubToken}
            onChange={(e) => update('githubToken', e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxx"
          />
        </div>

        <div className="form-group">
          <label>仓库名 (owner/repo)</label>
          <input
            type="text"
            value={settings.githubRepo}
            onChange={(e) => update('githubRepo', e.target.value)}
            placeholder="username/my-tasks"
          />
        </div>

        <div className="form-group">
          <label>分支名</label>
          <input
            type="text"
            value={settings.githubBranch}
            onChange={(e) => update('githubBranch', e.target.value)}
            placeholder="main"
          />
        </div>

        <div className="form-group">
          <label>根目录路径</label>
          <input
            type="text"
            value={settings.githubBasePath}
            onChange={(e) => update('githubBasePath', e.target.value)}
            placeholder="tasks"
          />
        </div>
      </div>

      {/* Sync Settings */}
      <div className="settings-section">
        <h3><span className="section-emoji">🔄</span> 同步设置</h3>

        <div className="form-group">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="autoSync"
              checked={settings.autoSyncEnabled}
              onChange={(e) => update('autoSyncEnabled', e.target.checked)}
            />
            <label htmlFor="autoSync" style={{ margin: 0 }}>
              启用自动同步
            </label>
          </div>
        </div>

        {settings.autoSyncEnabled && (
          <div className="form-group">
            <label>自动同步频率（分钟）</label>
            <input
              type="number"
              value={settings.autoSyncIntervalMinutes}
              onChange={(e) => update('autoSyncIntervalMinutes', parseInt(e.target.value) || 30)}
              min={1}
              max={1440}
            />
          </div>
        )}

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleManualSync} disabled={saving}>
            🔄 立即同步
          </button>
        </div>

        {syncState && (
          <div className="sync-info">
            {syncState.lastSyncTime
              ? `🕐 最近同步: ${new Date(syncState.lastSyncTime).toLocaleString('zh-CN')} (${syncState.lastSyncResult === 'success' ? '✅ 成功' : '❌ 失败'})`
              : '尚未同步过'}
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="settings-section">
        <h3><span className="section-emoji">🔔</span> 提醒设置</h3>
        <div className="form-group">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="soundEnabled"
              checked={settings.soundEnabled}
              onChange={(e) => update('soundEnabled', e.target.checked)}
            />
            <label htmlFor="soundEnabled" style={{ margin: 0 }}>
              启用提示音
            </label>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="settings-section">
        <h3><span className="section-emoji">💾</span> 数据存储</h3>
        <div className="form-group">
          <label>数据目录</label>
          <input
            type="text"
            value={settings.dataDir}
            onChange={(e) => update('dataDir', e.target.value)}
            placeholder="C:\Users\xxx\AppData\Roaming\task-notes\task-notes-data"
          />
          {dataDirChanged && (
            <div className="data-dir-warning">
              ⚠️ 更改数据目录后需要重启应用才能生效
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
        {message && (
          <span className={`save-message ${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
