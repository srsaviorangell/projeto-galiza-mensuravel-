-- Galiza Project Manager - Database Schema for Supabase
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  specialty VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'Ativo',
  first_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Em Andamento',
  difficulty VARCHAR(50),
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'A Fazer',
  priority VARCHAR(50) DEFAULT 'Média',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  measurement_target INTEGER DEFAULT 1,
  measurement_current INTEGER DEFAULT 0,
  measurement_type VARCHAR(50) DEFAULT 'UN',
  color VARCHAR(50) DEFAULT 'var(--accent)',
  days_late INTEGER DEFAULT 0,
  executions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create history table
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_history_entity ON history(entity_type, entity_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default SUDO user
-- IMPORTANT: Change the password after first login!
INSERT INTO users (email, name, role, first_access, status)
VALUES 
  ('sudo@galizanet.com.br', 'Administrador SUDO', 'sudo', false, 'Ativo')
ON CONFLICT (email) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert themselves" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE USING (
    auth.uid() = id
  );

CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

CREATE POLICY "Sudo can delete users" ON users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sudo')
  );

-- Invites policies
CREATE POLICY "Anyone can view pending invites" ON invites
  FOR SELECT USING (status = 'pending');

CREATE POLICY "Admins can create invites" ON invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

CREATE POLICY "Users can accept their own invites" ON invites
  FOR UPDATE USING (email = (SELECT email FROM users WHERE id = auth.uid()));

-- Projects policies
CREATE POLICY "Authenticated users can view projects" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projects" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects" ON projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete projects" ON projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

-- Tasks policies
CREATE POLICY "Authenticated users can view tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tasks" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

-- History policies
CREATE POLICY "Authenticated users can view history" ON history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert history" ON history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create a function to check email domain
CREATE OR REPLACE FUNCTION validate_galiza_email(email_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email_text ILIKE '%@galizanet.com.br';
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to users table
ALTER TABLE users ADD CONSTRAINT check_galiza_email 
  CHECK (validate_galiza_email(email));

-- Add check constraint to invites table
ALTER TABLE invites ADD CONSTRAINT check_galiza_email_invite 
  CHECK (validate_galiza_email(email));
