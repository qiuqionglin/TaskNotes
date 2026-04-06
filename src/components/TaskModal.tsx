import React, { useState, useEffect } from 'react';
import { Task, CreateTaskInput } from '../types';
import { getToday } from '../utils/date';

type Props = {
  mode: 'create' | 'edit';
  task?: Task | null;
  defaultDate?: string;
  onSave: (input: CreateTaskInput) => void;
  onUpdate?: (task: Task) => void;
  onClose: () => void;
};

const TaskModal: React.FC<Props> = ({
  mode,
  task,
  defaultDate,
  onSave,
  onUpdate,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [taskDate, setTaskDate] = useState(defaultDate || getToday());
  const [remindAt, setRemindAt] = useState('');
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && task) {
      setTitle(task.title);
      setContent(task.content);
      setTaskDate(task.taskDate);
      setIsReminderEnabled(task.isReminderEnabled);
      if (task.remindAt) {
        const d = new Date(task.remindAt);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setRemindAt(local);
      }
    }
  }, [mode, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'edit' && task && onUpdate) {
      const updated: Task = {
        ...task,
        title: title.trim(),
        content: content.trim(),
        taskDate,
        remindAt: isReminderEnabled && remindAt ? new Date(remindAt).toISOString() : undefined,
        isReminderEnabled,
        updatedAt: new Date().toISOString(),
      };
      onUpdate(updated);
    } else {
      const input: CreateTaskInput = {
        title: title.trim(),
        content: content.trim(),
        taskDate,
        remindAt: isReminderEnabled && remindAt ? new Date(remindAt).toISOString() : undefined,
        isReminderEnabled,
      };
      onSave(input);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-emoji">{mode === 'create' ? '✨' : '📝'}</span>
            <h3>{mode === 'create' ? '新建任务' : '编辑任务'}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>📌 标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务标题..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>📝 内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="备注内容（可选）"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>📅 所属日期</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="reminder-toggle"
                  checked={isReminderEnabled}
                  onChange={(e) => setIsReminderEnabled(e.target.checked)}
                />
                <label htmlFor="reminder-toggle" style={{ margin: 0 }}>
                  🔔 启用提醒
                </label>
              </div>
            </div>

            {isReminderEnabled && (
              <div className="form-group">
                <label>⏰ 提醒时间</label>
                <input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'create' ? '✨ 创建' : '💾 保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
