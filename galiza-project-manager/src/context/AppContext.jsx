import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('galiza_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.id) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error("Session parse error");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    if (!email || !password) return false;
    try {
      const user = await db.users.where('email').equals(email).first();
      if (user && user.password === password) {
        setCurrentUser(user);
        localStorage.setItem('galiza_user', JSON.stringify(user));
        return true;
      }
    } catch (e) {
      console.error("Login error:", e);
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('galiza_user');
  };

  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sudo';

  const safeFilterTasks = (taskList, status) => {
    if (!Array.isArray(taskList)) return [];
    return taskList.filter(t => t && t.status === status);
  };

  const stats = {
    totalProjects: Array.isArray(projects) ? projects.length : 0,
    pendingTasks: safeFilterTasks(tasks, 'A Fazer').length,
    completedTasks: safeFilterTasks(tasks, 'Concluída').length,
    totalUsers: Array.isArray(users) ? users.length : 0,
  };

  const value = {
    currentUser,
    setCurrentUser,
    isLoading,
    isAdmin,
    login,
    logout,
    projects: projects || [],
    tasks: tasks || [],
    users: users || [],
    stats,
    addProject: async (data) => {
      if (!data || !data.name) return null;
      try { return await db.projects.add(data); } catch (e) { console.error("addProject error:", e); return null; }
    },
    updateProject: async (id, updates) => {
      if (!id || !updates) return;
      try { await db.projects.update(id, updates); } catch (e) { console.error("updateProject error:", e); }
    },
    deleteProject: async (id) => {
      if (!id) return;
      try { await db.projects.delete(id); } catch (e) { console.error("deleteProject error:", e); }
    },
    addTask: async (data) => {
      if (!data || !data.title) return null;
      try { return await db.tasks.add(data); } catch (e) { console.error("addTask error:", e); return null; }
    },
    updateTask: async (id, updates) => {
      if (!id || !updates) return;
      try { await db.tasks.update(id, updates); } catch (e) { console.error("updateTask error:", e); }
    },
    deleteTask: async (id) => {
      if (!id) return;
      try { await db.tasks.delete(id); } catch (e) { console.error("deleteTask error:", e); }
    },
    addUser: async (data) => {
      if (!data || !data.name) return null;
      try { return await db.users.add(data); } catch (e) { console.error("addUser error:", e); return null; }
    },
    updateUser: async (id, updates) => {
      if (!id || !updates) return;
      try { await db.users.update(id, updates); } catch (e) { console.error("updateUser error:", e); }
    },
    deleteUser: async (id) => {
      if (!id) return;
      try { await db.users.delete(id); } catch (e) { console.error("deleteUser error:", e); }
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);