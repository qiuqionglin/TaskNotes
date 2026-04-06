import React, { useState, useEffect, useCallback } from 'react';
import { DailyTaskFile, Task, CreateTaskInput } from '../types';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { getToday, formatDateDisplay, getWeekday } from '../utils/date';

type Props = {
  onCreateTaskFromTray: boolean;
  onCreateTaskConsumed: () => void;
};

const TodayPage: React.FC<Props> = ({ onCreateTaskFromTray, onCreateTaskConsumed }) => {
  const [daily, setDaily] = useState<DailyTaskFile>({ date: getToday(), tasks: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = getToday();

  const loadTasks = useCallback(async () => {
    try {
      const data = await window.electronAPI.getTasksByDate(today);
      setDaily(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (onCreateTaskFromTray) {
      setEditingTask(null);
      setShowModal(true);
      onCreateTaskConsumed();
    }
  }, [onCreateTaskFromTray, onCreateTaskConsumed]);

  const handleCreate = async (input: CreateTaskInput) => {
    try {
      await window.electronAPI.createTask(input.taskDate, input);
      await loadTasks();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdate = async (task: Task) => {
    try {
      await window.electronAPI.updateTask(task.taskDate, task);
      await loadTasks();
      setShowModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await window.electronAPI.deleteTask(today, taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggle = async (taskId: string) => {
    try {
      await window.electronAPI.toggleTask(today, taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleManualSync = async () => {
    try {
      await window.electronAPI.manualSync();
      await loadTasks();
    } catch (err) {
      console.error('Failed to sync:', err);
    }
  };

  const completedCount = daily.tasks.filter((t) => t.isCompleted).length;
  const totalCount = daily.tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="page-today">
      <div className="page-header">
        <div>
          <h2>🌸 今日任务</h2>
          <div className="date-label">
            {formatDateDisplay(today)} {getWeekday(today)}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleManualSync}>
            🔄 同步
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingTask(null);
              setShowModal(true);
            }}
          >
            ✨ 新建任务
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="progress-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-label">
            {completedCount}/{totalCount} 完成 {progress === 100 ? '🎉' : ''}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-text">加载中...</div>
      ) : (
        <TaskList
          tasks={daily.tasks}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="今天还没有任务"
        />
      )}

      {showModal && (
        <TaskModal
          mode={editingTask ? 'edit' : 'create'}
          task={editingTask}
          defaultDate={today}
          onSave={handleCreate}
          onUpdate={handleUpdate}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};

export default TodayPage;
