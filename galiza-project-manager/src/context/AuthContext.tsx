import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';
const SUPABASE_SERVICE_ROLE = import.meta.env.VITE_SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE2MDQxNSwiZXhwIjoyMDkxNzM2NDE1fQ.lNeSwWo7-MZIt2HAWOx_7tT0jZL_K-8XC4C-cDbOznQ';

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
  const [kpiCollections, setKpiCollections] = useState([]);
  const [kpisTableExists, setKpisTableExists] = useState(true);
  const [paramsTableExists, setParamsTableExists] = useState(true);

  const [kpis, _setKpis] = useState(() => {
    const saved = localStorage.getItem('global_kpis');
    try {
      return saved ? JSON.parse(saved) : [
        { 
          id: 'ope009', 
          code: 'OPE 009', 
          name: 'Tempo Médio de Diagnóstico', 
          category: 'Operacional',
          unit: 'horas',
          color: '#f59e0b',
          params: ['Hora_abertura_OS', 'Hora_diagnóstico_confirmado', 'N_OS_período'],
          linkedParams: ['p1', 'p2', 'p3']
        }
      ];
    } catch {
      return [];
    }
  });

  const [globalParams, _setGlobalParams] = useState(() => {
    const saved = localStorage.getItem('global_kpi_params');
    try {
      return saved ? JSON.parse(saved) : [
        { id: 'p1', name: 'Hora_abertura_OS', type: 'Timestamp', source: 'Sistema de OS', desc: 'Momento da geração da OS no sistema' },
        { id: 'p2', name: 'Hora_diagnóstico_confirmado', type: 'Timestamp', source: 'Bot WhatsApp', desc: 'Técnico declara causa + gestor valida' },
        { id: 'p3', name: 'N_OS_período', type: 'Inteiro', source: 'Histórico de OS', desc: 'Total de OS encerradas no período' },
      ];
    } catch {
      return [];
    }
  });

  const deleteFromSupabase = async (table, id) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
    } catch (err) {
      console.error(`Erro ao deletar de ${table}:`, err);
    }
  };

  const upsertToSupabase = async (table, items) => {
    try {
      const formatted = items.map(item => {
        if (table === 'kpis') {
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            category: item.category,
            unit: item.unit,
            color: item.color,
            description: item.description || '',
            params: item.params || [],
            linked_params: item.linkedParams || item.linked_params || [],
            formula: item.formula || ''
          };
        } else {
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            source: item.source || '',
            desc: item.desc || ''
          };
        }
      });

      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(formatted)
      });
    } catch (err) {
      console.error(`Erro ao fazer upsert em ${table}:`, err);
    }
  };

  const setKpis = async (newKpis) => {
    const nextKpis = typeof newKpis === 'function' ? newKpis(kpis) : newKpis;
    _setKpis(nextKpis);
    localStorage.setItem('global_kpis', JSON.stringify(nextKpis));

    if (kpisTableExists) {
      const currentIds = kpis.map(k => k.id);
      const nextIds = nextKpis.map(k => k.id);
      const deletedIds = currentIds.filter(id => !nextIds.includes(id));

      for (const id of deletedIds) {
        await deleteFromSupabase('kpis', id);
      }

      if (nextKpis.length > 0) {
        await upsertToSupabase('kpis', nextKpis);
      }
    }
  };

  const setGlobalParams = async (newParams) => {
    const nextParams = typeof newParams === 'function' ? newParams(globalParams) : newParams;
    _setGlobalParams(nextParams);
    localStorage.setItem('global_kpi_params', JSON.stringify(nextParams));

    if (paramsTableExists) {
      const currentIds = globalParams.map(p => p.id);
      const nextIds = nextParams.map(p => p.id);
      const deletedIds = currentIds.filter(id => !nextIds.includes(id));

      for (const id of deletedIds) {
        await deleteFromSupabase('global_kpi_params', id);
      }

      if (nextParams.length > 0) {
        await upsertToSupabase('global_kpi_params', nextParams);
      }
    }
  };


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
          matricula: '',
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

  const fetchFromSupabaseWithStatus = async (table) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!res.ok) {
        return { error: true, status: res.status };
      }
      const data = await res.json();
      return { data };
    } catch (err) {
      return { error: true, message: err.message };
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
        const [projectsData, tasksData, usersData, kpiCollectionsData, kpisRes, paramsRes] = await Promise.all([
          fetchFromSupabase('projects'),
          fetchFromSupabase('tasks'),
          fetchFromSupabase('users'),
          fetchFromSupabase('kpi_collections'),
          fetchFromSupabaseWithStatus('kpis'),
          fetchFromSupabaseWithStatus('global_kpi_params')
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

        const mapKpiCollectionToCamelCase = (k) => ({
          ...k,
          taskId: k.task_id,
          kpiCode: k.kpi_code,
          kpiCategory: k.kpi_category,
          dataColeta: k.data_coleta,
          collaboratorId: k.collaborator_id
        });

        if (kpisRes && !kpisRes.error && Array.isArray(kpisRes.data)) {
          setKpisTableExists(true);
          const mappedKpis = kpisRes.data.map(k => ({
            id: k.id,
            code: k.code,
            name: k.name,
            category: k.category,
            unit: k.unit,
            color: k.color,
            description: k.description,
            params: k.params || [],
            linkedParams: k.linked_params || [],
            formula: k.formula
          }));
          if (mappedKpis.length > 0) {
            _setKpis(mappedKpis);
            localStorage.setItem('global_kpis', JSON.stringify(mappedKpis));
          }
        } else {
          setKpisTableExists(false);
          console.log('[KPI SINC] Tabela kpis não disponível no Supabase. Fallback para localStorage ativo.');
        }

        if (paramsRes && !paramsRes.error && Array.isArray(paramsRes.data)) {
          setParamsTableExists(true);
          const mappedParams = paramsRes.data.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            source: p.source,
            desc: p.desc
          }));
          if (mappedParams.length > 0) {
            _setGlobalParams(mappedParams);
            localStorage.setItem('global_kpi_params', JSON.stringify(mappedParams));
          }
        } else {
          setParamsTableExists(false);
          console.log('[PARAM SINC] Tabela global_kpi_params não disponível no Supabase. Fallback para localStorage ativo.');
        }

        setProjects(Array.isArray(projectsData) ? projectsData.map(mapProjectToCamelCase) : []);
        setTasks(Array.isArray(tasksData) ? tasksData.map(mapTaskToCamelCase) : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setKpiCollections(Array.isArray(kpiCollectionsData) ? kpiCollectionsData.map(mapKpiCollectionToCamelCase) : []);
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
      const passwordToUse = userData.password || Math.random().toString(36).slice(-8);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase(),
        password: passwordToUse,
        options: {
          data: {
            name: userData.name,
            specialty: userData.specialty,
            phone: userData.phone,
            role: userData.role || 'user',
            matricula: userData.matricula || '',
            first_access: true
          }
        }
      });

      if (authError) {
        const message = authError.message || '';
        console.error('Auth signUp error:', authError);
        // Se já existe no Auth, tentamos recuperar o usuário via admin e criar o registro na tabela `users`
        if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already exists')) {
          try {
            // Tentar endpoint admin para listar usuários usando a chave de serviço
            const adminUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
            const adminRes = await fetch(adminUrl, {
              headers: { 
                apikey: SUPABASE_SERVICE_ROLE, 
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` 
              }
            });

            console.debug('Admin lookup status:', adminRes.status);

            if (adminRes.ok) {
              const adminJson = await adminRes.json();
              const adminUsersList = adminJson?.users || adminJson || [];
              const foundUser = adminUsersList.find(u => u.email?.toLowerCase() === userData.email.toLowerCase());
              const existingId = foundUser?.id;
              
              if (existingId) {
                // Inserir na tabela `users` usando REST com chave de serviço
                const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                  method: 'POST',
                  headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal'
                  },
                  body: JSON.stringify({
                    id: existingId,
                    email: userData.email.toLowerCase(),
                    password: passwordToUse,
                    name: userData.name,
                    specialty: userData.specialty || '',
                    phone: userData.phone || '',
                    role: userData.role || 'user',
                    status: userData.status || 'Ativo',
                    matricula: userData.matricula || '',
                    first_access: true,
                    created_at: new Date().toISOString()
                  })
                });

                if (!insertRes.ok) {
                  const errText = await insertRes.text();
                  console.error('Erro ao inserir usuário (fallback):', errText);
                  return { success: false, error: 'Usuário já existe no Auth, mas falha ao inserir no banco: ' + errText };
                }

                setUsers(prev => [...prev, { id: existingId, ...userData, created_at: new Date().toISOString() }]);
                return { success: true, user: { id: existingId }, tempPassword: passwordToUse, inviteLink: `${window.location.origin}/login` };
              }
            } else {
              const txt = await adminRes.text();
              console.warn('Admin lookup não retornou OK:', adminRes.status, txt);
            }

            // Se não encontramos via admin, checar se já existe linha em public.users
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(userData.email.toLowerCase())}`, {
              headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
            });

            if (checkRes.ok) {
              const rows = await checkRes.json();
              if (Array.isArray(rows) && rows.length > 0) {
                const row = rows[0];
                setUsers(prev => [...prev, { id: row.id, ...row }]);
                return { success: true, user: { id: row.id }, tempPassword: passwordToUse, inviteLink: `${window.location.origin}/login` };
              }
            } else {
              const txt = await checkRes.text();
              console.warn('Check public.users não OK:', checkRes.status, txt);
            }
          } catch (e) {
            console.error('Erro no fallback admin lookup:', e);
          }

          return { success: false, error: 'Usuário já cadastrado. Verifique o email e tente novamente.' };
        }
        throw authError;
      }

      if (!authData || !authData.user || !authData.user.id) {
        throw new Error('Falha ao criar usuário no Auth.');
      }

      // Usar API REST com chave de serviço para evitar problemas de RLS
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          id: authData.user.id,
          email: userData.email.toLowerCase(),
          password: passwordToUse,
          name: userData.name,
          specialty: userData.specialty || '',
          phone: userData.phone || '',
          role: userData.role || 'user',
          status: userData.status || 'Ativo',
          matricula: userData.matricula || '',
          first_access: true,
          created_at: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Erro ao inserir usuário no banco de dados');
      }

      const inviteLink = `${window.location.origin}/login`;
      setUsers(prev => [...prev, { 
         id: authData.user.id, 
         ...userData,
         created_at: new Date().toISOString()
      }]);
      return { success: true, user: authData.user, tempPassword: passwordToUse, inviteLink };
    } catch (error) {
      console.error('Erro em addUser:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      const { password, ...dbUpdates } = updates;
      
      // Password update only works for the current logged-in user in Supabase Auth
      if (password && userId === currentUser?.id) {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      const finalUpdates = password ? { ...dbUpdates, password } : dbUpdates;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(finalUpdates)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Erro ao atualizar no banco de dados');
      }
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...finalUpdates } : u));
      
      if (userId === currentUser?.id) {
        const updated = { ...currentUser, ...finalUpdates };
        setCurrentUser(updated);
        localStorage.setItem('currentUser', JSON.stringify(updated));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro em updateUser:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Erro ao excluir usuário no banco de dados');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } catch (error) {
      console.error('Erro em deleteUser:', error);
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
    
    const dbObj = { ...rest };
    
    if (projectId !== undefined) dbObj.project_id = projectId || null;
    if (assigneeId !== undefined) dbObj.assignee_id = assigneeId || null;
    if (dueDate !== undefined) dbObj.due_date = dueDate || null;
    
    if (measurementTarget !== undefined) dbObj.measurement_target = Number(measurementTarget);
    if (measurementCurrent !== undefined) dbObj.measurement_current = Number(measurementCurrent);
    
    if (measurementType !== undefined) dbObj.measurement_type = measurementType;
    if (daysLate !== undefined) dbObj.days_late = daysLate;
    if (kpiEnabled !== undefined) dbObj.kpi_enabled = kpiEnabled;
    if (kpiCode !== undefined) dbObj.kpi_code = kpiCode;
    if (kpiCategory !== undefined) dbObj.kpi_category = kpiCategory;
    if (kpiParams !== undefined) dbObj.kpi_params = kpiParams;
    // comments and attachments are stored as-is (JSONB, no rename needed)
    if (t.comments !== undefined) dbObj.comments = t.comments;
    if (t.attachments !== undefined) dbObj.attachments = t.attachments;
    
    return dbObj;
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
      const [projectsData, tasksData, usersData, kpiCollectionsData, kpisRes, paramsRes] = await Promise.all([
        fetchFromSupabase('projects'),
        fetchFromSupabase('tasks'),
        fetchFromSupabase('users'),
        fetchFromSupabase('kpi_collections'),
        fetchFromSupabaseWithStatus('kpis'),
        fetchFromSupabaseWithStatus('global_kpi_params')
      ]);

      const mapTaskToCamelCase = (t) => ({
        ...t,
        projectId: t.project_id,
        assigneeId: t.assignee_id,
        dueDate: t.due_date,
        measurementTarget: Number(t.measurement_target || 0),
        measurementCurrent: Number(t.measurement_current || 0),
        measurementType: t.measurement_type,
        daysLate: t.days_late,
        kpiEnabled: t.kpi_enabled,
        kpiCode: t.kpi_code,
        kpiCategory: t.kpi_category,
        kpiParams: t.kpi_params || [],
        comments: t.comments || [],
        attachments: t.attachments || []
      });

      const mapProjectToCamelCase = (p) => ({
        ...p,
        startDate: p.start_date,
        endDate: p.end_date,
        tasksCompleted: p.tasks_completed,
        tasksTotal: p.tasks_total
      });

      const mapKpiCollectionToCamelCase = (k) => ({
        ...k,
        taskId: k.task_id,
        kpiCode: k.kpi_code,
        kpiCategory: k.kpi_category,
        dataColeta: k.data_coleta,
        collaboratorId: k.collaborator_id
      });

      if (kpisRes && !kpisRes.error && Array.isArray(kpisRes.data)) {
        setKpisTableExists(true);
        const mappedKpis = kpisRes.data.map(k => ({
          id: k.id,
          code: k.code,
          name: k.name,
          category: k.category,
          unit: k.unit,
          color: k.color,
          description: k.description,
          params: k.params || [],
          linkedParams: k.linked_params || [],
          formula: k.formula
        }));
        if (mappedKpis.length > 0) {
          _setKpis(mappedKpis);
          localStorage.setItem('global_kpis', JSON.stringify(mappedKpis));
        }
      }

      if (paramsRes && !paramsRes.error && Array.isArray(paramsRes.data)) {
        setParamsTableExists(true);
        const mappedParams = paramsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          source: p.source,
          desc: p.desc
        }));
        if (mappedParams.length > 0) {
          _setGlobalParams(mappedParams);
          localStorage.setItem('global_kpi_params', JSON.stringify(mappedParams));
        }
      }

      setProjects(projectsData?.map(mapProjectToCamelCase) || []);
      setTasks(tasksData?.map(mapTaskToCamelCase) || []);
      setUsers(usersData || []);
      setKpiCollections(kpiCollectionsData?.map(mapKpiCollectionToCamelCase) || []);
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
      await refreshData();
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
      await refreshData();
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
    kpiCollections,
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
    addKpiCollection,
    kpis,
    setKpis,
    globalParams,
    setGlobalParams
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}