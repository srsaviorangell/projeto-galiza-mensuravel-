const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'KPIs.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Destructuring AppContext
const oldContextLine = `const { projects, tasks, refreshData, kpis: allKpis, setKpis: setAllKpis, globalParams: allParams, setGlobalParams: setAllParams } = useContext(AppContext);`;
const newContextLine = `const { projects, tasks, refreshData, kpiCollections = [], kpis: allKpis, setKpis: setAllKpis, globalParams: allParams, setGlobalParams: setAllParams } = useContext(AppContext);`;

if (!content.includes(oldContextLine)) {
  console.error("Context line not found!");
  process.exit(1);
}
content = content.replace(oldContextLine, newContextLine);

// 2. States insertion
const oldNewKpiState = `const [newKpi, setNewKpi] = useState({ code: '', name: '', category: 'Operacional', unit: '', color: '#FF5E2A' });`;
const newStates = `const [newKpi, setNewKpi] = useState({ code: '', name: '', category: 'Operacional', unit: '', color: '#FF5E2A' });
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedMetric, setSelectedMetric] = useState<string>('count');
  const [taskDetailModal, setTaskDetailModal] = useState<any>(null);

  useEffect(() => {
    if (selectedKPI) {
      setSelectedMetric('count');
      setChartType('area');
    }
  }, [selectedKPI]);`;

if (!content.includes(oldNewKpiState)) {
  console.error("newKpi state line not found!");
  process.exit(1);
}
content = content.replace(oldNewKpiState, newStates);

// 3. modalChartData & associatedTasks insertion
const oldTrackRefs = `const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});`;
const newMemos = `const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const modalChartData = useMemo(() => {
    if (!selectedKPI) return [];
    
    const byDate = {};
    (kpiCollections || []).forEach((c) => {
      if (c.kpiCode !== selectedKPI.code) return;
      
      const fullDate = new Date(c.dataColeta || c.created_at);
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

      if (!isWithinRange) return;

      const dLabel = fullDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      if (!byDate[dLabel]) {
        byDate[dLabel] = { total: 0, count: 0, timestamp: fullDate.getTime() };
      }
      
      let itemVal = 0;
      if (selectedMetric === 'count') {
        itemVal = 1;
      } else if (selectedMetric === 'quantidade') {
        itemVal = Number(c.quantidade || 0);
      } else if (selectedMetric === 'ope009_avg') {
        if (c.valores && c.valores.Hora_abertura_OS && c.valores.Hora_diagnóstico_confirmado) {
          const start = new Date(c.valores.Hora_abertura_OS);
          const diag = new Date(c.valores.Hora_diagnóstico_confirmado);
          const duration = (diag.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (duration > 0) {
            itemVal = duration;
          }
        }
      } else if (selectedMetric.startsWith('param_')) {
        const pname = selectedMetric.substring(6);
        itemVal = Number(c.valores && c.valores[pname] || 0);
      }
      
      byDate[dLabel].total += itemVal;
      byDate[dLabel].count += 1;
    });
    
    const res = Object.entries(byDate)
      .map(([date, obj]) => {
        const finalVal = selectedMetric === 'ope009_avg' 
          ? (obj.count > 0 ? Number((obj.total / obj.count).toFixed(1)) : 0)
          : Number(obj.total.toFixed(1));
        return { date, valor: finalVal, ts: obj.timestamp };
      })
      .sort((a, b) => a.ts - b.ts);

    return res;
  }, [selectedKPI, selectedMetric, kpiCollections, timeFilter, customRange]);

  const associatedTasks = useMemo(() => {
    if (!selectedKPI) return [];
    return tasks.filter((t) => t.kpiEnabled && t.kpiCode === selectedKPI.code);
  }, [selectedKPI, tasks]);`;

if (!content.includes(oldTrackRefs)) {
  console.error("trackRefs line not found!");
  process.exit(1);
}
content = content.replace(oldTrackRefs, newMemos);

// 4. Replace kpiData block
const startKpiDataAnchor = `  const kpiData = useMemo(() => {`;
const endKpiDataAnchor = `  }, [allKpis, timeFilter, tasks, customRange]);`;

const startIndexKpiData = content.indexOf(startKpiDataAnchor);
const endIndexKpiData = content.indexOf(endKpiDataAnchor) + endKpiDataAnchor.length;

