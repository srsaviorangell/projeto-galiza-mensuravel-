import { useState, useEffect, useMemo } from 'react';
import { createContext, useContext, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Projetos from './pages/Projetos';
import ProjetoDetalhes from './pages/ProjetoDetalhes';
import Tarefas from './pages/Tarefas';
import Usuarios from './pages/Usuarios';
import Colaboradores from './pages/Colaboradores';
import Login from './pages/Login';
import Admin from './pages/Admin';
import './app.css';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

function ProtectedLayout() {
  const { isDbReady, isLoading, currentUser, logout } = useApp();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#FF5E2A', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#64748b' }}>Carregando...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="app-container">
      <Topbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>Esta página ainda está em construção (Fase 4)</p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  useEffect(() => {
    db.open().then(async () => {
      setIsDbReady(true);
      
      const adminExists = await db.users.where('email').equals('admin@galiza.com').first();
      if (!adminExists) {
        await db.users.add({
          name: 'Admin',
          email: 'admin@galiza.com',
          role: 'sudo',
          password: 'sudo123',
          createdAt: new Date().toISOString()
        });
      }
      
      const savedUserStr = localStorage.getItem('galiza_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const userExists = await db.users.get(savedUser.id);
        if (userExists) {
          setCurrentUser(savedUser);
        } else {
          localStorage.removeItem('galiza_user');
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  const login = useCallback(async (email, password) => {
    const user = await db.users.where('email').equals(email).first();
    if (!user) return { success: false, error: 'Usuário não encontrado' };
    
    if (user.role === 'sudo') {
      if (password !== user.password) {
        return { success: false, error: 'Senha incorreta' };
      }
    } else {
      if (user.password && user.password !== password) {
        return { success: false, error: 'Senha incorreta' };
      }
    }
    
    const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
    setCurrentUser(userData);
    localStorage.setItem('galiza_user', JSON.stringify(userData));
    return { success: true, user: userData };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('galiza_user');
  }, []);

  const isAdmin = currentUser?.role === 'sudo' || currentUser?.role === 'admin';

  const userTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => t.assignee === currentUser?.name);
  }, [tasks, isAdmin, currentUser]);

  const userStats = useMemo(() => {
    return {
      totalProjects: projects.length,
      overallProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0,
      pendingTasks: userTasks.filter((t) => t.status !== 'Concluída').length,
      urgentTasks: userTasks.filter((t) => t.daysLate > 0 && t.status !== 'Concluída').length,
      completedTasks: userTasks.filter((t) => t.status === 'Concluída').length,
      totalCollaborators: users.length,
    };
  }, [projects, userTasks, users]);

  const getAllAssignees = useCallback(() => {
    return users.map(u => ({ id: u.id, name: u.name, type: 'user', role: u.role }));
  }, [users]);

  const assignTask = useCallback(async (taskId, assignee) => {
    await db.tasks.update(taskId, { assignee });
  }, []);

  const addProject = useCallback(async (project) => {
    const { id, ...data } = project; 
    const newId = await db.projects.add(data);
    return { ...data, id: newId };
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    await db.projects.update(id, updates);
  }, []);

  const deleteProject = useCallback(async (id) => {
    await db.transaction('rw', db.projects, db.tasks, async () => {
      await db.projects.delete(id);
      await db.tasks.where('projectId').equals(id).delete();
    });
  }, []);

  const recalcProjectProgress = useCallback(async (projectId) => {
    if (!projectId) return;
    const projectTasks = await db.tasks.where('projectId').equals(projectId).toArray();
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === 'Concluída').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await db.projects.update(projectId, { progress, tasksCompleted: completed, tasksTotal: total });
  }, []);

  const addTask = useCallback(async (task) => {
    const { id, ...data } = task;
    const newId = await db.tasks.add(data);
    await recalcProjectProgress(data.projectId);
    return { ...data, id: newId };
  }, [recalcProjectProgress]);

  const updateTask = useCallback(async (id, updates) => {
    await db.tasks.update(id, updates);
    const task = await db.tasks.get(id);
    if (task) await recalcProjectProgress(task.projectId);
  }, [recalcProjectProgress]);

  const deleteTask = useCallback(async (id) => {
    const task = await db.tasks.get(id);
    await db.tasks.delete(id);
    if (task) await recalcProjectProgress(task.projectId);
  }, [recalcProjectProgress]);

  const addUser = useCallback(async (user) => {
    const { id, ...data } = user;
    const newId = await db.users.add({ ...data, createdAt: new Date().toISOString() });
    return { ...data, id: newId };
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    await db.users.update(id, updates);
    if (currentUser?.id === id) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('galiza_user', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  const deleteUser = useCallback(async (id) => {
    await db.users.delete(id);
  }, []);

  const stats = {
    totalProjects: projects.length,
    overallProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0,
    pendingTasks: tasks.filter((t) => t.status !== 'Concluída').length,
    urgentTasks: tasks.filter((t) => t.daysLate > 0 && t.status !== 'Concluída').length,
    completedTasks: tasks.filter((t) => t.status === 'Concluída').length,
    totalCollaborators: users.length,
  };

  const value = {
    isDbReady,
    isLoading,
    currentUser,
    isAdmin,
    login,
    logout,
    projects,
    tasks,
    userTasks,
    users,
    stats,
    userStats,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addUser,
    updateUser,
    deleteUser,
    getAllAssignees,
    assignTask,
  };

  return (
    <AppContext.Provider value={value}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </Router>
    </AppContext.Provider>
  );
}

export default AppContent;