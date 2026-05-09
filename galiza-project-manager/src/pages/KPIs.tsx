import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, Activity, Target, 
  CheckCircle2, Clock, AlertTriangle, Users, 
  BarChart3, X, Calendar, Plus, Settings,
  Wifi, Gauge, DollarSign, Home, TrendingDown,
  Server, ChevronRight, ChevronLeft
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { AppContext } from '../context/AuthContext';
import './KPIs.css';

const INITIAL_PARAMS = [
  { id: 'p1', name: 'Hora_abertura_OS', type: 'Timestamp', source: 'Sistema de OS', desc: 'Momento da geração da OS no sistema' },
  { id: 'p2', name: 'Hora_diagnóstico_confirmado', type: 'Timestamp', source: 'Bot WhatsApp', desc: 'Técnico declara causa + gestor valida' },
  { id: 'p3', name: 'N_OS_período', type: 'Inteiro', source: 'Histórico de OS', desc: 'Total de OS encerradas no período' },
];

const INITIAL_KPIS = [
  { id: 'ope009', code: 'OPE 009', name: 'Tempo Médio de Diagnóstico', icon: Clock, color: '#f59e0b', description: 'Tempo médio para identificar causa de falha', unit: 'horas', category: 'Operacional', formula: 'SUM(Hora_diagnóstico_confirmado - Hora_abertura_OS) / N_OS_período', linkedParams: ['p1', 'p2', 'p3'] },
];

