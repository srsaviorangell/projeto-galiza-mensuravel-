import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync session
  useEffect(() => {
    const saved = localStorage.getItem('galiza_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
      } catch (e) {
        console.error("Session parse error");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    const user = await db.users.where('email').equals(email).first();
    if (user && user.password === password) {
      setCurrentUser(user);
      localStorage.setItem('galiza_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('galiza_user');
  };

  // Global Data
  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sudo';

  // Stats
  const stats = {
    totalProjects: projects.length,
    pendingTasks: tasks.filter(t => t.status !== 'Concluída').length,
    completedTasks: tasks.filter(t => t.status === 'Concluída').length,
    totalUsers: users.length,
  };

  const value = {
    currentUser,
    setCurrentUser,
    isLoading,
    isAdmin,
    login,
    logout,
    projects,
    tasks,
    users,
    stats,
    // Unified functions
    addProject: (data) => db.projects.add(data),
    updateProject: (id, updates) => db.projects.update(id, updates),
    deleteProject: (id) => db.projects.delete(id),
    addTask: (data) => db.tasks.add(data),
    updateTask: (id, updates) => db.tasks.update(id, updates),
    deleteTask: (id) => db.tasks.delete(id),
    addUser: (data) => db.users.add(data),
    updateUser: (id, updates) => db.users.update(id, updates),
    deleteUser: (id) => db.users.delete(id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);