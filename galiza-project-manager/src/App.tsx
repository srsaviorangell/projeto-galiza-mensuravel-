import { useState, useEffect, useMemo } from 'react';
import { createContext, useContext, useCallback } from 'react';
import { supabase } from './lib/supabase';
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
  const { isLoading, currentUser } = useApp();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#FF5E2A', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#64748b' }}>Carregando dados da nuvem...</p>
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

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  // Helpers para mapear nomes de campos
  const mapProject = (p) => {
    if (!p) return null;
    return {
      ...p,
      startDate: p.start_date,
      endDate: p.end_date,
      tasksCompleted: p.tasks_completed,
      tasksTotal: p.tasks_total
    };
  };

  const mapTask = (t) => {
    if (!t) return null;
    return {
      ...t,
      id: t.id,
      title: t.title,
      name: t.title,
      status: t.status,
      projectId: t.project_id,
      assigneeId: t.assignee_id,
      dueDate: t.due_date,
      measurementTarget: t.measurement_target || 1,
      measurementCurrent: t.measurement_current || 0,
      measurementType: t.measurement_type || 'UN',
      daysLate: t.days_late || 0,
      created_at: t.created_at
    };
  };

  // Função para carregar todos os dados do Supabase
  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes, userRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ]);

      if (projRes.error) {
        console.error('Erro ao carregar projetos:', projRes.error.message);
      }
      if (taskRes.error) {
        console.error('Erro ao carregar tarefas:', taskRes.error.message);
      }
      if (userRes.error) {
        console.error('Erro ao carregar usuários:', userRes.error.message);
      }

      if (projRes.data) setProjects(projRes.data.map(mapProject));
      if (taskRes.data) setTasks(taskRes.data.map(mapTask));
      if (userRes.data) setUsers(userRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  const addHistory = useCallback(async (entry) => {
    const { entityType, entityId, action, oldValue, newValue } = entry;
    await supabase.from('history').insert([{
      entity_type: entityType,
      entity_id: String(entityId),
      action,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      user_id: currentUser?.id,
      user_name: currentUser?.name || currentUser?.email
    }]);
  }, [currentUser]);

  const getHistory = useCallback(async (entityType, entityId) => {
    const { data } = await supabase
      .from('history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', String(entityId))
      .order('timestamp', { ascending: false });
    
    return (data || []).map(h => ({
      ...h,
      entityType: h.entity_type,
      entityId: h.entity_id,
      oldValue: h.old_value,
      newValue: h.new_value,
      userName: h.user_name
    }));
  }, []);

  const deleteHistory = useCallback(async (historyId) => {
    const { error } = await supabase.from('history').delete().eq('id', historyId);
    if (error) throw error;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchData();
        
        const savedUserStr = localStorage.getItem('galiza_user');
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            const { data, error } = await supabase.from('users').select('*').eq('email', savedUser.email).maybeSingle();
            if (data && !error) {
              setCurrentUser(data);
            } else {
              localStorage.removeItem('galiza_user');
              setCurrentUser(null);
            }
          } catch (e) {
            localStorage.removeItem('galiza_user');
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Falha na inicialização:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchData]);

  const login = useCallback(async (email, password) => {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return { success: false, error: 'Usuário não encontrado' };
    
    if (user.password && user.password !== password && user.role !== 'sudo') {
      return { success: false, error: 'Senha incorreta' };
    }
    if (user.role === 'sudo' && password !== 'sudo123') {
      return { success: false, error: 'Senha incorreta' };
    }
    
    const userData = { id: user.id, name: user.name || user.email, email: user.email, role: user.role };
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
    return tasks.filter(t => String(t.assigneeId) === String(currentUser?.id) || t.assignee === currentUser?.name);
  }, [tasks, isAdmin, currentUser]);

  const stats = useMemo(() => {
    return {
      totalProjects: projects.length,
      overallProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0,
      pendingTasks: tasks.filter((t) => t.status !== 'Concluída').length,
      urgentTasks: tasks.filter((t) => t.days_late > 0 && t.status !== 'Concluída').length,
      completedTasks: tasks.filter((t) => t.status === 'Concluída').length,
      totalCollaborators: users.length,
    };
  }, [projects, tasks, users]);

  const userStats = useMemo(() => {
    return {
      totalProjects: projects.length,
      overallProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0,
      pendingTasks: userTasks.filter((t) => t.status !== 'Concluída').length,
      urgentTasks: userTasks.filter((t) => t.days_late > 0 && t.status !== 'Concluída').length,
      completedTasks: userTasks.filter((t) => t.status === 'Concluída').length,
      totalCollaborators: users.length,
    };
  }, [projects, userTasks, users]);

  const getAllAssignees = useCallback(() => {
    return users.map(u => ({ id: u.id, name: u.name || u.email, type: 'user', role: u.role }));
  }, [users]);

  const updateProject = useCallback(async (id, updates) => {
    const dbUpdates = { ...updates };
    if (updates.startDate) { dbUpdates.start_date = updates.startDate; delete dbUpdates.startDate; }
    if (updates.endDate) { dbUpdates.end_date = updates.endDate; delete dbUpdates.endDate; }
    
    const { data: oldData } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    const mapped = mapProject(data);
    if (mapped) {
      setProjects(prev => prev.map(p => p.id === id ? mapped : p));
      await addHistory({ entityType: 'project', entityId: id, action: 'update', oldValue: mapProject(oldData), newValue: mapped });
    }
  }, [addHistory]);

  const addProject = useCallback(async (project) => {
    const dbData = {
      name: project.name,
      description: project.description,
      status: project.status,
      difficulty: project.difficulty,
      progress: project.progress,
      start_date: project.startDate,
      end_date: project.endDate
    };
    const { data, error } = await supabase.from('projects').insert([dbData]).select().single();
    if (error) throw error;
    const mapped = mapProject(data);
    setProjects(prev => [mapped, ...prev]);
    await addHistory({ entityType: 'project', entityId: data.id, action: 'create', newValue: mapped });
    return mapped;
  }, [addHistory]);

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId === id || t.project_id === id));
  }, []);

  const recalcProjectProgress = useCallback(async (projectId) => {
    if (!projectId) return;
    const { data: projectTasks } = await supabase.from('tasks').select('*').eq('project_id', projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === 'Concluída').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await updateProject(projectId, { progress, tasks_completed: completed, tasks_total: total });
  }, [updateProject]);

  const addTask = useCallback(async (task) => {
    const dbData: Record<string, any> = {
      title: task.title || task.name || 'Sem título',
      description: task.description || '',
      status: task.status || 'A Fazer',
      priority: task.priority || 'Média',
      project_id: task.projectId || task.project_id || null,
      assignee_id: task.assigneeId || task.assignee_id || null,
      due_date: task.dueDate || task.due_date || null,
      measurement_target: Number(task.measurementTarget) || 1,
      measurement_current: Number(task.measurementCurrent) || 0,
      measurement_type: task.measurementType || 'UN',
      color: task.color || 'var(--accent)',
      executions: task.executions || []
    };
    
    const { data, error } = await supabase.from('tasks').insert([dbData]).select().single();
    if (error) {
      console.error('Erro ao adicionar tarefa no Supabase:', error);
      throw error;
    }
    const mapped = mapTask(data);
    if (mapped) {
      setTasks(prev => [mapped, ...prev]);
      if (mapped.projectId) {
        await recalcProjectProgress(mapped.projectId);
      }
      await addHistory({ entityType: 'task', entityId: data.id, action: 'create', newValue: mapped });
    }
    return mapped;
  }, [addHistory, recalcProjectProgress]);

  const updateTask = useCallback(async (id, updates) => {
    const dbUpdates: Record<string, any> = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.name !== undefined) dbUpdates.title = updates.name;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.project_id !== undefined) dbUpdates.project_id = updates.project_id;
    if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
    if (updates.assignee_id !== undefined) dbUpdates.assignee_id = updates.assignee_id;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
    if (updates.measurementTarget !== undefined) dbUpdates.measurement_target = updates.measurementTarget;
    if (updates.measurementCurrent !== undefined) dbUpdates.measurement_current = updates.measurementCurrent;
    if (updates.measurementType !== undefined) dbUpdates.measurement_type = updates.measurementType;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.executions !== undefined) dbUpdates.executions = updates.executions;

    const { data: oldData } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
    const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).select().maybeSingle();
    
    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
    
    if (data) {
      const mapped = mapTask(data);
      setTasks(prev => prev.map(t => t.id === id ? mapped : t));
      if (mapped.projectId) {
        await recalcProjectProgress(mapped.projectId);
      }
      await addHistory({ entityType: 'task', entityId: id, action: 'update', oldValue: mapTask(oldData), newValue: mapped });
    }
  }, [addHistory, recalcProjectProgress]);

  const deleteTask = useCallback(async (id) => {
    const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
    if (task) await recalcProjectProgress(task.project_id);
  }, [recalcProjectProgress]);

  const addUser = useCallback(async (user) => {
    const dbData = { ...user };
    if (dbData.createdAt) {
      dbData.created_at = dbData.createdAt;
      delete dbData.createdAt;
    }
    const { data, error } = await supabase.from('users').insert([dbData]).select().single();
    if (error) throw error;
    setUsers(prev => [data, ...prev]);
    return data;
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setUsers(prev => prev.map(u => u.id === id ? data : u));
    if (currentUser?.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  }, [currentUser]);

  const deleteUser = useCallback(async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const assignTask = useCallback(async (taskId, assignee) => {
    await updateTask(taskId, { assignee });
  }, [updateTask]);

  const value = {
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
    fetchData,
    addHistory,
    getHistory,
    deleteHistory
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