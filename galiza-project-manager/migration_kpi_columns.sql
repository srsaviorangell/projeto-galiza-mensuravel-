-- SQL para atualizar a tabela 'tasks' com os campos de KPI
-- Execute este comando no SQL Editor do seu Supabase

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS kpi_code TEXT,
ADD COLUMN IF NOT EXISTS kpi_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kpi_params JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS kpi_category TEXT;

-- Comentários para documentação (opcional)
COMMENT ON COLUMN tasks.kpi_code IS 'Código do KPI associado (ex: OPE 009)';
COMMENT ON COLUMN tasks.kpi_enabled IS 'Indica se a tarefa deve coletar dados de KPI';
COMMENT ON COLUMN tasks.kpi_params IS 'Lista de nomes dos parâmetros a serem coletados';
COMMENT ON COLUMN tasks.kpi_category IS 'Categoria técnica do KPI (Operacional, Financeiro, etc)';
