-- =====================================================
-- TABELA PRINCIPAL: KPI Collections
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_collections (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  kpi_code TEXT NOT NULL,
  kpi_category TEXT,
  quantidade NUMERIC,
  data_coleta DATE,
  parametros JSONB DEFAULT '[]'::jsonb,
  valores JSONB DEFAULT '{}'::jsonb,
  collaborator_id UUID REFERENCES users(id),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_kpi_collections_kpi_code ON kpi_collections(kpi_code);
CREATE INDEX IF NOT EXISTS idx_kpi_collections_task_id ON kpi_collections(task_id);
CREATE INDEX IF NOT EXISTS idx_kpi_collections_data_coleta ON kpi_collections(data_coleta);
CREATE INDEX IF NOT EXISTS idx_kpi_collections_collaborator_id ON kpi_collections(collaborator_id);

-- VIEW RESUMO POR KPI
CREATE OR REPLACE VIEW v_kpi_collections_summary AS
SELECT 
  kpi_code,
  kpi_category,
  COUNT(*) as total_coletas,
  SUM(quantidade) as quantidade_total,
  MIN(data_coleta) as primeira_coleta,
  MAX(data_coleta) as ultima_coleta
FROM kpi_collections
GROUP BY kpi_code, kpi_category
ORDER BY kpi_code;