if (startIndexKpiData === -1 || endIndexKpiData === -1) {
  console.error("kpiData hooks boundaries not found!");
  process.exit(1);
}

const newKpiDataMemo = `  const kpiData = useMemo(() => {
    const now = new Date();
    
    return allKpis.reduce((acc, kpi) => {
      // Filtra as coletas para este KPI no período selecionado
      const filteredCollections = (kpiCollections || []).filter(c => {
        if (c.kpiCode !== kpi.code) return false;
        
        const fullDate = new Date(c.dataColeta || c.created_at);
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

      if (kpi.id === 'ope009') {
        let totalDiffHours = 0;
        let totalOS = 0;

        filteredCollections.forEach(c => {
          if (c.valores && c.valores.Hora_abertura_OS && c.valores.Hora_diagnóstico_confirmado) {
            const start = new Date(c.valores.Hora_abertura_OS);
            const diag = new Date(c.valores.Hora_diagnóstico_confirmado);
            const diff = (diag.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (diff > 0) {
              totalDiffHours += diff;
              totalOS += Number(c.valores.N_OS_período || 1);
            }
          }
        });

        const avg = totalOS > 0 ? (totalDiffHours / totalOS).toFixed(1) : '0.0';
        acc[kpi.id] = { value: avg, trend: '0.0', label: kpi.unit };
      } else {
        // Para outros KPIs, somar a quantidade real da tabela do banco
        const totalQty = filteredCollections.reduce((sum, c) => sum + Number(c.quantidade || 0), 0);
        acc[kpi.id] = { value: totalQty.toFixed(1), trend: '0.0', label: kpi.unit };
      }
      
      return acc;
    }, {});
  }, [allKpis, timeFilter, kpiCollections, customRange]);`;

content = content.substring(0, startIndexKpiData) + newKpiDataMemo + content.substring(endIndexKpiData);

// 5. Replace chartData block
const startChartDataAnchor = `  const chartData = useMemo(() => {`;
const endChartDataAnchor = `  }, [tasks]);`;

const startIndexChartData = content.indexOf(startChartDataAnchor);
const endIndexChartData = content.indexOf(endChartDataAnchor) + endChartDataAnchor.length;

if (startIndexChartData === -1 || endIndexChartData === -1) {
  console.error("chartData hooks boundaries not found!");
  process.exit(1);
}

const newChartDataMemo = `  const chartData = useMemo(() => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = \`\${d.getDate()}/\${d.getMonth() + 1}\`;
      
      // Conta coletas registradas no banco nesse dia
      const dayCollections = (kpiCollections || []).filter(c => {
        const cDate = new Date(c.dataColeta || c.created_at);
        return cDate.getDate() === d.getDate() && cDate.getMonth() === d.getMonth();
      }).length;

      data.push({ 
        date: dStr,
        executions: dayCollections,
        concluidas: tasks.filter(t => t.status === 'Concluída').length,
        novas: 0
      });
    }
    return data;
  }, [kpiCollections, tasks]);`;

content = content.substring(0, startIndexChartData) + newChartDataMemo + content.substring(endIndexChartData);

// 6. Mini chart data replacement
const oldMiniChart = `            // Gerar dados reais para o mini-gráfico
            const miniChartData = tasks.filter(t => t.executions?.some((e: any) => e.kpiValues && e.kpiValues[allParams.find(p => kpi.linkedParams?.includes(p.id))?.name || '']))
              .slice(-7).map((t, idx) => ({ val: Math.random() * 10 })); // Placeholder se não houver execuções`;

const newMiniChart = `            // Gerar dados reais para o mini-gráfico
            const miniChartData = (kpiCollections || []).filter(c => c.kpiCode === kpi.code)
              .slice(-7).map(c => ({ val: Number(c.quantidade || 0) }));`;

if (content.includes(oldMiniChart)) {
  content = content.replace(oldMiniChart, newMiniChart);
}

// 7. selectedKPI modal details body replacement (Z-indexed index based navigation)
const oldChartHeader = "Evolução de Coleta de Parâmetros";
const startIdx = content.indexOf(oldChartHeader);

if (startIdx === -1) {
  console.error("Evolução heading not found!");
  process.exit(1);
}

const divIdx = content.lastIndexOf("<div>", startIdx);

const footnoteText = "Monitoramento em tempo real dos parâmetros";
const footnoteIdx = content.indexOf(footnoteText, startIdx);

