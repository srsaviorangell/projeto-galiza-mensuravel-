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
  const mapProject = (p) => ({
    ...p,
    startDate: p.start_date,
    endDate: p.end_date,
    tasksCompleted: p.tasks_completed,
    tasksTotal: p.tasks_total
  });

  const mapTask = (t) => ({
    ...t,
    projectId: t.project_id,
    assigneeId: t.assignee_id,
    dueDate: t.due_date,
    measurementTarget: t.measurement_target,
    measurementCurrent: t.measurement_current,
    measurementType: t.measurement_type,
    daysLate: t.days_late || 0
  });

  // Função para carregar todos os dados do Supabase
  const fetchData = useCallback(async () => {
    try {
      console.log('🔄 Carregando dados do Supabase...');
      
      const [projRes, taskRes, userRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ]);

      console.log('📁 Projects:', projRes.data?.length || 0, projRes.error);
      console.log('📝 Tasks:', taskRes.data?.length || 0, taskRes.error);
      console.log('👥 Users:', userRes.data?.length || 0, userRes.error);

      if (projRes.data) setProjects(projRes.data.map(mapProject));
      if (taskRes.data) setTasks(taskRes.data.map(mapTask));
      if (userRes.data) setUsers(userRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      alert('Aviso: Não foi possível carregar dados da nuvem. Verifique sua conexão ou tabelas.');
    }
  }, []);

  const addHistory = useCallback(async (entry) => {
    console.log('Tentando gravar histórico:', entry);
    try {
      const { entityType, entityId, action, oldValue, newValue } = entry;
      const { error } = await supabase.from('history').insert([{
        entity_type: entityType,
        entity_id: String(entityId),
        action,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        user_id: currentUser?.id,
        user_name: currentUser?.name || currentUser?.email
      }]);
      if (error) {
        console.error('Erro no Supabase History:', error);
      } else {
        console.log('Histórico gravado com sucesso!');
      }
    } catch (e: any) {
      console.error('Falha fatal no histórico:', e);
      alert('Erro ao gravar histórico: ' + e.message);
    }
  }, [currentUser]);

  const deleteHistory = useCallback(async (historyId) => {
    try {
      // 1. Pegar o registro antes de deletar para saber o que reverter
      const { data: hRecord, error: hError } = await supabase.from('history').select('*').eq('id', historyId).single();
      if (hError || !hRecord) return false;

      // 2. Se for um update de tarefa, vamos REVERTER o valor
      if (hRecord.entity_type === 'task' && hRecord.action === 'update') {
        try {
          const oldVal = typeof hRecord.old_value === 'string' ? JSON.parse(hRecord.old_value) : hRecord.old_value;
          const newVal = typeof hRecord.new_value === 'string' ? JSON.parse(hRecord.new_value) : hRecord.new_value;

          if (newVal?.measurementCurrent !== undefined && oldVal?.measurementCurrent !== undefined) {
             const diff = Number(newVal.measurementCurrent) - Number(oldVal.measurementCurrent);
             if (diff > 0) {
                // Diminuir o progresso da tarefa
                const { data: task } = await supabase.from('tasks').select('*').eq('id', hRecord.entity_id).single();
                if (task) {
                  const updatedCurrent = Math.max(0, (task.measurement_current || 0) - diff);
                  const updatedStatus = updatedCurrent >= (task.measurement_target || 1) ? 'Concluída' : 'A Fazer';
                  
                  await supabase.from('tasks').update({ 
                    measurement_current: updatedCurrent,
                    status: updatedStatus 
                  }).eq('id', hRecord.entity_id);
                  
                  // Atualizar localmente
                  setTasks(prev => prev.map(t => String(t.id) === String(hRecord.entity_id) ? { ...t, measurementCurrent: updatedCurrent, status: updatedStatus } : t));
                }
             }
          }
        } catch (e) { console.error("Erro ao reverter:", e); }
      }

      // 3. Deletar o registro
      const { error } = await supabase.from('history').delete().eq('id', historyId);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao deletar histórico:', error);
      return false;
    }
  }, []);

  const getHistory = useCallback(async (entityType, entityId) => {
    const searchId = String(entityId);

    try {
      // Força bruta: Busca os dados e o próprio App filtra
      const { data, error } = await supabase
        .from('history')
        .select('*');

      if (error) throw error;
      
      // Filtro manual no JavaScript para garantir que não haja erro de tipo (string vs number)
      const filtered = (data || []).filter(h => 
        String(h.entity_id) === searchId && 
        (h.entity_type === entityType || h.entity_type === 'task')
      );

      return filtered.map(h => ({
        ...h,
        entityType: h.entity_type,
        entityId: h.entity_id,
        oldValue: h.old_value,
        newValue: h.new_value,
        userName: h.user_name
      }));
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
      
      const savedUserStr = localStorage.getItem('galiza_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const { data } = await supabase.from('users').select('*').eq('email', savedUser.email).single();
        if (data) {
          setCurrentUser(savedUser);
        } else {
          localStorage.removeItem('galiza_user');
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
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
    return tasks.filter(t => t.assignee === currentUser?.name);
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
    
    const { data: oldData } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    const mapped = mapProject(data);
    setProjects(prev => prev.map(p => p.id === id ? mapped : p));
    await addHistory({ entityType: 'project', entityId: id, action: 'update', oldValue: mapProject(oldData), newValue: mapped });
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
    setTasks(prev => prev.filter(t => t.project_id !== id));
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
    const dbData = {
      project_id: task.projectId || null,
      title: task.title || task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId || null,
      due_date: task.dueDate,
      measurement_target: task.measurementTarget,
      measurement_current: task.measurementCurrent,
      measurement_type: task.measurementType,
      color: task.color
    };
    delete (dbData as any).assignee;

    const { data, error } = await supabase.from('tasks').insert([dbData]).select().single();
    if (error) throw error;
    const mapped = mapTask(data);
    setTasks(prev => [mapped, ...prev]);
    await recalcProjectProgress(task.projectId);
    await addHistory({ entityType: 'task', entityId: data.id, action: 'create', newValue: mapped });
    return mapped;
  }, [recalcProjectProgress, addHistory]);

  const updateTask = useCallback(async (id, updates) => {
    try {
      const dbUpdates = { ...updates };
      delete dbUpdates.assignee; 
      if (updates.projectId !== undefined) { dbUpdates.project_id = updates.projectId || null; delete dbUpdates.projectId; }
      if (updates.assigneeId !== undefined) { dbUpdates.assignee_id = updates.assigneeId || null; delete dbUpdates.assigneeId; }
      if (updates.dueDate !== undefined) { dbUpdates.due_date = updates.dueDate; delete dbUpdates.dueDate; }
      if (updates.measurementTarget !== undefined) { dbUpdates.measurement_target = updates.measurementTarget; delete dbUpdates.measurementTarget; }
      if (updates.measurementCurrent !== undefined) { dbUpdates.measurement_current = updates.measurementCurrent; delete dbUpdates.measurementCurrent; }
      if (updates.measurementType !== undefined) { dbUpdates.measurement_type = updates.measurementType; delete dbUpdates.measurementType; }

      const { data: oldData } = await supabase.from('tasks').select('*').eq('id', id).single();
      
      // Auto-calculo de status: 100% = Concluído, < 100% = A Fazer
      if (oldData) {
        const currentTarget = updates.measurementTarget !== undefined ? updates.measurementTarget : oldData.measurement_target;
        const currentProg = updates.measurementCurrent !== undefined ? updates.measurementCurrent : oldData.measurement_current;
        
        if (updates.measurementCurrent !== undefined || updates.measurementTarget !== undefined) {
          dbUpdates.status = Number(currentProg) >= Number(currentTarget || 1) ? 'Concluída' : 'A Fazer';
        }
      }

      const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      
      const mapped = mapTask(data);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? mapped : t));
      if (data.project_id) await recalcProjectProgress(data.project_id);
      
      if (oldData) {
        await addHistory({ entityType: 'task', entityId: id, action: 'update', oldValue: mapTask(oldData), newValue: mapped });
      }
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      alert('Erro ao atualizar tarefa: ' + error.message);
    }
  }, [recalcProjectProgress, addHistory]);

  const deleteTask = useCallback(async (id) => {
    const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
    if (task) await recalcProjectProgress(task.project_id);
  }, [recalcProjectProgress]);

  const undoTaskComplete = useCallback(async (id) => {
    const { data: oldData } = await supabase.from('tasks').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('tasks').update({ status: 'A Fazer' }).eq('id', id).select().single();
    if (error) throw error;
    const mapped = mapTask(data);
    setTasks(prev => prev.map(t => t.id === id ? mapped : t));
    await addHistory({ entityType: 'task', entityId: id, action: 'undo_complete', oldValue: mapTask(oldData), newValue: mapped });
  }, [addHistory]);

  const addUser = useCallback(async (user) => {
    const dbData = { ...user };
    // Limpeza temporária para teste: removendo campos que o banco pode não ter
    delete dbData.specialty;
    delete dbData.phone;
    delete dbData.status;

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

  const assignTask = useCallback(async (taskId, assigneeId) => {
    await updateTask(taskId, { assigneeId });
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
    deleteHistory,
    undoTaskComplete
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