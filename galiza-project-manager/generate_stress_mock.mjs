import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanOldData() {
  console.log('🗑️ Limpando tarefas antigas para o novo teste de estresse...');
  const { error } = await supabase.from('tasks').delete().neq('id', 0); // Deleta tudo
  if (error) console.error('Erro ao limpar:', error);
}

async function generateStressMock() {
  console.log('🚀 Iniciando Mega Geração de Mock (Agosto 2025 - Junho 2026)');
  
  await cleanOldData();

  const { data: users } = await supabase.from('users').select('id');
  const { data: projects } = await supabase.from('projects').select('id');

  if (!users?.length || !projects?.length) {
    console.error('Erro: Precisa de usuários e projetos no banco primeiro.');
    return;
  }

  const startDate = new Date('2025-08-01');
  const endDate = new Date('2026-06-30');
  
  let allTasks = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    console.log(`📅 Gerando semana de ${currentDate.toLocaleDateString()}...`);
    
    for (let i = 0; i < 20; i++) {
      const taskDate = new Date(currentDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      const isPerfect = Math.random() > 0.2;
      
      const task = {
        title: `Manutenção Técnica - ${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: 'Gerado automaticamente para teste de KPI OPE 009',
        status: 'Concluída',
        priority: Math.random() > 0.7 ? 'Alta' : 'Média',
        project_id: projects[Math.floor(Math.random() * projects.length)].id,
        assignee_id: users[Math.floor(Math.random() * users.length)].id,
        due_date: taskDate.toISOString(),
        measurement_type: 'Percentual',
        measurement_target: 100,
        measurement_current: 100,
        executions: [
          {
            id: Date.now() + Math.random(),
            data: taskDate.toISOString().split('T')[0],
            timestamp: taskDate.toISOString(),
            colaboradorId: users[Math.floor(Math.random() * users.length)].id,
            quantidade: 1,
            observacao: isPerfect ? 'Execução validada com sucesso' : 'Inconsistência detectada no diagnóstico',
            kpiValues: isPerfect ? {
              'Hora_abertura_OS': new Date(taskDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
              'Hora_diagnóstico_confirmado': new Date(taskDate.getTime() - 1 * 60 * 60 * 1000).toISOString(),
              'N_OS_período': Math.floor(Math.random() * 20 + 5).toString()
            } : {
              'Hora_abertura_OS': 'Data_invalida_9999',
              'N_OS_período': '-1'
            }
          }
        ]
      };
      allTasks.push(task);
    }

    // Inserir em lotes de 100 para não estourar o limite
    if (allTasks.length >= 100) {
      const { error } = await supabase.from('tasks').insert(allTasks);
      if (error) console.error('Erro ao inserir lote:', error);
      allTasks = [];
    }

    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Inserir restante
  if (allTasks.length > 0) {
    await supabase.from('tasks').insert(allTasks);
  }

  console.log('✅ MEGA MOCK CONCLUÍDO!');
}

generateStressMock();
