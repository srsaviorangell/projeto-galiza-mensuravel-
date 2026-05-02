-- CORREÇÃO DAS POLÍTICAS RLS - Execute no SQL Editor do Supabase
-- Resolve o problema de novos usuários não conseguirem fazer login

-- ============================================
-- CORREÇÃO 1: Tabela Users
-- ============================================

-- Remove a política antiga problemática
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Cria nova política que permite usuários se auto-inscreverem
CREATE POLICY "Users can insert themselves" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Remove a política antiga de update
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Cria política separada para admins e usuários
CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE USING (
    auth.uid() = id
  );

CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'sudo'))
  );

-- ============================================
-- CORREÇÃO 2: Tabela History
-- ============================================

DROP POLICY IF EXISTS "System can insert history" ON history;

CREATE POLICY "Users can insert history" ON history
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- ============================================
-- VERIFICAÇÃO: Liste as políticas atuais
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;