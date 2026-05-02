const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dgqmnzkauhpkpzhrnwlb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE2MDQxNSwiZXhwIjoyMDkxNzM2NDE1fQ.lNeSwWo7-MZIt2HAWOx_7tT0jZL_K-8XC4C-cDbOznQ'
);

async function fixSudo() {
  const authId = '08d1415b-7029-4573-bed4-ba71be96ffbb';
  const oldId = 'd80e452c-29cd-4dcc-9ba3-f04aa92ba39b';

  // Delete old user
  console.log('Removendo usuário antigo...');
  await supabase.from('users').delete().eq('id', oldId);

  // Insert new user with correct auth ID
  console.log('Criando usuário com ID correto...');
  const { error } = await supabase
    .from('users')
    .insert([{
      id: authId,
      email: 'sudo@galizanet.com.br',
      name: 'Administrador SUDO',
      role: 'sudo',
      first_access: false,
      specialty: '',
      phone: '',
      status: 'Ativo'
    }]);

  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log('✅ Usuário SUDO corrigido!');
    console.log('Agora faça logout e login novamente.');
  }
}

fixSudo();