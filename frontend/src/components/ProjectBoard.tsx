'use client';

import { useState, useEffect } from 'react';
import { collaborationService } from '@/services/collaboration.service';
import { Plus, GripVertical, Clock, AlertCircle, CheckCircle, Flag } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_id?: string;
  due_date?: string;
  story_points?: number;
  assignee?: { name: string; avatar_url?: string };
}

interface ProjectBoardProps {
  projectId: string;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'medium',
    assigneeId: '',
  });

  const columns = [
    { id: 'backlog', label: 'Backlog', color: 'bg-gray-100' },
    { id: 'todo', label: 'To Do', color: 'bg-blue-100' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-100' },
    { id: 'review', label: 'Review', color: 'bg-purple-100' },
    { id: 'completed', label: 'Completed', color: 'bg-green-100' },
    { id: 'blocked', label: 'Blocked', color: 'bg-red-100' },
  ];

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await collaborationService.getProjectTasks(projectId);
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await collaborationService.createTask(
        projectId,
        newTask.title,
        undefined,
        newTask.priority,
        newTask.assigneeId || undefined
      );
      setNewTask({ title: '', priority: 'medium', assigneeId: '' });
      setShowCreateTask(false);
      await loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await collaborationService.updateTask(taskId, { status: newStatus });
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      await collaborationService.deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertCircle size={14} />;
      case 'medium':
        return <Flag size={14} />;
      default:
        return <AlertCircle size={14} className="opacity-50" />;
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Project Board</h2>
        <button
          onClick={() => setShowCreateTask(!showCreateTask)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateTask && (
        <form onSubmit={handleCreateTask} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title..."
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <input
                  type="text"
                  placeholder="User ID or name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setShowCreateTask(false)}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className={`${column.color} rounded-lg p-4 min-w-80 lg:min-w-64`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{column.label}</h3>
                <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <p>No tasks</p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow cursor-move group"
                    >
                      <div className="flex gap-2">
                        <GripVertical size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm mb-2 break-words">{task.title}</h4>

                          <div className="space-y-1 text-xs">
                            {/* Priority Badge */}
                            <div className="flex items-center gap-1">
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)}
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            </div>

                            {/* Due Date */}
                            {task.due_date && (
                              <div
                                className={`flex items-center gap-1 ${
                                  isOverdue(task.due_date)
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}
                              >
                                <Clock size={12} />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}

                            {/* Story Points */}
                            {task.story_points && (
                              <div className="text-gray-600 font-medium">
                                {task.story_points} pts
                              </div>
                            )}

                            {/* Assignee */}
                            {task.assignee && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                                <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {task.assignee.name?.[0] || 'U'}
                                </div>
                                <span className="text-gray-700">{task.assignee.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Status Progress */}
                      {task.status !== 'completed' && task.status !== 'backlog' && (
                        <div className="mt-2 pt-2 border-t border-gray-200 flex gap-1">
                          {columns
                            .filter((c) => c.id !== 'backlog')
                            .map((col) => (
                              <button
                                key={col.id}
                                onClick={() => handleUpdateTaskStatus(task.id, col.id)}
                                className={`flex-1 h-1 rounded transition-colors ${
                                  task.status === col.id ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                                title={col.label}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Add Task Button in Column */}
                {columnTasks.length > 0 && (
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="w-full text-gray-600 hover:text-gray-900 py-2 text-center text-sm font-medium hover:bg-white rounded-lg transition-colors"
                  >
                    + Add Task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
