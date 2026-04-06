import React from 'react';
import { Task } from '../types';
import TaskItem from './TaskItem';

type Props = {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  emptyMessage?: string;
};

const TaskList: React.FC<Props> = ({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  emptyMessage = '暂无任务',
}) => {
  if (tasks.length === 0) {
    return (
      <div className="task-empty">
        <span className="empty-icon">🌻</span>
        <p className="empty-title">{emptyMessage}</p>
        <p>点击「+ 新建任务」开始记录吧</p>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="task-list">
      {sorted.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;
