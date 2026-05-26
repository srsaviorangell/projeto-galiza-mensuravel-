import { useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AuthContext';
import { Search, Database, User, CheckCircle2, Clock, Calendar, FileText, X, AlertCircle, TrendingUp } from 'lucide-react';
import './PainelParametros.css';

// Parâmetros de fallback caso o localStorage ainda não tenha sido iniciado pela aba KPIs
const FALLBACK_PARAMS = [
  'hora_abertura_os',
  'hora_diagnostico_confirmado',
  'hora_resolucao_confirmada',
  'n_os_periodo',
  'n_os_reincidentes',
  'n_total_incidentes_periodo'
];

export default function PainelParametros() {
  const { tasks, users, kpis = [], globalParams = [], kpiCollections = [], addKpiCollection, refreshData } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualLaunchModalOpen, setIsManualLaunchModalOpen] = useState(false);
  const [manualLaunchForm, setManualLaunchForm] = useState({
    kpiId: '',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    collaboratorId: '',
    observacao: '',
    kpiValues: {} as Record<string, string>
  });
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Preenchidos' | 'Pendentes'>('Todos');
  const [paramFilter, setParamFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedParamData, setSelectedParamData] = useState<any>(null);

  const handleSaveManualLaunch = async () => {
    if (!manualLaunchForm.kpiId || !manualLaunchForm.quantidade || !manualLaunchForm.data) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const selectedKpiObj = kpis.find(k => k.id === manualLaunchForm.kpiId);
    if (!selectedKpiObj) return;

    // Extrai nomes dos parâmetros de forma robusta com fallback para linkedParams
    let paramNames = selectedKpiObj.params || [];
    if (paramNames.length === 0 && selectedKpiObj.linkedParams && selectedKpiObj.linkedParams.length > 0) {
      paramNames = selectedKpiObj.linkedParams.map((pid: string) => {
        return (globalParams || []).find((p: any) => p.id === pid)?.name;
      }).filter(Boolean);
    }

    try {
      if (addKpiCollection) {
        await addKpiCollection({
          taskId: null,
          kpiCode: selectedKpiObj.code,
          kpiCategory: selectedKpiObj.category,
          quantidade: Number(manualLaunchForm.quantidade),
          dataColeta: manualLaunchForm.data,
          parametros: paramNames,
          valores: manualLaunchForm.kpiValues || {},
          collaboratorId: manualLaunchForm.collaboratorId || null,
          observacao: manualLaunchForm.observacao || 'Lançamento manual de dados'
        });
      }
      setIsManualLaunchModalOpen(false);
      setManualLaunchForm({ kpiId: '', quantidade: '', data: new Date().toISOString().split('T')[0], collaboratorId: '', observacao: '', kpiValues: {} });
      if (refreshData) {
        await refreshData();
      }
      alert('Lançamento manual registrado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao realizar lançamento manual:', err);
      alert('Erro ao realizar lançamento manual: ' + err.message);
    }
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return val;
    // Regex para checar formato ISO-8601 (ex: 2026-06-02T10:58:48.201Z)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    if (isoDateRegex.test(val)) {
      try {
        const d = new Date(val);
        const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').substring(0, 3);
        const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${datePart}(${weekday}) ${timePart}`;
      } catch(e) {
        return val;
      }
    }
    return val;
  };
  
  const parametersData = useMemo(() => {
    const list: any[] = [];
    
    // 1. Itera por todas as tarefas e seus preenchimentos
    tasks.forEach((task: any) => {
      // Coleta todos os nomes de parâmetros (seja os exigidos pela task, seja os preenchidos nas execuções)
      const paramNames = new Set<string>();
      
      if (task.kpiParams && Array.isArray(task.kpiParams)) {
        task.kpiParams.forEach((p: string) => paramNames.add(p));
      }
      
      if (task.executions && Array.isArray(task.executions)) {
        task.executions.forEach((exec: any) => {
          if (exec.kpiValues && typeof exec.kpiValues === 'object') {
            Object.keys(exec.kpiValues).forEach(k => paramNames.add(k));
          }
        });
      }

      // Se a tarefa tiver pelo menos 1 parâmetro (exigido ou preenchido)
      if (paramNames.size > 0) {
        // Pega o colaborador responsável
        const assignee = users.find((u: any) => String(u.id) === String(task.assigneeId) || String(u.id) === String(task.assignee_id));
        const assigneeName = assignee ? assignee.name : (task.assignee || 'Não atribuído');
        
        // Para cada parâmetro detectado na tarefa, exibir na tabela
        paramNames.forEach((paramName: string) => {
          // Verifica se já existe execução preenchida para esse parâmetro
          let preenchimento = 'Pendente';
          let dataPreenchimento = '';
          let valor = '';
          
          if (task.executions && Array.isArray(task.executions) && task.executions.length > 0) {
            // Tenta achar nas execuções o preenchimento mais recente
            const exec = task.executions.slice().reverse().find((e: any) => e.kpiValues && e.kpiValues[paramName] !== undefined && e.kpiValues[paramName] !== '');
            if (exec) {
              preenchimento = 'Preenchido';
              valor = exec.kpiValues[paramName];
              dataPreenchimento = new Date(exec.timestamp || exec.data).toLocaleDateString('pt-BR');
            }
          }
          
          list.push({
            id: `${task.id}-${paramName}-${Math.random()}`,
            taskTitle: task.title || task.name || 'Tarefa sem título',
            taskId: task.id,
            project: task.projectId || task.project_id || 'N/A',
            assignee: assigneeName,
            status: task.status,
            parameter: paramName,
            filled: preenchimento === 'Preenchido',
            value: valor,
            date: dataPreenchimento || '—'
          });
        });
      }
    });

    // Função utilitária para formatar a data sem sofrer com fuso horário
    const formatDateStr = (dateStr: string) => {
      if (!dateStr) return '—';
      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    // 2. Itera por todos os lançamentos manuais diretos (kpiCollections sem taskId)
    (kpiCollections || []).forEach((col: any) => {
      if (col.taskId) return; // Lançamentos com taskId já são representados via tarefas

      const assignee = users.find((u: any) => String(u.id) === String(col.collaboratorId));
      const assigneeName = assignee ? assignee.name : 'Geral';

      const paramNames = new Set<string>();
      if (col.parametros && Array.isArray(col.parametros)) {
        col.parametros.forEach((p: string) => paramNames.add(p));
      }
      if (col.valores && typeof col.valores === 'object') {
        Object.keys(col.valores).forEach(k => paramNames.add(k));
      }

      paramNames.forEach((paramName: string) => {
        const valor = col.valores ? col.valores[paramName] : '';
        const filled = valor !== undefined && valor !== null && valor !== '';

        list.push({
          id: `manual-${col.id}-${paramName}-${Math.random()}`,
          taskTitle: `Lançamento Direto (${col.kpiCode})`,
          taskId: null,
          project: 'Lançamento Manual',
          assignee: assigneeName,
          status: 'Concluído',
          parameter: paramName,
          filled: filled,
          value: String(valor || ''),
          date: col.dataColeta ? formatDateStr(col.dataColeta) : '—'
        });
      });
    });
    
    return list.sort((a, b) => a.parameter.localeCompare(b.parameter));
  }, [tasks, users, kpiCollections]);

  // Puxa os parâmetros globais da aba de KPIs (via LocalStorage)
  const uniqueParams = useMemo(() => {
    try {
      const saved = localStorage.getItem('global_kpi_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Extrai apenas os nomes dos parâmetros que estão cadastrados lá no KPI
          return parsed.map((p: any) => p.name).sort();
        }
      }
    } catch(e) {}
    
    // Se ainda não abriu a aba KPIs, retorna os fallbacks
    return FALLBACK_PARAMS;
  }, []);

  const filteredData = parametersData.filter(item => {
    // Mostra os parâmetros que estão nas tasks (mesmo que sejam órfãos, para você ver o que existe)
    // Se quiser esconder os órfãos comente a linha abaixo e descomente a próxima.
    // if (!uniqueParams.includes(item.parameter)) return false;

    // 1. Busca livre
    const safeSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = String(item.parameter).toLowerCase().includes(safeSearchTerm) ||
                          String(item.taskTitle).toLowerCase().includes(safeSearchTerm) ||
                          String(item.assignee).toLowerCase().includes(safeSearchTerm) ||
                          String(item.value).toLowerCase().includes(safeSearchTerm);
    if (!matchesSearch) return false;
    
    // 2. Filtro de Status
    if (statusFilter === 'Preenchidos' && !item.filled) return false;
    if (statusFilter === 'Pendentes' && item.filled) return false;
    
    // 3. Filtro de Parâmetro
    if (paramFilter && item.parameter !== paramFilter) return false;

    // 4. Filtro de Data (formato pt-BR: DD/MM/YYYY vs formato input date: YYYY-MM-DD)
    if (dateFilter && item.date !== '—') {
      const [year, month, day] = dateFilter.split('-');
      const formattedFilter = `${day}/${month}/${year}`;
      if (item.date !== formattedFilter) return false;
    } else if (dateFilter && item.date === '—') {
      return false; // Se buscou data, e tá sem data (pendente), não mostra
    }
    
    return true;
  });

  return (
    <div className="parametros-container animate-fadeIn">
      <div className="parametros-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div>
          <h1>Gestão de Parâmetros Coletados</h1>
          <p className="parametros-subtitle">Rastreabilidade completa: O que, Onde, Quem e Qual valor</p>
        </div>
        <button className="btn-primary" onClick={() => setIsManualLaunchModalOpen(true)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <TrendingUp size={18} /> Lançamento Manual
        </button>
      </div>

      <div className="parametros-filters" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        
        {/* Busca Livre */}
        <div className="search-box" style={{ flex: '1', minWidth: '250px', background: 'transparent', border: '1px solid var(--border)' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar (tarefa, colaborador ou valor)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Filtro por Parâmetro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Parâmetro:</label>
          <select 
            value={paramFilter} 
            onChange={e => setParamFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="">Todos os Parâmetros</option>
            {uniqueParams.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Data:</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
          />
          {dateFilter && (
             <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}>Limpar</button>
          )}
        </div>

        {/* Status (Pendentes/Preenchidos) */}
        <div className="status-filters" style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
          <button 
            className={`btn-filter ${statusFilter === 'Todos' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Todos')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: statusFilter === 'Todos' ? 'var(--accent)' : 'transparent', color: statusFilter === 'Todos' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
          >
            Todos
          </button>
          <button 
            className={`btn-filter ${statusFilter === 'Preenchidos' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Preenchidos')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: statusFilter === 'Preenchidos' ? 'var(--success)' : 'transparent', color: statusFilter === 'Preenchidos' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
          >
            Preenchidos
          </button>
          <button 
            className={`btn-filter ${statusFilter === 'Pendentes' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Pendentes')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: statusFilter === 'Pendentes' ? '#f59e0b' : 'transparent', color: statusFilter === 'Pendentes' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
          >
            Pendentes
          </button>
        </div>
      </div>

      <div className="parametros-card">
        <div className="table-responsive">
          <table className="parametros-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}><Database size={14}/> Parâmetro</th>
                <th style={{ width: '45%' }}><FileText size={14}/> Tarefa Associada</th>
                <th style={{ width: '30%' }}>Valor Informado</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    <Database size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <br />
                    Nenhum parâmetro vinculado ou encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} onClick={() => setSelectedParamData(item)} className="clickable-row">
                    <td data-label="Parâmetro">
                      <div className="param-name-cell">
                        <span className="param-badge">{item.parameter}</span>
                      </div>
                    </td>
                    <td data-label="Tarefa Associada">
                      <div className="param-task-cell" title={item.taskTitle}>
                        {item.taskTitle.length > 50 ? item.taskTitle.substring(0, 50) + '...' : item.taskTitle}
                      </div>
                    </td>
                    <td data-label="Valor Informado">
                      {item.filled ? (
                        <span className="value-badge" title={item.value}>
                          {formatDisplayValue(item.value)}
                        </span>
                      ) : (
                        <span className="value-badge empty">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançamento Manual */}
      {isManualLaunchModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsManualLaunchModalOpen(false)}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: "rgba(255, 100, 0, 0.15)", color: "var(--accent)" }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Lançamento Manual</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-tertiary)" }}>Inserir dados legados ou retroativos diretamente em um KPI</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsManualLaunchModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem' }}>
              
              <div className="form-group">
                <label>Selecionar Indicador (KPI) *</label>
                <select 
                  value={manualLaunchForm.kpiId} 
                  onChange={e => {
                    const kid = e.target.value;
                    setManualLaunchForm({
                      ...manualLaunchForm,
                      kpiId: kid,
                      kpiValues: {}
                    });
                  }}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                >
                  <option value="">Selecione...</option>
                  {kpis.map(k => (
                    <option key={k.id} value={k.id}>{k.code} - {k.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Quantidade *</label>
                  <input 
                    type="number" 
                    placeholder="Quantidade produzida..." 
                    value={manualLaunchForm.quantidade} 
                    onChange={e => setManualLaunchForm({ ...manualLaunchForm, quantidade: e.target.value })} 
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Data da Coleta *</label>
                  <input 
                    type="date" 
                    value={manualLaunchForm.data} 
                    onChange={e => setManualLaunchForm({ ...manualLaunchForm, data: e.target.value })} 
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Colaborador Responsável (Opcional)</label>
                <select 
                  value={manualLaunchForm.collaboratorId} 
                  onChange={e => setManualLaunchForm({ ...manualLaunchForm, collaboratorId: e.target.value })}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                >
                  <option value="">Nenhum / Geral</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Observação / Justificativa</label>
                <input 
                  type="text" 
                  placeholder="Ex: Lançamento de CTOs legados..." 
                  value={manualLaunchForm.observacao} 
                  onChange={e => setManualLaunchForm({ ...manualLaunchForm, observacao: e.target.value })} 
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              {/* Dynamic KPI Parameter Inputs */}
              {(() => {
                const selectedKpiObj = kpis.find(k => k.id === manualLaunchForm.kpiId);
                if (!selectedKpiObj) return null;
                
                // Extração robusta de parâmetros, com fallback para buscar nos parâmetros globais através do linkedParams
                let paramNames = selectedKpiObj.params || [];
                if (paramNames.length === 0 && selectedKpiObj.linkedParams && selectedKpiObj.linkedParams.length > 0) {
                  paramNames = selectedKpiObj.linkedParams.map((pid: string) => {
                    return (globalParams || []).find((p: any) => p.id === pid)?.name;
                  }).filter(Boolean);
                }
                
                if (paramNames.length === 0) return null;
                
                return (
                  <div style={{ marginTop: "0.5rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--accent)" }}>Valores dos Parâmetros do Indicador</h4>
                    
                    {paramNames.map((param, idx) => {
                      const paramDef = (globalParams || []).find(p => p.name === param);
                      const typeLower = (paramDef?.type || '').toLowerCase();
                      const nameLower = param.toLowerCase();
                      
                      let inputType = "text";
                      let step = undefined;
                      
                      if (typeLower === 'timestamp' || nameLower.includes('hora') || nameLower.includes('data') || nameLower.includes('date') || nameLower.includes('time')) {
                        inputType = "datetime-local";
                      } else if (typeLower === 'inteiro' || typeLower === 'number' || typeLower === 'integer') {
                        inputType = "number";
                        step = "1";
                      } else if (typeLower === 'decimal') {
                        inputType = "number";
                        step = "any";
                      }
                      
                      return (
                        <div className="form-group" key={idx} style={{ marginTop: "10px" }}>
                          <label>{param}</label>
                          <input 
                            type={inputType}
                            step={step}
                            value={manualLaunchForm.kpiValues[param] || ''}
                            onChange={e => {
                              setManualLaunchForm({
                                ...manualLaunchForm,
                                kpiValues: {
                                  ...manualLaunchForm.kpiValues,
                                  [param]: e.target.value
                                }
                              });
                            }}
                            placeholder="Valor do parâmetro..."
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px', width: '100%' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" onClick={() => setIsManualLaunchModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveManualLaunch} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Salvar Lançamento</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Detalhes do Parâmetro */}
      {selectedParamData && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedParamData(null)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 94, 42, 0.15)', color: '#FF8E53' }}>
                  <Database size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Detalhes do Preenchimento</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Informações completas da coleta</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedParamData(null)}><X size={20}/></button>
            </div>
            
            <div className="modal-body" style={{ gap: '1.2rem', display: 'flex', flexDirection: 'column' }}>
              <div className="detail-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Parâmetro Coletado</label>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedParamData.parameter}
                </div>
              </div>

              <div className="detail-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Valor Informado</label>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', color: selectedParamData.filled ? 'var(--accent)' : 'var(--text-tertiary)', marginTop: '6px', wordBreak: 'break-all' }}>
                  {selectedParamData.filled ? formatDisplayValue(selectedParamData.value) : 'Ainda não preenchido'}
                </div>
              </div>

              <div className="detail-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Tarefa Associada</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <FileText size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedParamData.taskTitle}</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span className={`status-badge ${selectedParamData.status === 'Concluída' ? 'concluida' : 'afazer'}`} style={{ display: 'inline-block', transform: 'scale(0.85)', transformOrigin: 'left' }}>
                    Status: {selectedParamData.status}
                  </span>
                </div>
              </div>

              <div className="detail-group" style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Responsável (Colaborador)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <div className="user-avatar-mini" style={{ width: '28px', height: '28px' }}>{selectedParamData.assignee.charAt(0)}</div>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedParamData.assignee}</span>
                  </div>
                </div>
              </div>

              <div className="detail-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Data de Preenchimento</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  {selectedParamData.filled ? (
                    <>
                      <CheckCircle2 size={16} color="var(--success)" />
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedParamData.date}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={16} color="#f59e0b" />
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Aguardando preenchimento</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedParamData(null)}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
