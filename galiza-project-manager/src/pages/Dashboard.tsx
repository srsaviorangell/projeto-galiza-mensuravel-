import { useMemo, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  BarChart3,
  X,
  Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppContext } from '../App';
import './Dashboard.css';

export default function Dashboard() {
  const { projects, tasks, users, stats, userStats, userTasks, isAdmin } = useContext(AppContext);
  const navigate = useNavigate();
  
  const displayTasks = isAdmin ? tasks : userTasks;
  const displayStats = isAdmin ? stats : userStats;

  const allAssignees = useMemo(() => users.map(u => ({ id: u.id, name: u.name, type: 'user' })), [users]);
  
  const [chartContext, setChartContext] = useState<{ type: 'collab' | 'project', id: string, name: string } | null>(null);
  const [timeRange, setTimeRange] = useState<'3 Dias' | 'Semana' | '15 Dias' | 'Mês' | 'Trimestre' | 'Semestre' | 'Ano'>('Semana');
  const [sparklineRange, setSparklineRange] = useState<'7 Dias' | '15 Dias' | 'Mês' | 'Trimestre'>('7 Dias');

  const getSparklineDays = () => {
    switch (sparklineRange) {
      case '15 Dias': return 15;
      case 'Mês': return 30;
      case 'Trimestre': return 90;
      default: return 7;
    }
  };

  const collabsSparklineData = useMemo(() => {
    const today = new Date();
    const days = getSparklineDays();
    
    return allAssignees.map(collab => {
      const collabTasks = tasks.filter(t => t.assignee === collab.name || String(t.assigneeId) === String(collab.id));
      const executions = collabTasks.flatMap(t => t.executions || []).filter(e => String(e.colaboradorId) === String(collab.id));
      
      const data = [];
      let total = 0;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        const dailyActs = executions.filter(a => a.data === dateString).length;
        total += dailyActs;
        data.push({ producao: dailyActs });
      }
      
      return { ...collab, data, total };
    });
  }, [tasks, allAssignees, sparklineRange]);

  const projectsSparklineData = useMemo(() => {
    const today = new Date();
    const days = getSparklineDays();
    
    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const executions = projTasks.flatMap(t => t.executions || []);
      
      const data = [];
      let total = 0;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        const dailyActs = executions.filter(a => a.data === dateString).length;
        total += dailyActs;
        data.push({ producao: dailyActs });
      }
      
      return { ...proj, data, total };
    });
  }, [tasks, projects, sparklineRange]);

  // Expanded Chart Logic
  const targetTasks = useMemo(() => {
    if (!chartContext) return [];
    if (chartContext.type === 'collab') {
      return tasks.filter(t => t.assignee === chartContext.name || String(t.assigneeId) === chartContext.id);
    } else {
      return tasks.filter(t => String(t.projectId) === chartContext.id);
    }
  }, [tasks, chartContext]);

  const targetExecutions = useMemo(() => {
    if (!chartContext) return [];
    const executions = targetTasks.flatMap(t => {
      return (t.executions || []).map(e => ({
        ...e,
        taskTitle: t.title,
        taskMeasurement: t.measurementType || 'un'
      }));
    });
    if (chartContext.type === 'collab') {
       return executions.filter(e => String(e.colaboradorId) === chartContext.id);
    }
    return executions;
  }, [targetTasks, chartContext]);

  const chartData = useMemo(() => {
    if (!chartContext) return [];
    const data = [];
    const today = new Date();
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dailyActivities = targetExecutions.filter(a => a.data === dateString);
      const sum = dailyActivities.length;
      const [year, month, day] = dateString.split('-');
      const label = days > 90 ? `${month}/${year}` : `${day}/${month}`;
      data.push({ date: label, producao: sum });
    }
    return data;
  }, [chartContext, targetExecutions, timeRange]);

  const filteredExecutions = useMemo(() => {
    if (!chartContext) return [];
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;
    
    const now = new Date().getTime();
    return targetExecutions.filter(e => {
       const eDate = new Date(e.timestamp || e.data).getTime();
       const diffDays = (now - eDate) / (1000 * 3600 * 24);
       return diffDays <= days;
    }).sort((a, b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime());
  }, [chartContext, targetExecutions, timeRange]);

  const chartStats = useMemo(() => {
    if (!chartContext) return { total: 0, prevTotal: 0, increase: 0, percent: 0 };
    const currentData = chartData.map(d => d.producao);
    const total = currentData.reduce((a, b) => a + b, 0);
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;
    
    const prevTotal = targetExecutions.filter(e => {
       const eDate = new Date(e.timestamp || e.data).getTime();
       const now = new Date().getTime();
       const diffDays = (now - eDate) / (1000 * 3600 * 24);
       return diffDays >= days && diffDays < days * 2;
    }).length;
    
    const increase = total - prevTotal;
    const percent = prevTotal === 0 ? (total > 0 ? 100 : 0) : ((increase / prevTotal) * 100);
    return { total, increase, percent: percent.toFixed(1) };
  }, [chartData, chartContext, targetExecutions, timeRange]);

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const projectsOnTime = projects.filter(p => {
      if (!p.endDate || p.progress === 100) return true;
      const parts = p.endDate.split('/');
      if (parts.length !== 3) return true;
      const year = parseInt(parts[2]) + (parts[2].length === 2 ? 2000 : 0);
      const endDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
      return endDate >= now;
    }).length;

    const completedThisWeek = displayTasks.filter(t => {
      if (t.status !== 'Concluída' || !t.completedAt) return false;
      const completed = new Date(t.completedAt);
      return completed >= thisWeek;
    }).length;

    const tasksByPriority = {
      urgent: displayTasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length,
      high: displayTasks.filter(t => t.priority === 'Alta' && t.status !== 'Concluída').length,
      medium: displayTasks.filter(t => t.priority === 'Média' && t.status !== 'Concluída').length,
      low: displayTasks.filter(t => t.priority === 'Baixa' && t.status !== 'Concluída').length,
    };

    const projectProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0);
    const avgProjectProgress = projects.length > 0 ? Math.round(projectProgress / projects.length) : 0;

    const lateProjects = projects.filter(p => {
      if (!p.endDate || p.progress === 100) return false;
      const parts = p.endDate.split('/');
      if (parts.length !== 3) return false;
      const year = parseInt(parts[2]) + (parts[2].length === 2 ? 2000 : 0);
      const endDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
      return endDate < now;
    }).length;

    return {
      projectsOnTime,
      completedThisWeek,
      tasksByPriority,
      avgProjectProgress,
      lateProjects,
      completionRate: displayStats.totalProjects > 0 
        ? Math.round((projects.filter(p => p.progress === 100).length / displayStats.totalProjects) * 100)
        : 0,
    };
  }, [projects, displayTasks, displayStats]);

  const urgentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'Concluída' && (t.priority === 'Urgente' || t.daysLate > 0))
      .slice(0, 5);
  }, [tasks]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 4);
  }, [projects]);

  const projectProgressData = useMemo(() => {
    return projects.slice(0, 6).map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      progress: p.progress || 0,
      status: p.progress === 100 ? 'concluido' : 
             p.endDate && new Date(p.endDate.split('/').reverse().join('-')) < new Date() ? 'atrasado' : 'em-andamento',
      statusLabel: p.progress === 100 ? 'Concluído' : 
             p.endDate && new Date(p.endDate.split('/').reverse().join('-')) < new Date() ? 'Atrasado' : 'Em andamento',
    }));
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'var(--success)';
      case 'Atrasado': return 'var(--danger)';
      default: return 'var(--accent)';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Urgente': return <AlertTriangle size={14} />;
      case 'Alta': return <Zap size={14} />;
      case 'Média': return <Target size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="dashboard-container animate-fadeIn">
      {/* ===== Header ===== */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Visão geral dos seus projetos e métricas</p>
        </div>
        <div className="dashboard-date">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
          })}</span>
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      <div className="stats-grid">
        <div className="stat-card stat-projects">
          <div className="stat-icon-wrapper">
            <FolderKanban size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{displayStats.totalProjects}</span>
            <span className="stat-label">Total de Projetos</span>
          </div>
          <div className="stat-trend positive">
            <ArrowUpRight size={14} />
            <span>{dashboardStats.completedThisWeek} esta semana</span>
          </div>
        </div>

        <div className="stat-card stat-progress">
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboardStats.avgProjectProgress}%</span>
            <span className="stat-label">Progresso Médio</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${dashboardStats.avgProjectProgress}%` }}
            />
          </div>
        </div>

        <div className="stat-card stat-tasks">
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{displayStats.completedTasks}/{displayStats.pendingTasks + displayStats.completedTasks}</span>
            <span className="stat-label">Tarefas Concluídas</span>
          </div>
          <div className="stat-completion">
            <span className="completion-rate">{dashboardStats.completionRate}%</span>
            <span className="completion-label">taxa de conclusão</span>
          </div>
        </div>
      </div>

      {/* ===== Main Content Grid ===== */}
      <div className="dashboard-main">
        {/* ===== Project Progress Chart ===== */}
        <div className="dashboard-card progress-chart-card">
          <div className="card-header">
            <div className="card-title">
              <BarChart3 size={18} />
              <h3>Progresso dos Projetos</h3>
            </div>
            <button className="card-action" onClick={() => navigate('/projetos')}>
              Ver todos <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="progress-chart">
            {projectProgressData.length === 0 ? (
              <div className="empty-chart">
                <FolderKanban size={32} />
                <p>Nenhum projeto cadastrado</p>
              </div>
            ) : (
              projectProgressData.map((proj, i) => (
                <div 
                  key={i} 
                  className="progress-item"
                  onClick={() => navigate(`/projetos/${projects[i]?.id}`)}
                >
                  <div className="progress-item-header">
                    <span className="progress-item-name">{proj.name}</span>
                    <span className={`progress-item-status ${proj.status}`}>
                      {proj.statusLabel}
                    </span>
                  </div>
                  <div className="progress-item-bar">
                    <div 
                      className="progress-item-fill"
                      style={{ 
                        width: `${proj.progress}%`,
                        backgroundColor: getStatusColor(proj.status)
                      }}
                    />
                  </div>
                  <span className="progress-item-percent">{proj.progress}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== Activity Sparklines Card (Replaces Urgent Tasks) ===== */}
        {isAdmin && (
          <div className="dashboard-card sparklines-card">
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div className="card-title">
                <Activity size={18} />
                <h3>Ritmo ({sparklineRange})</h3>
              </div>
              <select 
                className="sparkline-filter-select"
                value={sparklineRange}
                onChange={(e) => setSparklineRange(e.target.value as any)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="7 Dias">7 Dias</option>
                <option value="15 Dias">15 Dias</option>
                <option value="Mês">Mês</option>
                <option value="Trimestre">Trimestre</option>
              </select>
            </div>
            
            <div className="sparklines-list">
              {[...collabsSparklineData, ...projectsSparklineData].map(item => (
                <div 
                  key={`${item.type || 'proj'}-${item.id}`} 
                  className="sparkline-item-card"
                  onClick={() => setChartContext({ type: item.type === 'user' ? 'collab' : 'project', id: String(item.id), name: item.name })}
                >
                  <span className="sparkline-name">{item.name}</span>
                  <div className="sparkline-chart-wrapper">
                    <ResponsiveContainer width="100%" height={50}>
                      <AreaChart data={item.data}>
                         <defs>
                           <linearGradient id="colorPurpleGlow" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#d8b4fe" stopOpacity={0.6}/>
                             <stop offset="100%" stopColor="#a855f7" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Area 
                           type="monotone" 
                           dataKey="producao" 
                           stroke="#d8b4fe" 
                           fill="url(#colorPurpleGlow)"
                           strokeWidth={2}
                           isAnimationActive={false}
                           dot={(props: any) => {
                             const { cx, cy, index, dataCount } = props;
                             if (index === dataCount - 1) { // generic dynamic end dot
                               return <circle key={index} cx={cx} cy={cy} r={3} fill="#fff" stroke="none" />;
                             }
                             return <span key={index} />;
                           }}
                         />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Priority Breakdown ===== */}
        <div className="dashboard-card priority-breakdown-card">
          <div className="card-header">
            <div className="card-title">
              <Target size={18} />
              <h3>Distribuição por Prioridade</h3>
            </div>
          </div>
          <div className="priority-breakdown">
            <div className="priority-item priority-urgent">
              <div className="priority-header">
                <span className="priority-name">Urgente</span>
                <span className="priority-count">{dashboardStats.tasksByPriority.urgent}</span>
              </div>
              <div className="priority-bar">
                <div 
                  className="priority-fill"
                  style={{ width: `${(dashboardStats.tasksByPriority.urgent / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="priority-item priority-high">
              <div className="priority-header">
                <span className="priority-name">Alta</span>
                <span className="priority-count">{dashboardStats.tasksByPriority.high}</span>
              </div>
              <div className="priority-bar">
                <div 
                  className="priority-fill"
                  style={{ width: `${(dashboardStats.tasksByPriority.high / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="priority-item priority-medium">
              <div className="priority-header">
                <span className="priority-name">Média</span>
                <span className="priority-count">{dashboardStats.tasksByPriority.medium}</span>
              </div>
              <div className="priority-bar">
                <div 
                  className="priority-fill"
                  style={{ width: `${(dashboardStats.tasksByPriority.medium / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="priority-item priority-low">
              <div className="priority-header">
                <span className="priority-name">Baixa</span>
                <span className="priority-count">{dashboardStats.tasksByPriority.low}</span>
              </div>
              <div className="priority-bar">
                <div 
                  className="priority-fill"
                  style={{ width: `${(dashboardStats.tasksByPriority.low / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== Recent Projects ===== */}
        <div className="dashboard-card recent-projects-card">
          <div className="card-header">
            <div className="card-title">
              <FolderKanban size={18} />
              <h3>Projetos em Destaque</h3>
            </div>
            <button className="card-action" onClick={() => navigate('/projetos')}>
              Ver todos <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="recent-projects-grid">
            {recentProjects.length === 0 ? (
              <div className="empty-projects">
                <FolderKanban size={32} />
                <p>Nenhum projeto</p>
              </div>
            ) : (
              recentProjects.map((proj) => {
                const statusClass = proj.progress === 100 ? 'concluido' : 
                  proj.endDate && new Date(proj.endDate.split('/').reverse().join('-')) < new Date() 
                  ? 'atrasado' : 'em-andamento';
                const statusLabel = proj.progress === 100 ? 'Concluído' : 
                  proj.endDate && new Date(proj.endDate.split('/').reverse().join('-')) < new Date() 
                  ? 'Atrasado' : 'Em andamento';
                return (
                  <div 
                    key={proj.id} 
                    className="project-mini-card"
                    onClick={() => navigate(`/projetos/${proj.id}`)}
                  >
                    <div className="project-mini-header">
                      <h4>{proj.name}</h4>
                      <span className={`project-mini-status ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="project-mini-progress">
                      <div className="mini-progress-bar">
                        <div 
                          className="mini-progress-fill"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <span className="mini-progress-text">{proj.progress}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {chartContext && createPortal(
        <div className="reference-modal-overlay animate-fadeIn" onClick={() => setChartContext(null)}>
          <div className="reference-chart-card" onClick={e => e.stopPropagation()}>
            <div className="rcc-header">
              <div className="rcc-title-row">
                <h2>Gráfico de Desempenho</h2>
                <button className="rcc-settings-btn" onClick={() => setChartContext(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="rcc-subtitle-row">
                <span className="rcc-label">{chartContext.type === 'collab' ? 'Colaborador' : 'Projeto'}</span>
                <div className="rcc-value-col">
                  <span className="rcc-main-value">{chartContext.name}</span>
                  <span className="rcc-sub-value">Produção Registrada (Atividades)</span>
                </div>
              </div>
            </div>

            <div className="rcc-tabs-container">
              <div className="rcc-tabs">
                <button className={`rcc-tab ${timeRange === '3 Dias' ? 'active' : ''}`} onClick={() => setTimeRange('3 Dias')}>3 Dias</button>
                <button className={`rcc-tab ${timeRange === 'Semana' ? 'active' : ''}`} onClick={() => setTimeRange('Semana')}>Semana</button>
                <button className={`rcc-tab ${timeRange === '15 Dias' ? 'active' : ''}`} onClick={() => setTimeRange('15 Dias')}>15 Dias</button>
                <button className={`rcc-tab ${timeRange === 'Mês' ? 'active' : ''}`} onClick={() => setTimeRange('Mês')}>Mês</button>
                <select 
                  className={`rcc-tab-select ${['Trimestre', 'Semestre', 'Ano'].includes(timeRange) ? 'active' : ''}`}
                  value={['Trimestre', 'Semestre', 'Ano'].includes(timeRange) ? timeRange : ''} 
                  onChange={(e) => {
                    if (e.target.value) setTimeRange(e.target.value as any);
                  }}
                >
                  <option value="" disabled>Mais...</option>
                  <option value="Trimestre">Trimestre</option>
                  <option value="Semestre">Semestre</option>
                  <option value="Ano">Ano</option>
                </select>
              </div>
            </div>

            <div className="rcc-chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    minTickGap={20}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1C1C1E', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#34D399', fontWeight: 700 }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="producao" 
                    name="Atividades"
                    stroke="#34D399" 
                    fillOpacity={1} 
                    fill="url(#colorProd)" 
                    strokeWidth={2}
                    activeDot={{ r: 5, fill: '#1C1C1E', stroke: '#34D399', strokeWidth: 2 }}
                    dot={false}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rcc-footer">
              <span className="rcc-footer-label">Total Produzido</span>
              <div className="rcc-footer-stats">
                <div className="rcc-big-number">
                  {chartStats.total}
                  <span className={`rcc-increment ${chartStats.increase >= 0 ? 'positive' : 'negative'}`}>
                    {chartStats.increase >= 0 ? '+' : ''}{chartStats.increase}
                  </span>
                </div>
                <div className={`rcc-percent ${chartStats.increase >= 0 ? 'positive' : 'negative'}`}>
                  <ArrowUpRight size={16} /> {Math.abs(Number(chartStats.percent))}%
                </div>
              </div>
            </div>

            <div className="rcc-activities-list">
              <h4 className="rcc-activities-title">Atividades Realizadas ({filteredExecutions.length})</h4>
              <div className="rcc-activities-scroll">
                {filteredExecutions.length === 0 ? (
                  <p className="rcc-empty-activities">Nenhuma atividade neste período.</p>
                ) : (
                  filteredExecutions.map((exec, idx) => (
                    <div key={exec.id || idx} className="rcc-activity-item">
                      <div className="rcc-activity-info">
                        <span className="rcc-activity-task">{exec.taskTitle}</span>
                        <span className="rcc-activity-date">
                          {new Date(exec.timestamp || exec.data).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="rcc-activity-value" style={{ color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}