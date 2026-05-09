import crypto from 'crypto';

const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';

async function request(table, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro na tabela ${table}: ${errText}`);
  }
  return res.json();
}

async function run() {
  console.log('====================================');
  console.log('Iniciando geração de MOCK de Dados...');
  console.log('====================================');
  
  try {
    // 1. Gerar Usuários
    console.log('[1/3] Gerando 100 usuários...');
    const randomSuffix = Math.floor(Math.random() * 999999);
    const users = Array.from({ length: 100 }).map((_, i) => ({
      id: crypto.randomUUID(),
      email: `mockuser${i}_${randomSuffix}@stress.test`,
      name: `Colaborador Stress ${i} (${randomSuffix})`,
      role: 'user',
      status: 'Ativo',
      first_access: false,
      created_at: new Date().toISOString()
    }));
    const insertedUsers = await request('users', 'POST', users);
    console.log(`✅ ${insertedUsers.length} usuários inseridos.`);

    // 2. Gerar Projetos
    console.log('[2/3] Gerando 20 projetos...');
    const projects = Array.from({ length: 20 }).map((_, i) => ({
      name: `Projeto Stress ${i} - ${randomSuffix}`,
      description: `Projeto gerado para stress test ${i}`,
      difficulty: ['Fácil', 'Médio', 'Difícil'][Math.floor(Math.random() * 3)],
      start_date: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + Math.random() * 10000000000).toISOString().split('T')[0],
      tasks_completed: 0,
      tasks_total: 50,
      progress: Math.floor(Math.random() * 100)
    }));
    const insertedProjects = await request('projects', 'POST', projects);
    console.log(`✅ ${insertedProjects.length} projetos inseridos.`);

    // 3. Gerar Tarefas
    console.log('[3/3] Gerando 1000 tarefas com inconsistências...');
    const tasksToInsert = [];
    const possibleKpis = ['OPE 009', 'OPE 012', 'OPE 013', 'ENG 073', 'EXP.002', 'FIN 005'];
    
    for(let i=0; i<1000; i++) {
      const isPerfect = Math.random() > 0.3; // 70% perfeitas, 30% inconsistentes
      const project = insertedProjects[Math.floor(Math.random() * insertedProjects.length)];
      const assignee = insertedUsers[Math.floor(Math.random() * insertedUsers.length)];
      
      const target = Math.floor(Math.random() * 10) + 1;
      let current = isPerfect ? target : (Math.random() > 0.5 ? target + 5 : 0); // Inconsistência: +5 do target ou 0
      let status = current >= target ? 'Concluída' : 'A Fazer';
      
      // Data de vencimento e criação espalhada por um período de até 365 dias (1 ano) para trás para testar filtros longos
      const diasParaTras = Math.random() * 365;
      const baseDate = new Date(Date.now() - diasParaTras * 24 * 60 * 60 * 1000);
      const dueDate = new Date(baseDate.getTime() + (Math.random() * 5 * 24 * 60 * 60 * 1000)); // Vencia até 5 dias depois da base

      const statusOptions = ['A Fazer', 'Em Progresso', 'Concluída'];
      status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      // PARÂMETROS REAIS DO SISTEMA (Sincronizado com paramentos.md - APENAS OPE 009)
      const realParamsConfig = [
        { name: 'Hora_abertura_OS', type: 'Timestamp' },
        { name: 'Hora_diagnóstico_confirmado', type: 'Timestamp' },
        { name: 'N_OS_período', type: 'Inteiro' }
      ];
      
      const hasParams = Math.random() > 0.2;
      // Escolhe entre 1 e 3 parâmetros randômicos reais
      const selectedParams = hasParams ? 
        realParamsConfig.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1) : 
        [];
      
      let executions = [];
      if (current > 0) {
        const kpiValues = {};
        if (hasParams) {
          if (isPerfect) {
              selectedParams.forEach(param => {
                if (param.type === 'Timestamp') {
                  const time = new Date(dueDate.getTime() - Math.random() * 1000 * 60 * 60 * 5).toISOString();
                  kpiValues[param.name] = time;
                } else {
                  kpiValues[param.name] = Math.floor(Math.random() * 100).toString();
                }
              });
          } else {
             selectedParams.forEach(param => {
               if (param.type === 'Timestamp') {
                 kpiValues[param.name] = 'Data_invalida_9999'; // Inconsistência
               } else {
                 kpiValues[param.name] = '-99'; // Inconsistência
               }
             });
             kpiValues['parametro_falso_desconexo'] = 'Lixo'; // Inconsistência
          }
        }
        
        executions.push({
          id: Date.now() + i,
          colaboradorId: assignee.id,
          quantidade: current,
          data: baseDate.toISOString().split('T')[0],
          observacao: isPerfect ? 'Executado com sucesso' : 'Dado incosistente aq',
          kpiValues: kpiValues,
          timestamp: baseDate.toISOString()
        });
      }

      tasksToInsert.push({
        title: `Atividade de Stress ${i} - ${isPerfect ? 'OK' : 'INCONSISTENTE'}`,
        description: `Tarefa gerada via script mock. Status: ${isPerfect ? 'Consistente' : 'Inconsistente'}`,
        priority: ['Baixa', 'Média', 'Alta', 'Urgente'][Math.floor(Math.random() * 4)],
        status: status,
        project_id: project.id,
        assignee_id: assignee.id,
        due_date: dueDate.toISOString().split('T')[0],
        measurement_target: target,
        measurement_current: current,
        measurement_type: 'UN',
        // kpi_enabled e kpi_code omitidos pois não existem no schema do banco
        executions: executions
      });
    }
    
    // Inserir tarefas em blocos para evitar timeouts
    const chunkSize = 200;
    for (let i = 0; i < tasksToInsert.length; i += chunkSize) {
        const chunk = tasksToInsert.slice(i, i + chunkSize);
        
        try {
          await request('tasks', 'POST', chunk);
        } catch (e) {
            throw e;
        }
        
        console.log(`✅ Lote de tarefas inserido... (${Math.min(i + chunkSize, tasksToInsert.length)}/${tasksToInsert.length})`);
    }

    console.log('====================================');
    console.log('🚀 GERAÇÃO DE MOCK CONCLUÍDA COM SUCESSO!');
    console.log('====================================');

  } catch (error) {
    console.error('❌ ERRO DURANTE A GERAÇÃO DE MOCK:', error.message);
  }
}

run();
