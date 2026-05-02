import { supabase } from './supabase';

const COMMERCIAL_DOMAIN = '@galizanet.com.br';

export const validateEmailDomain = (email: string): boolean => {
  return email.toLowerCase().endsWith(COMMERCIAL_DOMAIN);
};

export const sendInvite = async (email: string, role: string = 'user') => {
  if (!validateEmailDomain(email)) {
    return { success: false, error: 'Apenas emails @galizanet.com.br são permitidos' };
  }

  const inviteToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    const { data, error } = await supabase
      .from('invites')
      .insert([
        {
          email: email.toLowerCase(),
          token: inviteToken,
          role,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        }
      ]);

    if (error) throw error;

    return { 
      success: true, 
      token: inviteToken,
      link: `${window.location.origin}/invite/${inviteToken}`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const verifyInvite = async (token: string) => {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { valid: false, error: 'Convite inválido ou expirado' };
    }

    return { valid: true, invite: data };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
};

export const acceptInvite = async (token: string, userData: any) => {
  try {
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return { success: false, error: 'Convite inválido' };
    }

    const { data: user, error: userError } = await supabase.auth.signUp({
      email: invite.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          specialty: userData.specialty,
          phone: userData.phone,
          role: invite.role,
          first_access: false
        }
      }
    });

    if (userError) throw userError;

    await supabase
      .from('invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('token', token);

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const completeFirstAccess = async (userId: string, userData: any) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: userData.name,
        specialty: userData.specialty,
        phone: userData.phone,
        first_access: false
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const checkFirstAccess = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('first_access')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { isFirstAccess: data?.first_access ?? false };
  } catch (error: any) {
    return { isFirstAccess: false, error: error.message };
  }
};
