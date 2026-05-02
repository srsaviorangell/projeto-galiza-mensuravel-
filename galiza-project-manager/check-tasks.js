const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dgqmnzkauhpkpzhrnwlb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE2MDQxNSwiZXhwIjoyMDkxNzM2NDE1fQ.lNeSwWo7-MZIt2HAWOx_7tT0jZL_K-8XC4C-cDbOznQ'
);

async function checkData() {
  const { data: tasks } = await supabase.from('tasks').select('*');
  console.log('Total de tarefas:', tasks.length);
  console.log('Primeiras 3:', tasks.slice(0, 3));

  const { data: projects } = await supabase.from('projects').select('*');
  console.log('Total de projetos:', projects.length);
}

checkData();