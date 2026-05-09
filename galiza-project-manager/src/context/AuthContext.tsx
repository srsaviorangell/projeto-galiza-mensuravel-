import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        return user.email === 'sudo@galizanet.com.br' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'sudo';
      } catch { return false; }
    }
    return false;
  });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  const loadUserProfile = async (sessionUser) => {
    if (!sessionUser) return;
    const isSudoEmail = sessionUser.email === 'sudo@galizanet.com.br';

    try {
      let { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (!userData) {
        const { data: userByEmail } = await supabase
          .from('users').select('*').eq('email', sessionUser.email).single();
        userData = userByEmail || null;
      }

      if (userData) {
        if (isSudoEmail && userData.role !== 'sudo') {
          await supabase.from('users').update({ role: 'sudo', id: sessionUser.id }).eq('email', sessionUser.email);
          userData.role = 'sudo';
        }
        
        setIsFirstAccess(false);
        const isUserAdmin = isSudoEmail || userData.role?.toLowerCase() === 'admin' || userData.role?.toLowerCase() === 'sudo';
        setIsAdmin(isUserAdmin);
        
        const fullUser = { ...sessionUser, ...userData, role: isSudoEmail ? 'sudo' : userData.role };
        setCurrentUser(fullUser);
        localStorage.setItem('currentUser', JSON.stringify(fullUser));
      } else {
        const newRole = isSudoEmail ? 'sudo' : 'user';
        const newUser = {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.email.split('@')[0],
          role: newRole,
          first_access: !isSudoEmail,
          status: 'Ativo',
          created_at: new Date().toISOString()
        };
        await supabase.from('users').insert([newUser]);
        setIsFirstAccess(!isSudoEmail);
        setIsAdmin(isSudoEmail);
        const fullUser = { ...sessionUser, ...newUser };
        setCurrentUser(fullUser);
        localStorage.setItem('currentUser', JSON.stringify(fullUser));
      }
    } catch (e) {
      console.error('Erro ao carregar perfil:', e);
      setIsAdmin(isSudoEmail);
      setCurrentUser(prev => prev || { ...sessionUser, role: isSudoEmail ? 'sudo' : 'user' });
    }
  };

  const fetchFromSupabase = async (table) => {
    try {
      // Adicionado order=id.desc e limit=4000 para garantir que os dados mais recentes do stress test apareçam
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.desc&limit=4000`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 5000);

    const initialize = async () => {
      try {
        // Carrega dados iniciais em paralelo
        const [projectsData, tasksData, usersData] = await Promise.all([
          fetchFromSupabase('projects'),
          fetchFromSupabase('tasks'),
          fetchFromSupabase('users')
        ]);

        if (!isMounted) return;

        const mapTaskToCamelCase = (t) => ({
          ...t,
          projectId: t.project_id,
          assigneeId: t.assignee_id,
          dueDate: t.due_date,
          measurementTarget: t.measurement_target,
          measurementCurrent: t.measurement_current,
          measurementType: t.measurement_type,
          kpiEnabled: t.kpi_enabled,
          kpiCode: t.kpi_code,
          kpiCategory: t.kpi_category,
          kpiParams: t.kpi_params
        });

        const mapProjectToCamelCase = (p) => ({
          ...p,
          startDate: p.start_date,
          endDate: p.end_date,
          tasksCompleted: p.tasks_completed,
          tasksTotal: p.tasks_total
        });

        setProjects(Array.isArray(projectsData) ? projectsData.map(mapProjectToCamelCase) : []);
        setTasks(Array.isArray(tasksData) ? tasksData.map(mapTaskToCamelCase) : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error('Erro na inicialização:', err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setSession(session);

      if (!session?.user) {
        if (!localStorage.getItem('currentUser')) {
          setCurrentUser(null);
          setIsAdmin(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUserProfile(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const completeProfile = async (userData) => {
    try {
      const storedUserStr = localStorage.getItem('currentUser');
      let userEmail;
      
      if (storedUserStr) {
        userEmail = JSON.parse(storedUserStr).email;
      } else if (currentUser) {
        userEmail = currentUser.email;
      }

      if (!userEmail) {
        // Tenta obter do Auth caso não esteja no state/storage
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userEmail = user.email;
      }

      if (!userEmail) {
        throw new Error('Usuário não identificado.');
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(userEmail.toLowerCase())}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: userData.name,
          specialty: userData.specialty,
          phone: userData.phone,
          first_access: false
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar o perfil no banco');
      }

      if (storedUserStr) {
        const updatedUser = { ...JSON.parse(storedUserStr), ...userData, first_access: false };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }

      setIsFirstAccess(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const addUser = async (userData) => {
    try {
      const tempPassword = Math.random().toString(36).slice(-8);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase(),
        password: tempPassword,
        options: {
          data: {
            name: userData.name,
            specialty: userData.specialty,
            phone: userData.phone,
            role: userData.role || 'user',
            first_access: true
          }
        }
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase.from('users').insert([{
        id: authData.user.id,
        email: userData.email.toLowerCase(),
        name: userData.name,
        specialty: userData.specialty,
        phone: userData.phone,
        role: userData.role || 'user',
        status: userData.status || 'Ativo',
        first_access: true,
        created_at: new Date().toISOString()
      }]);
      if (dbError) throw dbError;

      const inviteLink = `${window.location.origin}/login`;
      setUsers(prev => [...prev, { id: authData.user.id, ...userData }]);
      return { success: true, user: authData.user, tempPassword, inviteLink };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      if (updates.password) {
        const { error: authError } = await supabase.auth.updateUser({ password: updates.password });
        if (authError) throw authError;
      }
      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createInvite = async (email, role = 'user') => {
    return { success: false, error: "Not implemented in AuthContext" };
  };

  const logout = async () => {
    setCurrentUser(null);
    setSession(null);
    setIsFirstAccess(false);
    setIsAdmin(false);
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  const userTasks = tasks.filter(t => String(t.assigneeId) === String(currentUser?.id) || String(t.assignee_id) === String(currentUser?.id) || t.assignee === currentUser?.name);

  const stats = {
    totalProjects: projects.length,
    completedTasks: tasks.filter(t => t.status === 'Concluída').length,
    pendingTasks: tasks.filter(t => t.status !== 'Concluída').length,
  };

  const userStats = {
    totalProjects: new Set(userTasks.map(t => t.projectId)).size,
    completedTasks: userTasks.filter(t => t.status === 'Concluída').length,
    pendingTasks: userTasks.filter(t => t.status !== 'Concluída').length,
  };

  const mapTaskToSnakeCase = (t) => {
    const { 
      projectId, assigneeId, dueDate, measurementTarget, 
      measurementCurrent, measurementType, daysLate, assignee, name,
      kpiEnabled, kpiCode, kpiCategory, kpiParams,
      ...rest 
    } = t;
    return {
      ...rest,
      project_id: projectId || null,
      assignee_id: assigneeId || null,
      due_date: dueDate ? dueDate : null,
      measurement_target: measurementTarget !== undefined ? measurementTarget : rest.measurement_target,
      measurement_current: measurementCurrent !== undefined ? measurementCurrent : rest.measurement_current,
      measurement_type: measurementType !== undefined ? measurementType : rest.measurement_type,
      days_late: daysLate !== undefined ? daysLate : rest.days_late,
      kpi_enabled: kpiEnabled !== undefined ? kpiEnabled : rest.kpi_enabled,
      kpi_code: kpiCode !== undefined ? kpiCode : rest.kpi_code,
      kpi_category: kpiCategory !== undefined ? kpiCategory : rest.kpi_category,
      kpi_params: kpiParams !== undefined ? kpiParams : rest.kpi_params
    };
  };

  const mapProjectToSnakeCase = (p) => {
    const { 
      startDate, endDate, tasksCompleted, tasksTotal, 
      files, links, deadline, deadlineStatus, progress, ...rest 
    } = p;
    
    return {
      ...rest,
      progress: progress !== undefined ? progress : rest.progress,
      start_date: startDate !== undefined ? (startDate || null) : rest.start_date,
      end_date: endDate !== undefined ? (endDate || null) : rest.end_date,
      tasks_completed: tasksCompleted !== undefined ? tasksCompleted : rest.tasks_completed,
      tasks_total: tasksTotal !== undefined ? tasksTotal : rest.tasks_total
    };
  };

  const refreshData = async () => {
    try {
      const [projectsData, tasksData, usersData] = await Promise.all([
        fetchFromSupabase('projects'),
        fetchFromSupabase('tasks'),
        fetchFromSupabase('users')
      ]);

      const mapTaskToCamelCase = (t) => ({
        ...t,
        projectId: t.project_id,
        assigneeId: t.assignee_id,
        dueDate: t.due_date,
        measurementTarget: t.measurement_target,
        measurementCurrent: t.measurement_current,
        measurementType: t.measurement_type,
        daysLate: t.days_late,
        kpiEnabled: t.kpi_enabled,
        kpiCode: t.kpi_code,
        kpiCategory: t.kpi_category,
        kpiParams: t.kpi_params
      });

      const mapProjectToCamelCase = (p) => ({
        ...p,
        startDate: p.start_date,
        endDate: p.end_date,
        tasksCompleted: p.tasks_completed,
        tasksTotal: p.tasks_total
      });

      setProjects(projectsData?.map(mapProjectToCamelCase) || []);
      setTasks(tasksData?.map(mapTaskToCamelCase) || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };

  const addProject = async (project) => {
    try {
      const dbProject = mapProjectToSnakeCase(project);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbProject)
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || 'Erro desconhecido na API');
      }
      const data = await res.json();
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const updateProject = async (id, updates) => {
    try {
      const dbUpdates = mapProjectToSnakeCase(updates);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(dbUpdates)
      });
      if (!res.ok) throw new Error(await res.text() || 'Erro na API');
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const deleteProject = async (id) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!res.ok) throw new Error(await res.text() || 'Erro na API');
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const addTask = async (task) => {
    try {
      const dbTask = mapTaskToSnakeCase(task);
      console.log('DEBUG KPI - Criando tarefa:', dbTask);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbTask)
      });
      console.log('DEBUG KPI - Resposta status:', res.status, res.ok);
      if (!res.ok) {
        const errText = await res.text();
        console.log('DEBUG KPI - Erro resposta:', errText);
        throw new Error(errText || 'Erro na API');
      }
      await refreshData();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const updateTask = async (id, updates) => {
    try {
      const dbUpdates = mapTaskToSnakeCase(updates);
      console.log('DEBUG KPI - Enviando para Supabase:', dbUpdates);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(dbUpdates)
      });
      if (!res.ok) throw new Error(await res.text() || 'Erro na API');
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!res.ok) throw new Error(await res.text() || 'Erro na API');
      setTasks(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const assignTask = async (taskId, assigneeId) => {
    return updateTask(taskId, { assignee_id: assigneeId });
  };

  const getAllAssignees = () => users;
  const addHistory = async (entityType, entityId, action, oldValue, newValue) => {
    try {
      const userId = currentUser?.id || null;
      const userName = currentUser?.name || currentUser?.email || 'Sistema';
      
      await fetch(`${SUPABASE_URL}/rest/v1/history`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: String(entityId),
          action,
          old_value: oldValue ? JSON.stringify(oldValue) : null,
          new_value: newValue ? JSON.stringify(newValue) : null,
          user_id: userId,
          user_name: userName
        })
      });
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  };

  const getHistory = async (entityType, entityId) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/history?entity_type=eq.${entityType}&entity_id=eq.${entityId}&order=timestamp.desc`,
        {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }
      );
      return await res.json();
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  };

  const deleteHistory = async (historyId) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/history?id=eq.${historyId}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir histórico:', error);
      return { success: false, error: error.message };
    }
  };

  const addKpiCollection = async (data) => {
    try {
      const { taskId, kpiCode, kpiCategory, quantidade, dataColeta, parametros, valores, collaboratorId, observacao } = data;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kpi_collections`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          task_id: taskId,
          kpi_code: kpiCode,
          kpi_category: kpiCategory,
          quantidade: quantidade,
          data_coleta: dataColeta,
          parametros: parametros,
          valores: valores,
          collaborator_id: collaboratorId,
          observacao: observacao
        })
      });
      if (!res.ok) throw new Error(await res.text() || 'Erro ao salvar KPI collection');
      const result = await res.json();
      console.log('[KPI COLLECTION] Salvo com sucesso:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro crítico ao salvar KPI collection:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    session,
    isLoading,
    isFirstAccess,
    isAdmin,
    projects,
    tasks,
    users,
    stats,
    userStats,
    userTasks,
    completeProfile,
    logout,
    addUser,
    updateUser,
    deleteUser,
    createInvite,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    assignTask,
    getAllAssignees,
    addHistory,
    getHistory,
    deleteHistory,
    addKpiCollection
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}