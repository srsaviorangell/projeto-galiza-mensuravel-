import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { validateEmailDomain, sendInvite, verifyInvite, acceptInvite, checkFirstAccess } from '../lib/auth';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        setCurrentUser(session.user);
        
        const { data: userData } = await supabase
          .from('users')
          .select('first_access, role, name, specialty, phone')
          .eq('id', session.user.id)
          .single();
        
        setIsFirstAccess(userData?.first_access ?? true);
      }
      
      setIsLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_access')
          .eq('id', session.user.id)
          .single();
        
        setIsFirstAccess(userData?.first_access ?? true);
      } else {
        setIsFirstAccess(false);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!validateEmailDomain(email)) {
      return { success: false, error: 'Apenas emails @galizanet.com.br são permitidos' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      });

      if (error) throw error;

      const { data: userData } = await supabase
        .from('users')
        .select('first_access, role, name, specialty, phone')
        .eq('id', data.user.id)
        .single();

      setIsFirstAccess(userData?.first_access ?? true);
      setCurrentUser(data.user);
      setSession(data.session);

      return { success: true, user: data.user, isFirstAccess: userData?.first_access ?? true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login' 
      };
    }
  };

  const signup = async (email, password, name, specialty = '', phone = '') => {
    if (!validateEmailDomain(email)) {
      return { success: false, error: 'Apenas emails @galizanet.com.br são permitidos' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            name,
            specialty,
            phone,
            role: 'user',
            first_access: true
          }
        }
      });

      if (error) throw error;

      await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: email.toLowerCase(),
          name,
          specialty,
          phone,
          role: 'user',
          first_access: true,
          created_at: new Date().toISOString()
        }]);

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createInvite = async (email, role = 'user') => {
    return await sendInvite(email, role);
  };

  const acceptInviteToken = async (token, password, name, specialty = '', phone = '') => {
    return await acceptInvite(token, { password, name, specialty, phone });
  };

  const completeProfile = async (userData) => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          specialty: userData.specialty,
          phone: userData.phone,
          first_access: false
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setIsFirstAccess(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setIsFirstAccess(false);
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sudo';
  const isSudo = currentUser?.role === 'sudo';

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    return error ? [] : (data || []);
  }, []);

  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers().then(setUsers);
    }
  }, [currentUser, fetchUsers]);

  const addUser = async (userData) => {
    if (!validateEmailDomain(userData.email)) {
      return { success: false, error: 'Apenas emails @galizanet.com.br são permitidos' };
    }

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

      const { error: dbError } = await supabase
        .from('users')
        .insert([{
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

      return { 
        success: true, 
        user: authData.user,
        tempPassword,
        inviteLink 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      if (updates.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: updates.password
        });
        if (authError) throw authError;
      }

      const { error } = await supabase
        .from('users')
        .updates(updates)
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    session,
    isLoading,
    isFirstAccess,
    isAdmin,
    isSudo,
    login,
    logout,
    signup,
    createInvite,
    acceptInviteToken,
    completeProfile,
    users,
    addUser,
    updateUser,
    deleteUser,
    fetchUsers
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