if (divIdx === -1 || footnoteIdx === -1) {
  console.error("Chart container anchors not found!");
  process.exit(1);
}

const pEndIdx = content.indexOf("</p>", footnoteIdx);
const divEndIdx = content.indexOf("</div>", pEndIdx) + 6;

const newModalBody = `<div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px' }}>
                      Evolução de Coleta de Parâmetros
                    </h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Métrica:</label>
                        <select 
                          value={selectedMetric} 
                          onChange={e => setSelectedMetric(e.target.value)}
                          style={{ 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid var(--border)', 
                            color: 'var(--text-primary)', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="count">Volume de Coletas</option>
                          <option value="quantidade">Quantidade Produzida</option>
                          {selectedKPI.id === 'ope009' && (
                            <option value="ope009_avg">Tempo de Diagnóstico Médio (h)</option>
                          )}
                          {selectedKPI.linkedParams && selectedKPI.linkedParams.length > 0
                            ? selectedKPI.linkedParams.map((pid) => {
                                const p = allParams.find(pr => pr.id === pid);
                                if (!p) return null;
                                return <option key={p.id} value={\`param_\${p.name}\`}>Parâmetro: {p.name}</option>;
                              }).filter(Boolean)
                            : (selectedKPI.params || []).map((pname) => (
                                <option key={pname} value={\`param_\${pname}\`}>Parâmetro: {pname}</option>
                              ))
                          }
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '3px', borderRadius: '8px' }}>
                        <button 
                          onClick={() => setChartType('area')}
                          style={{ 
                            padding: '5px 12px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            border: 'none', 
                            cursor: 'pointer', 
                            background: chartType === 'area' ? selectedKPI.color : 'transparent', 
                            color: chartType === 'area' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          📈 Área
                        </button>
                        <button 
                          onClick={() => setChartType('bar')}
                          style={{ 
                            padding: '5px 12px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            border: 'none', 
                            cursor: 'pointer', 
                            background: chartType === 'bar' ? selectedKPI.color : 'transparent', 
                            color: chartType === 'bar' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          📊 Barras
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ height: '300px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: \`\${selectedKPI.color}15\`, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                    
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={modalChartData}>
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
                      ) : (
                        <BarChart data={modalChartData}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={selectedKPI.color} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={selectedKPI.color} stopOpacity={0.2}/>
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
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          />
                          <Bar 
                            dataKey="valor" 
                            fill="url(#colorBar)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={40}
                            animationDuration={1500}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                    
                    {modalChartData.length === 0 && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-lg)', zIndex: 10 }}>
                        <AlertTriangle size={32} color="var(--warning)" style={{ marginBottom: '12px' }} />
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Nenhum dado encontrado</div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>Tente um período maior no filtro acima</div>
                      </div>
                    )}
                  </div>
                  
                  <p style={{ 
                      marginTop: '1.5rem', 
                      marginBottom: '2.5rem',
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
                      Monitoramento em tempo real dos parâmetros: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {selectedKPI.linkedParams && selectedKPI.linkedParams.length > 0
                          ? selectedKPI.linkedParams.map((pid) => allParams.find(p => p.id === pid)?.name).join(' • ')
                          : (selectedKPI.params || []).join(' • ')}
                      </span>
                    </p>

                  <div>
                    <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} style={{ color: selectedKPI.color }} />
                      Projetos & Atividades Vinculadas ({associatedTasks.length})
                    </h4>
                    
                    {associatedTasks.length === 0 ? (
                      <div style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        Nenhuma atividade vinculada a este indicador no momento.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {associatedTasks.map((task) => {
                          const project = projects.find((p) => p.id === task.projectId);
                          return (
                            <div 
                              key={task.id} 
                              onClick={() => setTaskDetailModal(task)}
                              style={{ 
                                background: 'var(--bg-secondary)', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border)', 
                                padding: '16px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                              className="kpi-task-card-hover"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 800, 
                                  textTransform: 'uppercase', 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  background: task.status === 'Concluída' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: task.status === 'Concluída' ? 'var(--success)' : '#f59e0b',
                                  border: \`1px solid \${task.status === 'Concluída' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}\`
                                }}>
                                  {task.status}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                  {task.priority}
                                </span>
                              </div>
                              
                              <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {task.title}
                              </h5>
                              
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  background: 'rgba(255, 100, 0, 0.05)', 
                                  color: 'var(--accent)', 
                                  fontSize: '9px', 
                                  fontWeight: 800,
                                  border: '1px solid rgba(255, 100, 0, 0.15)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%'
                                }}>
                                  {project ? project.name.toUpperCase() : 'TAREFA AVULSA'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>`;

