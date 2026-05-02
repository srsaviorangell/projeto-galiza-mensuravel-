-- =====================================================
-- Script de Atualização - Galiza Auth (VERSÃO SEM CHECK)
-- =====================================================

-- 1. Adicionar colunas faltantes na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_access BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Ativo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Criar tabela de convites
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

-- 3. Habilitar RLS na tabela invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- 4. Criar índices para invites
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

-- 5. Políticas RLS para invites (dropear primeiro se existir)
DROP POLICY IF EXISTS "Anyone can view pending invites" ON invites;
CREATE POLICY "Anyone can view pending invites" ON invites
  FOR SELECT USING (status = 'pending');

DROP POLICY IF EXISTS "Admins can create invites" ON invites;
CREATE POLICY "Admins can create invites" ON invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

-- 6. Políticas para users
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- 7. Criar usuário SUDO inicial
INSERT INTO users (email, name, role, first_access, status)
VALUES 
  ('sudo@galizanet.com.br', 'Administrador SUDO', 'sudo', false, 'Ativo')
ON CONFLICT (email) DO NOTHING;

-- 8. Função para validar email (não adiciona constraint)
CREATE OR REPLACE FUNCTION validate_galiza_email(email_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email_text ILIKE '%@galizanet.com.br';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ✅ CONCLUÍDO! Execute este script.
-- =====================================================