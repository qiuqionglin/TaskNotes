import React from 'react';
import { Task } from '../types';
import { formatTime } from '../utils/date';

type Props = {
  task: Task;
  onToggle: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
};

const TaskItem: React.FC<Props> = ({ task, onToggle, onEdit, onDelete }) => {
  return (
    <div className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.isCompleted}
        onChange={() => onToggle(task.id)}
      />

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.content && <div className="task-content">{task.content}</div>}
        <div className="task-meta">
          {task.isReminderEnabled && task.remindAt && (
            <span className="badge badge-reminder">🔔 {formatTime(task.remindAt)}</span>
          )}
          <span className={`badge badge-${task.githubSyncStatus}`}>
            {task.githubSyncStatus === 'synced'
              ? '✅ 已同步'
              : task.githubSyncStatus === 'failed'
              ? '❌ 同步失败'
              : '⏳ 待同步'}
          </span>
        </div>
      </div>

      <div className="task-actions">
        <button className="btn-icon" title="编辑" onClick={() => onEdit(task)}>✏️</button>
        <button className="btn-icon" title="删除" onClick={() => onDelete(task.id)}>🗑️</button>
      </div>
    </div>
  );
};

export default TaskItem;
