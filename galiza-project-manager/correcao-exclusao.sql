-- =====================================================
-- CORREÇÃO DA EXCLUSÃO DE USUÁRIOS POR ADMINS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Atualizar a Política RLS da tabela 'users' para deleção
DROP POLICY IF EXISTS "Sudo can delete users" ON users;

CREATE POLICY "Admins and Sudo can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'sudo')
    ) AND (
      -- Impede excluir o usuário administrador master (sudo)
      role != 'sudo' OR email != 'sudo@galizanet.com.br'
    )
  );

-- 2. Ajustar Chave Estrangeira da tabela 'history'
ALTER TABLE history 
  DROP CONSTRAINT IF EXISTS history_user_id_fkey,
  ADD CONSTRAINT history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Ajustar Chave Estrangeira da tabela 'kpi_collections'
ALTER TABLE kpi_collections 
  DROP CONSTRAINT IF EXISTS kpi_collections_collaborator_id_fkey,
  ADD CONSTRAINT kpi_collections_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES users(id) ON DELETE SET NULL;
