
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Checking Users table...');
  const { data: userData, error: userError } = await supabase.from('users').select('*').limit(1);
  if (userError) {
    console.error('Error fetching users:', userError);
  } else if (userData && userData.length > 0) {
    console.log('User columns:', Object.keys(userData[0]));
  } else {
    console.log('No users found to check columns.');
  }

  console.log('\nChecking Tasks table...');
  const { data: taskData, error: taskError } = await supabase.from('tasks').select('*').limit(1);
  if (taskError) {
    console.error('Error fetching tasks:', taskError);
  } else if (taskData && taskData.length > 0) {
    console.log('Task columns:', Object.keys(taskData[0]));
  } else {
    console.log('No tasks found to check columns.');
  }
}

checkSchema();