content = content.substring(0, divIdx) + newModalBody + content.substring(divEndIdx);

// 8. Add task details sub-modal before editingKPI modal
const commentAnchor = "{/* Modal Editar KPI */}";
const commentIdx = content.indexOf(commentAnchor);

if (commentIdx === -1) {
  console.error("Comment anchor not found!");
  process.exit(1);
}

const newSubModalPortal = `      {/* Modal Detalhes da Atividade Relacionada (Sub-modal) */}
      {taskDetailModal && createPortal(
        <div className="modal-overlay" onClick={() => setTaskDetailModal(null)} style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: \`\${taskDetailModal.color || 'var(--accent)'}15\`, color: taskDetailModal.color || 'var(--accent)' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{taskDetailModal.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    ID: {taskDetailModal.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setTaskDetailModal(null)}><X size={20}/></button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255, 100, 0, 0.08)', color: 'var(--accent)', borderColor: 'rgba(255, 100, 0, 0.2)', borderWidth: '1px', borderStyle: 'solid', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                  PROJETO: {(() => {
                    const proj = projects.find((p) => p.id === taskDetailModal.projectId);
                    return proj ? proj.name.toUpperCase() : 'TAREFA AVULSA';
                  })()}
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Status: <strong style={{ color: taskDetailModal.status === 'Concluída' ? 'var(--success)' : '#f59e0b' }}>{taskDetailModal.status}</strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Prioridade: <strong>{taskDetailModal.priority}</strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Descrição da Atividade</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', minHeight: '60px' }}>
                  {taskDetailModal.description || 'Sem descrição.'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,100,0,0.04)', border: '1px dashed rgba(255,100,0,0.3)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: 800 }}>
                  <BarChart3 size={16} />
                  <span>Indicador Vinculado: {taskDetailModal.kpiCode}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Esta tarefa está ativamente alimentando os dados do KPI {taskDetailModal.kpiCode}.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Progresso de Produção</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: \`conic-gradient(\${taskDetailModal.status === 'Concluída' ? '#10b981' : '#f97316'} \${taskDetailModal.measurementTarget > 0 ? (taskDetailModal.measurementCurrent / taskDetailModal.measurementTarget) * 360 : 0}deg, rgba(255,255,255,0.05) 0deg)\`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white' }}>
                        {taskDetailModal.measurementTarget > 0 ? Math.round((taskDetailModal.measurementCurrent / taskDetailModal.measurementTarget) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {taskDetailModal.measurementCurrent} {taskDetailModal.measurementType || 'UN'} de {taskDetailModal.measurementTarget} {taskDetailModal.measurementType || 'UN'}
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: \`\${Math.min(taskDetailModal.measurementTarget > 0 ? (taskDetailModal.measurementCurrent / taskDetailModal.measurementTarget) * 100 : 0, 100)}%\`, background: taskDetailModal.status === 'Concluída' ? '#10b981' : 'linear-gradient(90deg, #f97316, #fb923c)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Histórico de Lançamentos (\${taskDetailModal.executions?.length || 0})</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {(!taskDetailModal.executions || taskDetailModal.executions.length === 0) ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Nenhum lançamento efetuado nesta atividade.</span>
                  ) : (
                    taskDetailModal.executions.map((exec, idx) => (
                      <div key={idx} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          <span>Lançamento #\${idx + 1}</span>
                          <span>{new Date(exec.timestamp || exec.data).toLocaleString('pt-BR')}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          Adicionado +\${exec.amount} {taskDetailModal.measurementType || 'UN'}
                        </div>
                        {exec.kpiValues && Object.keys(exec.kpiValues).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                            {Object.entries(exec.kpiValues).map(([k, v]) => (
                              <span key={k} style={{ fontSize: '10px', color: 'var(--accent)', background: 'rgba(255,100,0,0.04)', border: '1px dashed rgba(255,100,0,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                        {exec.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '4px', marginTop: '2px' }}>
                            <strong>Comentário:</strong> {exec.description}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTaskDetailModal(null)}>Fechar Detalhes</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      `;

content = content.substring(0, commentIdx) + newSubModalPortal + content.substring(commentIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated KPIs.tsx!");
