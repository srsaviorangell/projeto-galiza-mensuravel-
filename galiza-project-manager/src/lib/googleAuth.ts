import { supabase } from './supabase';

const COMMERCIAL_DOMAIN = '@galizanet.com.br';

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    return { success: true, url: data.url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const validateGoogleEmail = async (email: string) => {
  if (!email.toLowerCase().endsWith(COMMERCIAL_DOMAIN)) {
    return {
      valid: false,
      error: `Apenas emails ${COMMERCIAL_DOMAIN} são permitidos. Use sua conta corporativa.`
    };
  }
  return { valid: true };
};

export const handleGoogleCallback = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const emailValidation = validateGoogleEmail(user.email);
    if (!emailValidation.valid) {
      await supabase.auth.signOut();
      return emailValidation;
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          specialty: '',
          phone: '',
          role: 'user',
          first_access: true,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;
    }

    return { 
      success: true, 
      user,
      isFirstAccess: !existingUser || existingUser.first_access
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