export default function KPIs() {
  const { projects, tasks, refreshData } = useContext(AppContext);
  const [allKpis, setAllKpis] = useState(INITIAL_KPIS);
  
  const [allParams, setAllParams] = useState(() => {
    const saved = localStorage.getItem('global_kpi_params');
    try {
      const parsed = saved ? JSON.parse(saved) : INITIAL_PARAMS;
      // Migração: Se encontrar nomes em minúsculo, força o reset para o padrão novo (PascalCase)
      if (parsed.some((p: any) => p.name === 'hora_abertura_os')) {
        return INITIAL_PARAMS;
      }
      return parsed;
    } catch {
      return INITIAL_PARAMS;
    }
  });

  // Salva no LocalStorage sempre que a configuração mudar
  useEffect(() => {
    localStorage.setItem('global_kpi_params', JSON.stringify(allParams));
  }, [allParams]);

  const [paramForm, setParamForm] = useState({ id: '', name: '', type: 'Inteiro', source: '', desc: '' });
  const [isParamFormOpen, setIsParamFormOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<any>(null);
  const [editingKPI, setEditingKPI] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGlobalParamsModalOpen, setIsGlobalParamsModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>('7 Dias');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [newKpi, setNewKpi] = useState({ code: '', name: '', category: 'Operacional', unit: '', color: '#FF5E2A' });

  const categories = ['Operacional', 'Engenharia', 'ExpansÃ£o', 'Financeiro'];
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTrack = (cat: string, direction: 'left' | 'right') => {
    const track = trackRefs.current[cat];
    if (!track) return;
    
    const card = track.querySelector('.kpi-card');
    const scrollAmount = card ? card.clientWidth + 20 : 320; // 20px Ã© o gap de 1.25rem
    
    track.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  const kpiData = useMemo(() => {
    const now = new Date();
    
    return allKpis.reduce((acc: any, kpi) => {
      // Filtra tarefas válidas para este KPI no período selecionado
      const filteredTasks = tasks.filter(t => {
        return t.executions?.some(e => {
          const fullDate = new Date(e.timestamp || e.data);
          const now = new Date();
          const diff = now.getTime() - fullDate.getTime();
          let isWithinRange = false;
          
          if (timeFilter === '3 Dias') isWithinRange = diff >= 0 && diff <= (3 * 24 * 60 * 60 * 1000);
          else if (timeFilter === '7 Dias') isWithinRange = diff >= 0 && diff <= (7 * 24 * 60 * 60 * 1000);
          else if (timeFilter === '15 Dias') isWithinRange = diff >= 0 && diff <= (15 * 24 * 60 * 60 * 1000);
          else if (timeFilter === '1 Mês') isWithinRange = diff >= 0 && diff <= (30 * 24 * 60 * 60 * 1000);
          else if (timeFilter === 'Trimestre') isWithinRange = diff >= 0 && diff <= (90 * 24 * 60 * 60 * 1000);
          else if (timeFilter === 'Semestre') isWithinRange = diff >= 0 && diff <= (180 * 24 * 60 * 60 * 1000);
          else if (timeFilter === 'Ano') isWithinRange = diff >= 0 && diff <= (365 * 24 * 60 * 60 * 1000);
          else if (timeFilter === 'Personalizado') {
            const start = customRange.start ? new Date(customRange.start) : null;
            const end = customRange.end ? new Date(customRange.end) : null;
            isWithinRange = (!start || fullDate >= start) && (!end || fullDate <= end);
          }
          return isWithinRange;
        });
      });

      if (kpi.id === 'ope009') {
        let totalDiffHours = 0;
        let totalOS = 0;

        filteredTasks.forEach(t => {
          t.executions?.forEach(e => {
            if (e.kpiValues?.Hora_abertura_OS && e.kpiValues?.Hora_diagnóstico_confirmado) {
              const start = new Date(e.kpiValues.Hora_abertura_OS);
              const diag = new Date(e.kpiValues.Hora_diagnóstico_confirmado);
              const diff = (diag.getTime() - start.getTime()) / (1000 * 60 * 60);
              if (diff > 0) {
                totalDiffHours += diff;
                totalOS += Number(e.kpiValues.N_OS_período || 1);
              }
            }
          });
        });

        const avg = totalOS > 0 ? (totalDiffHours / totalOS).toFixed(1) : '0.0';
        acc[kpi.id] = { value: avg, trend: '0.0', label: kpi.unit };
      } else {
        acc[kpi.id] = { value: '0.0', trend: '0.0', label: kpi.unit };
      }
      
      return acc;
    }, {});
  }, [allKpis, timeFilter, tasks, customRange]);

  const handleAddKpi = () => {
    if (!newKpi.code || !newKpi.name) return;
    const kpiToAdd = {
      ...newKpi,
      id: `custom-${Date.now()}`,
      icon: Activity,
      description: 'KPI customizado adicionado pelo usuÃ¡rio'
    };
    setAllKpis([...allKpis, kpiToAdd]);
    setIsAddModalOpen(false);
    setNewKpi({ code: '', name: '', category: 'Operacional', unit: '', color: '#FF5E2A' });
  };

  const handleRemoveKpi = (id: string) => {
    setAllKpis(allKpis.filter(k => k.id !== id));
  };

  const chartData = useMemo(() => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = `${d.getDate()}/${d.getMonth() + 1}`;
      
      // Conta tarefas que tiveram execução nesse dia
      const dayExecs = tasks.filter(t => 
        t.executions?.some((e: any) => {
          const eDate = new Date(e.timestamp || e.data);
          return eDate.getDate() === d.getDate() && eDate.getMonth() === d.getMonth();
        })
      ).length;

      data.push({ 
        date: dStr,
        executions: dayExecs,
        concluidas: tasks.filter(t => t.status === 'Concluída').length,
        novas: 0
      });
    }
    return data;
  }, [tasks]);

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Gestão de Indicadores (KPIs)</h1>
          <p className="dashboard-subtitle">Acompanhamento de performance e criação de métricas</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => setIsGlobalParamsModalOpen(true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Settings size={18} /> Adicionar Parâmetros
          </button>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} /> Novo Indicador
          </button>
        </div>
      </div>

      {/* EstatÃ­sticas Gerais */}
      <div className="kpi-general-charts">
        <div className="general-chart-card">
          <div className="card-header"><div className="card-title"><Activity size={18} /><h3>Atividade Global</h3></div></div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" hide />
              <Tooltip />
              <Area type="monotone" dataKey="executions" stroke="#FF5E2A" fill="#FF5E2A20" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="general-chart-card">
          <div className="card-header"><div className="card-title"><Target size={18} /><h3>Metas Atingidas</h3></div></div>
          <div className="kpi-big-num">
            {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Concluída').length / tasks.length) * 100) : 0}%
          </div>
          <div className="kpi-mini-trend positive">Performance Real</div>
        </div>
        <div className="general-chart-card">
          <div className="card-header"><div className="card-title"><Users size={18} /><h3>Projetos Ativos</h3></div></div>
          <div className="kpi-big-num">{projects.length}</div>
          <div className="kpi-mini-trend positive">No Sistema</div>
        </div>
      </div>

      {/* CarrossÃ©is por Categoria */}
      {categories.map(cat => {
        const catKpis = allKpis.filter(k => k.category === cat);
        if (catKpis.length === 0) return null;

        return (
          <div key={cat} className="kpi-category-section">
            <div className="kpi-section-header">
              <h2 className="kpi-section-title">{cat}</h2>
              <div className="kpi-carousel-nav">
                <button className="nav-btn" onClick={() => scrollTrack(cat, 'left')}><ChevronLeft size={16} /></button>
                <button className="nav-btn" onClick={() => scrollTrack(cat, 'right')}><ChevronRight size={16} /></button>
              </div>
            </div>
            
            <div className="kpis-carousel-track" ref={el => { trackRefs.current[cat] = el; }}>
              {catKpis.map(kpi => {
                const data = kpiData[kpi.id];
                const Icon = kpi.icon || Activity;
                return (
                  <div key={kpi.id} className="kpi-card" onClick={() => setSelectedKPI(kpi)}>
                    <div className="kpi-card-actions">
                      <button className="kpi-action-btn" onClick={(e) => { e.stopPropagation(); setEditingKPI(kpi); }}>
                        <Settings size={14} />
                      </button>
                      <button className="kpi-action-btn delete" onClick={(e) => { e.stopPropagation(); handleRemoveKpi(kpi.id); }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="kpi-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="kpi-code">{kpi.code}</span>
                        <div className={`kpi-trend ${Number(data.trend) >= 0 ? 'positive' : 'negative'}`}>
                          {data.trend}%
                        </div>
                      </div>
                    </div>
                    <div className="kpi-icon-wrapper" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                      <Icon size={22} />
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-value">{data.value}</span>
                      <span className="kpi-label">{kpi.unit}</span>
                    </div>
                    <div className="kpi-footer">
                      <span className="kpi-name">{kpi.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal Adicionar KPI */}
      {isAddModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Indicador</h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Classe (Categoria)</label>
                <select value={newKpi.category} onChange={e => setNewKpi({...newKpi, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>CÃ³digo</label>
                  <input type="text" placeholder="Ex: OPE 001" value={newKpi.code} onChange={e => setNewKpi({...newKpi, code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <input type="text" placeholder="Ex: %, h, R$" value={newKpi.unit} onChange={e => setNewKpi({...newKpi, unit: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Nome do Indicador</label>
                <input type="text" placeholder="Nome descritivo..." value={newKpi.name} onChange={e => setNewKpi({...newKpi, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Cor de Identidade</label>
                <input type="color" value={newKpi.color} onChange={e => setNewKpi({...newKpi, color: e.target.value})} style={{ height: '40px', padding: '4px' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddKpi}>Criar KPI</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Detalhes KPI */}
      {selectedKPI && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedKPI(null)}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: `${selectedKPI.color}20`, color: selectedKPI.color }}>
                  <Activity size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedKPI.code} - {selectedKPI.name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedKPI.description}</p>
                </div>
              </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => refreshData?.()} 
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Activity size={14} /> Atualizar
                  </button>
                  <button className="modal-close" onClick={() => setSelectedKPI(null)}><X size={20} /></button>
                </div>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               
               {/* Barra de Filtros Temporais */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                   {['3 Dias', '7 Dias', '15 Dias', '1 Mês', 'Trimestre', 'Semestre', 'Ano', 'Personalizado'].map(filter => (
                     <button
                       key={filter}
                       onClick={() => setTimeFilter(filter)}
                       style={{
                         padding: '6px 14px',
                         borderRadius: '20px',
                         fontSize: '12px',
                         fontWeight: 500,
                         cursor: 'pointer',
                         transition: 'all 0.2s',
                         border: '1px solid var(--border)',
                         background: timeFilter === filter ? selectedKPI.color : 'transparent',
                         color: timeFilter === filter ? '#fff' : 'var(--text-secondary)',
                         boxShadow: timeFilter === filter ? `0 4px 10px ${selectedKPI.color}40` : 'none'
                       }}
                     >
                       {filter}
                     </button>
                   ))}
                 </div>

                 {timeFilter === 'Personalizado' && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                       <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Data Inicial</label>
                       <input 
                         type="date" 
                         value={customRange.start}
                         onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                         style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '13px' }}
                       />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                       <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Data Final</label>
                       <input 
                         type="date" 
                         value={customRange.end}
                         onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                         style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '13px' }}
                       />
                     </div>
                   </div>
                 )}
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                 <div style={{ background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                   <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Valor Atual</div>
                   <div style={{ fontSize: '28px', fontWeight: 700, color: selectedKPI.color, marginTop: '8px' }}>
                     {kpiData[selectedKPI.id]?.value || 0} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{selectedKPI.unit}</span>
                   </div>
                 </div>
                 <div style={{ background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                   <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Variação (7 Dias)</div>
                   <div style={{ fontSize: '20px', fontWeight: 600, color: Number(kpiData[selectedKPI.id]?.trend) > 0 ? 'var(--success)' : 'var(--danger)', marginTop: '12px' }}>
                     {Number(kpiData[selectedKPI.id]?.trend) > 0 ? '↑' : '↓'} {Math.abs(Number(kpiData[selectedKPI.id]?.trend))}%
                   </div>
                 </div>
               </div>

               <div>
                 <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '15px' }}>
                   Evolução de Coleta de Parâmetros
                 </h4>
                 <div style={{ height: '300px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                   {/* Background Glow Effect */}
                   <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: `${selectedKPI.color}15`, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                   
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={
                       (() => {
                         const byDate: Record<string, { count: number, timestamp: number }> = {};
                         tasks.forEach((t: any) => {
                           if (t.executions) {
                             t.executions.forEach((e: any) => {
                               const fullDate = new Date(e.timestamp || e.data);
                               const now = new Date();
                               const diff = now.getTime() - fullDate.getTime();
                               let isWithinRange = false;

                               // Lógica de Filtro de Tempo (Apenas passado)
                               if (timeFilter === '3 Dias') isWithinRange = diff >= 0 && diff <= (3 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === '7 Dias') isWithinRange = diff >= 0 && diff <= (7 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === '15 Dias') isWithinRange = diff >= 0 && diff <= (15 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === '1 Mês') isWithinRange = diff >= 0 && diff <= (30 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === 'Trimestre') isWithinRange = diff >= 0 && diff <= (90 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === 'Semestre') isWithinRange = diff >= 0 && diff <= (180 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === 'Ano') isWithinRange = diff >= 0 && diff <= (365 * 24 * 60 * 60 * 1000);
                               else if (timeFilter === 'Personalizado') {
                                 const start = customRange.start ? new Date(customRange.start) : null;
                                 const end = customRange.end ? new Date(customRange.end) : null;
                                 isWithinRange = (!start || fullDate >= start) && (!end || fullDate <= end);
                               }

                               if (!isWithinRange) return;

                               const hasLinkedParam = selectedKPI.linkedParams?.some((pid: string) => {
                                 const p = allParams.find(p => p.id === pid);
                                 return p && e.kpiValues && e.kpiValues[p.name];
                               });
                               
                               if (hasLinkedParam) {
                                 const dLabel = fullDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                 if (!byDate[dLabel]) {
                                   byDate[dLabel] = { count: 0, timestamp: fullDate.getTime() };
                                 }
                                 byDate[dLabel].count += 1;
                               }
                             });
                           }
                         });
                         
                         // Ordenação Cronológica Real
                         const res = Object.entries(byDate)
                           .map(([date, obj]) => ({ date, valor: obj.count, ts: obj.timestamp }))
                           .sort((a, b) => a.ts - b.ts);

                         return res;
                       })()
                     }>
                       <defs>
                         <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={selectedKPI.color} stopOpacity={0.3}/>
                           <stop offset="95%" stopColor={selectedKPI.color} stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis 
                         dataKey="date" 
                         axisLine={false}
                         tickLine={false}
                         tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                         dy={10}
                       />
                       <YAxis 
                         axisLine={false}
                         tickLine={false}
                         tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                       />
                       <Tooltip 
                         contentStyle={{ 
                           background: '#1e293b', 
                           border: '1px solid rgba(255,255,255,0.1)', 
                           borderRadius: '12px',
                           boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                         }}
                         itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}
                         labelStyle={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontSize: '11px' }}
                         cursor={{ stroke: selectedKPI.color, strokeWidth: 1, strokeDasharray: '4 4' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="valor" 
                         stroke={selectedKPI.color} 
                         strokeWidth={4} 
                         fillOpacity={1} 
                         fill="url(#colorValor)" 
                         activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: selectedKPI.color }}
                         dot={{ fill: selectedKPI.color, strokeWidth: 2, r: 3, stroke: '#1e293b' }}
                         animationDuration={1500}
                       />
                     </AreaChart>
                   </ResponsiveContainer>

                   {/* Overlay de Sem Dados */}
                   {(() => {
                      const hasData = tasks.some(t => t.executions?.some(e => {
                        const hasLinkedParam = selectedKPI.linkedParams?.some(pid => {
                          const p = allParams.find(p => p.id === pid);
                          return p && e.kpiValues && e.kpiValues[p.name];
                        });
                        if (!hasLinkedParam) return false;
                        
                        const fullDate = new Date(e.timestamp || e.data);
                        const now = new Date();
                        if (timeFilter === '3 Dias') return (now.getTime() - fullDate.getTime()) <= (3 * 24 * 60 * 60 * 1000);
                        if (timeFilter === '7 Dias') return (now.getTime() - fullDate.getTime()) <= (7 * 24 * 60 * 60 * 1000);
                        if (timeFilter === '15 Dias') return (now.getTime() - fullDate.getTime()) <= (15 * 24 * 60 * 60 * 1000);
                        if (timeFilter === '1 Mês') return (now.getTime() - fullDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
                        if (timeFilter === 'Trimestre') return (now.getTime() - fullDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
                        if (timeFilter === 'Semestre') return (now.getTime() - fullDate.getTime()) <= (180 * 24 * 60 * 60 * 1000);
                        if (timeFilter === 'Ano') return (now.getTime() - fullDate.getTime()) <= (365 * 24 * 60 * 60 * 1000);
                        if (timeFilter === 'Personalizado') {
                          const start = customRange.start ? new Date(customRange.start) : null;
                          const end = customRange.end ? new Date(customRange.end) : null;
                          return (!start || fullDate >= start) && (!end || fullDate <= end);
                        }
                        return false;
                      }));

                      if (!hasData) {
                        return (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-lg)', zIndex: 10 }}>
                            <AlertTriangle size={32} color="var(--warning)" style={{ marginBottom: '12px' }} />
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Nenhum dado encontrado</div>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>Tente um período maior no filtro acima</div>
                          </div>
                        );
                      }
                      return null;
                   })()}
                 </div>
                 <p style={{ 
                     marginTop: '1.5rem', 
                     fontSize: '11px', 
                     color: 'var(--text-tertiary)', 
                     textAlign: 'center',
                     letterSpacing: '0.025em',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '8px'
                   }}>
                     <Activity size={12} />
                     Monitoramento em tempo real dos parâmetros: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedKPI.linkedParams?.map(pid => allParams.find(p => p.id === pid)?.name).join(' • ')}</span>
                   </p>
               </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedKPI(null)}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Adicionar ParÃ¢metros Globais (Apenas Lista) */}
      {isGlobalParamsModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsGlobalParamsModalOpen(false)}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>Parâmetros Globais</h3>
                <button 
                  className="btn-primary" 
                  onClick={() => { setParamForm({ id: '', name: '', type: 'Inteiro', source: '', desc: '' }); setIsParamFormOpen(true); }} 
                  style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Novo ParÃ¢metro"
                >
                  <Plus size={20} />
                </button>
              </div>
              <button className="modal-close" onClick={() => setIsGlobalParamsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem' }}>
               <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: 0, marginBottom: '1.5rem' }}>
                 Gerencie os parâmetros de dados brutos que alimentam as fórmulas dos seus indicadores.
               </p>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                 {allParams.map(param => (
                   <div key={param.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'all 0.2s' }} className="param-card-hover">
                     <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px', minWidth: 0 }}>
                       <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{param.name}</span>
                       <div style={{ display: 'flex', marginBottom: '4px' }}>
                         <span className="param-type-badge">{param.type}</span>
                       </div>
                       {param.source && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Fonte:</strong> {param.source}</span>}
                       {param.desc && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{param.desc}</span>}
                     </div>
                     <div style={{ display: 'flex', gap: '8px', marginLeft: '1rem', flexShrink: 0 }}>
                       <button onClick={() => { setParamForm(param); setIsParamFormOpen(true); }} className="param-action-btn">
                         <Settings size={14} />
                       </button>
                       <button onClick={() => setAllParams(allParams.filter(p => p.id !== param.id))} className="param-action-btn delete">
                         <X size={14} />
                       </button>
                     </div>
                   </div>
                 ))}
                 {allParams.length === 0 && (
                   <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Nenhum parÃ¢metro cadastrado.</div>
                 )}
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal FormulÃ¡rio de ParÃ¢metro */}
      {isParamFormOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsParamFormOpen(false)} style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{paramForm.id ? 'Editar Parâmetro' : 'Novo ParÃ¢metro'}</h3>
              <button className="modal-close" onClick={() => setIsParamFormOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div className="form-group">
                 <label>Nome do Parâmetro</label>
                 <input type="text" placeholder="ex: hora_fechamento" value={paramForm.name} onChange={e => setParamForm({...paramForm, name: e.target.value})} />
               </div>
               <div className="form-group">
                 <label>Tipo de Dado</label>
                 <select value={paramForm.type} onChange={e => setParamForm({...paramForm, type: e.target.value})}>
                   <option value="Inteiro">Inteiro</option>
                   <option value="Decimal">Decimal</option>
                   <option value="Timestamp">Timestamp</option>
                   <option value="Texto">Texto</option>
                   <option value="Booleano">Booleano</option>
                 </select>
               </div>
               <div className="form-group">
                 <label>Fonte / Origem</label>
                 <input type="text" placeholder="ex: Sistema de OS, ERP" value={paramForm.source} onChange={e => setParamForm({...paramForm, source: e.target.value})} />
               </div>
               <div className="form-group">
                 <label>Descrição</label>
                 <input type="text" placeholder="ex: Momento exato em que a OS Ã© fechada" value={paramForm.desc} onChange={e => setParamForm({...paramForm, desc: e.target.value})} />
               </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setIsParamFormOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => {
                if (!paramForm.name) return;
                if (paramForm.id) {
                  setAllParams(allParams.map(p => p.id === paramForm.id ? paramForm : p));
                } else {
                  setAllParams([...allParams, { ...paramForm, id: `p${Date.now()}` }]);
                }
                setIsParamFormOpen(false);
              }}>Salvar Parâmetro</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Editar KPI */}
      {editingKPI && createPortal(
        <div className="modal-overlay" onClick={() => setEditingKPI(null)}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: `${editingKPI.color}20`, color: editingKPI.color }}>
                  <Settings size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Configurar {editingKPI.code}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>{editingKPI.name}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditingKPI(null)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ gap: '1.5rem' }}>

              {/* SeÃ§Ã£o: ParÃ¢metros Vinculados */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0 }}>Parâmetros Vinculados</label>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn-outline"
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                      onClick={() => setEditingKPI({ ...editingKPI, _showParamPicker: !editingKPI._showParamPicker })}
                    >
                      <Plus size={13} /> Adicionar Parâmetro
                    </button>
                    {editingKPI._showParamPicker && (
                      <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)', width: '260px', overflow: 'hidden' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Selecione um parâmetro
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {allParams.filter(p => !editingKPI.linkedParams?.includes(p.id)).map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                const next = [...(editingKPI.linkedParams || []), p.id];
                                setEditingKPI({ ...editingKPI, linkedParams: next, _showParamPicker: false });
                              }}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{p.type} Â· {p.source || 'Sem fonte'}</span>
                            </button>
                          ))}
                          {allParams.filter(p => !editingKPI.linkedParams?.includes(p.id)).length === 0 && (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Todos os parâmetros jÃ¡ foram adicionados</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ minHeight: '60px', background: 'rgba(0,0,0,0.25)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
                  {(editingKPI.linkedParams || []).length === 0 ? (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', alignSelf: 'center' }}>Nenhum parâmetro vinculado. Clique em "Adicionar Parâmetro" acima.</span>
                  ) : (
                    editingKPI.linkedParams.map((pid: string) => {
                      const param = allParams.find(p => p.id === pid);
                      if (!param) return null;
                      return (
                        <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${editingKPI.color}18`, border: `1px solid ${editingKPI.color}40`, borderRadius: '20px', padding: '5px 10px 5px 12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: editingKPI.color }}>{param.name}</span>
                          <button
                            onClick={() => setEditingKPI({ ...editingKPI, linkedParams: editingKPI.linkedParams.filter((id: string) => id !== pid) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: editingKPI.color, display: 'flex', padding: '0', opacity: 0.7 }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SeÃ§Ã£o: Construtor de FÃ³rmula */}
              <div className="form-group">
                <label>Construtor de Fórmula</label>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '0 0 10px 0' }}>
                  Clique nos balões dos parâmetros e nos operadores para montar a fórmula. Você também pode editar diretamente no campo.
                </p>

                {/* Paleta de tokens disponÃ­veis */}
                {(editingKPI.linkedParams || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {editingKPI.linkedParams.map((pid: string) => {
                      const param = allParams.find(p => p.id === pid);
                      if (!param) return null;
                      return (
                        <button
                          key={pid}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', param.name);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => setEditingKPI({ ...editingKPI, formula: (editingKPI.formula || '') + param.name })}
                          title="Arraste ou clique para inserir na fórmula"
                          style={{ 
                            padding: '5px 12px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: 700, 
                            background: `${editingKPI.color}20`, 
                            border: `1px solid ${editingKPI.color}50`, 
                            color: editingKPI.color, 
                            cursor: 'grab', 
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          {param.name}
                        </button>
                      );
                    })}
                    <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
                    {['(', ')', '+', '-', '*', '/', 'SUM()', 'AVG()', 'COUNT()', '100'].map(op => (
                      <button
                        key={op}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', ` ${op} `);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => setEditingKPI({ ...editingKPI, formula: (editingKPI.formula || '') + ' ' + op + ' ' })}
                        style={{ 
                          padding: '5px 10px', 
                          borderRadius: '8px', 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid var(--border)', 
                          color: 'var(--text-secondary)', 
                          cursor: 'grab', 
                          transition: 'all 0.2s',
                          userSelect: 'none'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                )}

                {/* Campo de fÃ³rmula editÃ¡vel */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <textarea
                    value={editingKPI.formula || ''}
                    onChange={e => setEditingKPI({ ...editingKPI, formula: e.target.value })}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = editingKPI.color;
                      e.currentTarget.style.background = `${editingKPI.color}05`;
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onDrop={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'transparent';
                      // O navegador geralmente jÃ¡ insere o texto se dataTransfer estiver definido.
                      // Mas garantimos que o estado seja atualizado se o navegador nÃao disparar onChange.
                      setTimeout(() => {
                        setEditingKPI({ ...editingKPI, formula: (e.target as HTMLTextAreaElement).value });
                      }, 0);
                    }}
                    placeholder="Arraste os balÃµes acima para montar a fÃ³rmula ou digite diretamente aqui..."
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '13px', 
                      minHeight: '80px', 
                      resize: 'vertical', 
                      flex: 1,
                      transition: 'all 0.2s'
                    }}
                  />
                  <button
                    onClick={() => setEditingKPI({ ...editingKPI, formula: '' })}
                    title="Limpar fórmula"
                    style={{ alignSelf: 'flex-start', padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingKPI(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => {
                const { _showParamPicker, ...kpiToSave } = editingKPI;
                setAllKpis(allKpis.map(k => k.id === kpiToSave.id ? kpiToSave : k));
                setEditingKPI(null);
              }}>Salvar Configurações</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
