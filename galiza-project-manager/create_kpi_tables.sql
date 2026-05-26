-- =====================================================
-- TABELAS PARA GESTÃO DE KPIS E PARÂMETROS GLOBAIS
-- =====================================================

-- 1. Tabela de Parâmetros Globais
CREATE TABLE IF NOT EXISTS global_kpi_params (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  source TEXT,
  "desc" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de KPIs
CREATE TABLE IF NOT EXISTS kpis (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  color TEXT DEFAULT '#FF5E2A',
  description TEXT,
  params JSONB DEFAULT '[]'::jsonb,
  linked_params JSONB DEFAULT '[]'::jsonb,
  formula TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE global_kpi_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

-- Políticas para global_kpi_params
DROP POLICY IF EXISTS "Authenticated users can select global_kpi_params" ON global_kpi_params;
CREATE POLICY "Authenticated users can select global_kpi_params" ON global_kpi_params
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert global_kpi_params" ON global_kpi_params;
CREATE POLICY "Authenticated users can insert global_kpi_params" ON global_kpi_params
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update global_kpi_params" ON global_kpi_params;
CREATE POLICY "Authenticated users can update global_kpi_params" ON global_kpi_params
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete global_kpi_params" ON global_kpi_params;
CREATE POLICY "Authenticated users can delete global_kpi_params" ON global_kpi_params
  FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para kpis
DROP POLICY IF EXISTS "Authenticated users can select kpis" ON kpis;
CREATE POLICY "Authenticated users can select kpis" ON kpis
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert kpis" ON kpis;
CREATE POLICY "Authenticated users can insert kpis" ON kpis
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update kpis" ON kpis;
CREATE POLICY "Authenticated users can update kpis" ON kpis
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete kpis" ON kpis;
CREATE POLICY "Authenticated users can delete kpis" ON kpis
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- DADOS INICIAIS / PADRÃO
-- =====================================================

-- Parâmetros padrão
INSERT INTO global_kpi_params (id, name, type, source, "desc")
VALUES 
  ('p1', 'Hora_abertura_OS', 'Timestamp', 'Sistema de OS', 'Momento da geração da OS no sistema'),
  ('p2', 'Hora_diagnóstico_confirmado', 'Timestamp', 'Bot WhatsApp', 'Técnico declara causa + gestor valida'),
  ('p3', 'N_OS_período', 'Inteiro', 'Histórico de OS', 'Total de OS encerradas no período')
ON CONFLICT (id) DO NOTHING;

-- KPI padrão
INSERT INTO kpis (id, code, name, category, unit, color, description, params, linked_params, formula)
VALUES (
  'ope009',
  'OPE 009',
  'Tempo Médio de Diagnóstico',
  'Operacional',
  'horas',
  '#f59e0b',
  'Tempo decorrido entre a abertura da OS e a confirmação do diagnóstico pelo gestor/técnico',
  '["Hora_abertura_OS", "Hora_diagnóstico_confirmado", "N_OS_período"]'::jsonb,
  '["p1", "p2", "p3"]'::jsonb,
  'AVG(Hora_diagnóstico_confirmado - Hora_abertura_OS)'
) ON CONFLICT (id) DO NOTHING;
