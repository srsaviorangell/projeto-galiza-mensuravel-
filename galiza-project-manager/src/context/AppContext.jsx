import { createContext, useContext, useState, useEffect } from 'react';
import {
  initialProjects,
  initialTasks,
  initialUsers,
  initialCollaborators,
} from '../data/mockData';

const AppContext = createContext();

const STORAGE_KEYS = {
  projects: 'galiza_projects',
  tasks: 'galiza_tasks',
  users: 'galiza_users',
  collaborators: 'galiza_collaborators',
};

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const [projects, setProjects] = useState(() =>
    loadFromStorage(STORAGE_KEYS.projects, initialProjects)
  );
  const [tasks, setTasks] = useState(() =>
    loadFromStorage(STORAGE_KEYS.tasks, initialTasks)
  );
  const [users, setUsers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.users, initialUsers)
  );
  const [collaborators, setCollaborators] = useState(() =>
    loadFromStorage(STORAGE_KEYS.collaborators, initialCollaborators)
  );

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.collaborators, JSON.stringify(collaborators));
  }, [collaborators]);

  // Project CRUD
  const addProject = (project) => {
    const newProject = { ...project, id: Date.now() };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };
  const updateProject = (id, updates) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };
  const deleteProject = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.filter((t) => t.projectId !== id));
  };

  // Task CRUD
  const addTask = (task) => {
    const newTask = { ...task, id: Date.now() };
    setTasks((prev) => [...prev, newTask]);
    recalcProjectProgress(task.projectId, [...tasks, newTask]);
    return newTask;
  };
  const updateTask = (id, updates) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTasks(updated);
    const task = updated.find((t) => t.id === id);
    if (task) recalcProjectProgress(task.projectId, updated);
  };
  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (task) recalcProjectProgress(task.projectId, updated);
  };

  const recalcProjectProgress = (projectId, currentTasks) => {
    const projectTasks = currentTasks.filter((t) => t.projectId === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === 'Concluída').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, progress, tasksCompleted: completed, tasksTotal: total }
          : p
      )
    );
  };

  // User CRUD
  const addUser = (user) => {
    const newUser = { ...user, id: Date.now() };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };
  const updateUser = (id, updates) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };
  const deleteUser = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Collaborator CRUD
  const addCollaborator = (collab) => {
    const newCollab = { ...collab, id: Date.now() };
    setCollaborators((prev) => [...prev, newCollab]);
    return newCollab;
  };
  const updateCollaborator = (id, updates) => {
    setCollaborators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };
  const deleteCollaborator = (id) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  };

  // Computed stats
  const stats = {
    totalProjects: projects.length,
    overallProgress:
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
          )
        : 0,
    pendingTasks: tasks.filter((t) => t.status !== 'Concluída').length,
    urgentTasks: tasks.filter((t) => t.daysLate > 0 && t.status !== 'Concluída').length,
    completedTasks: tasks.filter((t) => t.status === 'Concluída').length,
    totalCollaborators: collaborators.length,
  };

  const value = {
    projects,
    tasks,
    users,
    collaborators,
    stats,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addUser,
    updateUser,
    deleteUser,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
