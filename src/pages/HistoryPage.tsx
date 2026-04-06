import React, { useState, useEffect, useCallback } from 'react';
import { DailyTaskFile, Task } from '../types';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { getToday, formatDateDisplay, getWeekday } from '../utils/date';

const HistoryPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [daily, setDaily] = useState<DailyTaskFile>({ date: selectedDate, tasks: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getTasksByDate(selectedDate);
      setDaily(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const goToToday = () => setSelectedDate(getToday());

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
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
      await window.electronAPI.deleteTask(selectedDate, taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggle = async (taskId: string) => {
    try {
      await window.electronAPI.toggleTask(selectedDate, taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const isToday = selectedDate === getToday();

  return (
    <div className="page-history">
      <div className="page-header">
        <div>
          <h2>📅 历史任务</h2>
          <div className="date-label">查看和回顾过去的任务记录</div>
        </div>
      </div>

      <div className="date-picker-row">
        <button className="date-nav-btn" onClick={goToPrevDay}>
          ← 前一天
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <button className="date-nav-btn" onClick={goToNextDay}>
          后一天 →
        </button>
        {!isToday && (
          <button className="btn btn-sm btn-secondary" onClick={goToToday}>
            🏠 回到今天
          </button>
        )}
        <span className="date-display">
          {formatDateDisplay(selectedDate)} {getWeekday(selectedDate)}
        </span>
      </div>

      {loading ? (
        <div className="loading-text">加载中...</div>
      ) : (
        <TaskList
          tasks={daily.tasks}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage={`${formatDateDisplay(selectedDate)} 暂无任务`}
        />
      )}

      {showModal && (
        <TaskModal
          mode="edit"
          task={editingTask}
          defaultDate={selectedDate}
          onSave={async () => {}}
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

export default HistoryPage;
