import { useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, Users, TrendingUp, AlertTriangle, 
  BarChart3, FileText, X, Download, Calendar,
  CheckCircle2, Clock, User, Plus, Settings, ArrowUpRight
} from 'lucide-react';
import { AppContext } from '../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Admin.css';

export default function Admin() {
  const { projects, tasks, users, stats } = useContext(AppContext);
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string, filename: string, doc: any } | null>(null);
  const [chartContext, setChartContext] = useState<{ type: 'collab' | 'project', id: string, name: string } | null>(null);
  const [activeStatModal, setActiveStatModal] = useState<'projects' | 'users' | 'progress' | 'urgent' | null>(null);
  const [timeRange, setTimeRange] = useState<'3 Dias' | 'Semana' | '15 Dias' | 'Mês' | 'Trimestre' | 'Semestre' | 'Ano'>('Semana');

  const allAssignees = useMemo(() => {
    return users.map(u => ({ id: u.id, name: u.name, type: 'user' }));
  }, [users]);

  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.assignee && !t.assigneeId && t.status !== 'Concluída').slice(0, 10);
  }, [tasks]);

  const tasksByCollaborator = useMemo(() => {
    return allAssignees.map(assignee => {
      const collabTasks = tasks.filter(t => t.assignee === assignee.name || t.assigneeId === assignee.id);
      const completed = collabTasks.filter(t => t.status === 'Concluída').length;
      const inProgress = collabTasks.filter(t => t.status === 'Em andamento').length;
      const todo = collabTasks.filter(t => t.status === 'Pendente' || t.status === 'A fazer').length;
      const progress = collabTasks.length > 0 ? Math.round((completed / collabTasks.length) * 100) : 0;
      
      const allExecutions = collabTasks.flatMap(t => t.executions || []);
      const collabExecutions = allExecutions.filter(e => String(e.colaboradorId) === String(assignee.id));
      const totalProduced = collabExecutions.reduce((sum, e) => sum + (Number(e.quantidade) || 0), 0);
      const lastExecution = collabExecutions.length > 0 
        ? collabExecutions.sort((a, b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime())[0]
        : null;
      
      return { 
        ...assignee, 
        total: collabTasks.length, 
        completed, 
        inProgress, 
        todo, 
        progress,
        totalProduced,
        executionsCount: collabExecutions.length,
        lastActivity: lastExecution ? (lastExecution.timestamp || lastExecution.data) : null
      };
    });
  }, [allAssignees, tasks]);

  const projectStatus = useMemo(() => {
    const now = new Date();
    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const completed = projTasks.filter(t => t.status === 'Concluída').length;
      const total = projTasks.length;
      
      let daysLeft = null;
      let isLate = false;
      
      if (proj.endDate) {
        const parts = proj.endDate.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[2]) + (parts[2].length === 2 ? 2000 : 0);
          const endDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
          const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) isLate = true;
          daysLeft = Math.abs(diff);
        }
      }
      
      return { ...proj, completed, total, daysLeft, isLate };
    }).sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }, [projects, tasks]);

  const targetTasks = useMemo(() => {
    if (!chartContext) return [];
    if (chartContext.type === 'collab') {
      return tasks.filter(t => t.assignee === chartContext.name || t.assigneeId === chartContext.id);
    } else {
      return tasks.filter(t => t.projectId === chartContext.id);
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
       return executions.filter(e => String(e.colaboradorId) === String(chartContext.id));
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
      
      data.push({
        date: label,
        producao: sum
      });
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

  const overallProgress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Concluída').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  const urgentTasks = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length;

  const generatePDF = (title, data, kpis = []) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // --- Luxury Header ---
    doc.setFillColor(10, 12, 16); // Deep dark background
    doc.rect(0, 0, pageWidth, 28, 'F');
    // Accent line below it
    doc.setFillColor(255, 97, 48); // Orange Accent
    doc.rect(0, 28, pageWidth, 1.5, 'F');
    
    // Title / Brand
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('G A L I Z A', 15, 19);
    
    // Also fixing standard accents like "Gestão", "Página", "Relatório" that had typos
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('GESTÃO DE PROJETOS', 64, 18);
    
    doc.setTextColor(255, 255, 255);
    doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 15, 18, { align: 'right' });
    
    // --- Report Subtitle ---
    doc.setTextColor(10, 12, 16);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 15, 42);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 45, pageWidth - 15, 45);
    
    // --- KPI Section ---
    let tableStartY = 55;
    if (kpis.length > 0) {
      let xPos = 15;
      const kpiWidth = (pageWidth - 45) / 4;
      
      kpis.forEach(kpi => {
        // Subtle Card
        doc.setFillColor(250, 251, 252);
        doc.roundedRect(xPos, 52, kpiWidth, 22, 2, 2, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(xPos, 52, kpiWidth, 22, 2, 2, 'S');
        
        // Content
        doc.setTextColor(100, 110, 120);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.label.toUpperCase(), xPos + 4, 59);
        
        doc.setTextColor(255, 97, 48); // Accent Orange
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi.value), xPos + 4, 69);
        
        xPos += kpiWidth + 5;
      });
      tableStartY = 85;
    }

    // --- Data Table ---
    autoTable(doc, {
      startY: tableStartY,
      head: [Object.keys(data[0])],
      body: data.map(obj => Object.values(obj)),
      styles: { 
        fontSize: 9, 
        cellPadding: 4, 
        font: 'helvetica',
        lineColor: [230, 230, 230],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [10, 12, 16], // Dark Luxury Header
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: { textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      margin: { left: 15, right: 15 }
    });
    
    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('Relatório Gerado Automáticamente - Galiza', 15, doc.internal.pageSize.height - 10);
    }

    const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
    return { doc, filename };
  };

  const generateReport = (type) => {
    let result = null;
    switch(type) {
      case 'Geral':
        result = generatePDF('Relatório de Status Geral', 
          [
            { Indicador: 'Total de Projetos ativos no sistema', Valor: stats.totalProjects },
            { Indicador: 'Usuários cadastrados na plataforma', Valor: users.length },
            { Indicador: 'Tarefas concluídas com sucesso', Valor: stats.completedTasks },
            { Indicador: 'Tarefas pendentes de execução', Valor: stats.pendingTasks },
            { Indicador: 'Percentual de conclusão global', Valor: `${overallProgress}%` }
          ],
          [
            { label: 'Projetos', value: stats.totalProjects },
            { label: 'Usuários', value: users.length },
            { label: 'Conc.', value: `${overallProgress}%` },
            { label: 'Urgentes', value: urgentTasks }
          ]
        );
        break;
      case 'Projetos':
        const projData = projectStatus.map(p => ({
          'Projeto': p.name,
          'Progresso': `${p.progress || 0}%`,
          'Status': p.progress === 100 ? 'Concluído' : p.isLate ? 'Atrasado' : 'Ativo',
          'Tarefas': `${p.completed}/${p.total}`,
          'Prazo Restante': p.daysLeft !== null ? `${p.daysLeft} dias` : '-'
        }));
        result = generatePDF('Relatório de Progresso de Projetos', projData, [
          { label: 'Total Projetos', value: projects.length },
          { label: 'Concluídos', value: projects.filter(p => p.progress === 100).length },
          { label: 'Atrasados', value: projectStatus.filter(p => p.isLate).length }
        ]);
        break;
      case 'Colaboradores':
        const collabData = tasksByCollaborator.map(c => ({
          'Colaborador': c.name,
          'Total Tarefas': c.total,
          'Concluídas': c.completed,
          'Pendentes': c.todo + c.inProgress,
          'Desempenho': `${c.progress}%`
        }));
        result = generatePDF('Relatório de Gestão de Equipe', collabData, [
          { label: 'Total Equipe', value: users.length },
          { label: 'Melhor Desempenho', value: tasksByCollaborator.length > 0 ? `${Math.max(...tasksByCollaborator.map(c => c.progress))}%` : '0%' }
        ]);
        break;
    }
    
    if (result) {
      const url = result.doc.output('bloburl');
      setPdfPreview({ url, filename: result.filename, doc: result.doc });
    }
    setShowReportModal(false);
  };

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Painel Administrativo</h1>
          <p className="dashboard-subtitle">Visão geral e relatórios do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="dashboard-date">
            <Calendar size={16} />
            <span>{new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
          <button className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowReportModal(true)}>
            <FileText size={18} />
            <span>Gerar Relatório</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('projects')}>
          <div className="stat-icon-wrapper">
            <FolderKanban size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{projects.length}</span>
            <span className="stat-label">Projetos</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('users')}>
          <div className="stat-icon-wrapper admin" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Colaboradores</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('progress')}>
          <div className="stat-icon-wrapper success" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{overallProgress}%</span>
            <span className="stat-label">Conclusão Geral</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('urgent')}>
          <div className="stat-icon-wrapper urgent">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{urgentTasks}</span>
            <span className="stat-label">Urgentes</span>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card performance-card">
          <div className="card-header">
            <BarChart3 size={20} />
            <h3>Desempenho por Colaborador</h3>
          </div>
          <div className="performance-list">
            {tasksByCollaborator.length === 0 ? (
              <p className="empty-text">Nenhum colaborador cadastrado</p>
            ) : (
              tasksByCollaborator.map(collab => (
                <div key={collab.id} className="performance-item clickable" onClick={() => setChartContext({ type: 'collab', id: collab.id, name: collab.name })}>
                  <div className="collab-info">
                    <div className="collab-avatar">{collab.name?.charAt(0) || 'U'}</div>
                    <div className="collab-details">
                      <span className="collab-name">{collab.name}</span>
                      <span className="collab-stats">
                        {collab.inProgress} em progresso • {collab.todo} a fazer • {collab.executionsCount || 0} execuções
                      </span>
                      {collab.lastActivity && (
                        <span className="collab-kpi">
                          Última atividade: {new Date(collab.lastActivity).toLocaleDateString('pt-BR')} • Produzido: {collab.totalProduced || 0}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="collab-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${collab.progress}%` }} />
                    </div>
                    <span className="progress-text">{collab.progress}%</span>
                    <TrendingUp size={16} className="item-chart-icon" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-card tasks-by-collab-card">
          <div className="card-header">
            <Users size={20} />
            <h3>Tarefas por Colaborador</h3>
          </div>
          <div className="bar-chart">
            {tasksByCollaborator.map(collab => (
              <div key={collab.id} className="bar-item">
                <span className="bar-label">{collab.name?.split(' ')[0] || 'User'}</span>
                <div className="bar-wrapper">
                  <div className="bar-completed" style={{ width: `${(collab.completed / (collab.total || 1)) * 100}%` }} />
                  <div className="bar-pending" style={{ width: `${((collab.inProgress + collab.todo) / (collab.total || 1)) * 100}%` }} />
                </div>
                <span className="bar-value">{collab.total}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot completed"></span> Concluídas</span>
            <span className="legend-item"><span className="legend-dot pending"></span> Pendentes</span>
          </div>
          <div className="kpi-row">
            {tasksByCollaborator.slice(0, 3).map(collab => (
              <div key={collab.id} className="mini-kpi-card">
                <span className="mini-kpi-label">{collab.name?.split(' ')[0] || 'User'}</span>
                <span className="mini-kpi-value">{collab.executionsCount || 0} exec</span>
                <span className="mini-kpi-sub">{collab.totalProduced || 0} total</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card projects-status-card">
          <div className="card-header">
            <FolderKanban size={20} />
            <h3>Status dos Projetos</h3>
          </div>
          <div className="projects-list">
            {projectStatus.map(proj => (
              <div key={proj.id} className={`project-item clickable-card ${proj.isLate ? 'late' : ''}`} onClick={() => setChartContext({ type: 'project', id: proj.id, name: proj.name })}>
                <div className="project-info">
                  <span className="project-name">{proj.name}</span>
                  <span className="project-meta">
                    {proj.completed}/{proj.total} tarefas
                    {proj.daysLeft !== null && ` • ${proj.daysLeft}d restantes`}
                  </span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar small">
                    <div className="progress-fill" style={{ 
                      width: `${proj.progress || 0}%`,
                      backgroundColor: proj.progress === 100 ? 'var(--success)' : proj.isLate ? 'var(--danger)' : 'var(--accent)'
                    }} />
                  </div>
                  <span className={`status-badge ${proj.progress === 100 ? 'completed' : proj.isLate ? 'late' : 'active'}`}>
                    {proj.progress === 100 ? 'Concluído' : proj.isLate ? 'Atrasado' : `${proj.progress || 0}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card unassigned-card">
          <div className="card-header">
            <User size={20} />
            <h3>Tarefas Sem Responsável</h3>
            <span className="badge-count">{unassignedTasks.length}</span>
          </div>
          <div className="unassigned-list">
            {unassignedTasks.length === 0 ? (
              <p className="empty-text">Todas as tarefas estão atribuídas</p>
            ) : (
              unassignedTasks.map(task => (
                <div key={task.id} className="unassigned-item">
                  <div className="task-info">
                    <span className="task-title">{task.title}</span>
                    <span className="task-project">{projects.find(p => p.id === task.projectId)?.name}</span>
                  </div>
                  <span className="priority-badge">{task.priority || 'Média'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showReportModal && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReportModal(false)}>
          <div className="modal-content report-modal">
            <div className="modal-header">
              <h3>Gerar Relatório</h3>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="report-options">
                <button className="report-option" onClick={() => generateReport('Geral')}>
                  <FileText size={24} />
                  <div className="option-content">
                    <span className="option-title">Relatório Geral</span>
                    <span className="option-desc">Resumo completo do sistema</span>
                  </div>
                  <Download size={18} />
                </button>
                <button className="report-option" onClick={() => generateReport('Projetos')}>
                  <FolderKanban size={24} />
                  <div className="option-content">
                    <span className="option-title">Relatório de Projetos</span>
                    <span className="option-desc">Progresso e prazos</span>
                  </div>
                  <Download size={18} />
                </button>
                <button className="report-option" onClick={() => generateReport('Colaboradores')}>
                  <Users size={24} />
                  <div className="option-content">
                    <span className="option-title">Relatório de Colaboradores</span>
                    <span className="option-desc">Desempenho individual</span>
                  </div>
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {pdfPreview && createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '90%', height: '90vh', maxWidth: 'none', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText style={{ color: 'var(--accent)' }} size={24} />
                <h3 style={{ margin: 0, color: 'white', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Pré-visualização do Relatório</h3>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn-primary" onClick={() => pdfPreview.doc.save(pdfPreview.filename)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 16px', borderRadius: 'var(--radius)' }}>
                  <Download size={18} />
                  <span>Baixar PDF</span>
                </button>
                <button className="icon-btn" onClick={() => setPdfPreview(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, background: '#323639' }}>
              <iframe 
                src={pdfPreview.url} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title="Pré-visualização de Documento"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

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

      {activeStatModal && createPortal(
        <div className="chart-modal-overlay animate-fadeIn" onClick={() => setActiveStatModal(null)}>
          <div className="chart-modal-content stat-list-modal" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <div>
                <h2>
                  {activeStatModal === 'projects' ? 'Projetos Ativos' : 
                   activeStatModal === 'users' ? 'Equipe de Colaboradores' : 
                   activeStatModal === 'progress' ? 'Últimas Atividades Globais' : 'Tarefas Urgentes'}
                </h2>
                <p>Detalhamento dos indicadores</p>
              </div>
              <button className="close-modal-btn" onClick={() => setActiveStatModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="stat-modal-body rcc-activities-scroll" style={{ maxHeight: '400px' }}>
              {activeStatModal === 'projects' && (
                projectStatus.map(p => (
                  <div key={p.id} className="rcc-activity-item" onClick={() => { setActiveStatModal(null); setChartContext({ type: 'project', id: p.id, name: p.name }); }} style={{ cursor: 'pointer' }}>
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{p.name}</span>
                      <span className="rcc-activity-date">{p.completed}/{p.total} tarefas concluídas</span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: p.progress === 100 ? 'var(--success)' : p.isLate ? 'var(--danger)' : 'var(--accent)' }}>
                      {p.progress}%
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'users' && (
                tasksByCollaborator.map(c => (
                  <div key={c.id} className="rcc-activity-item" onClick={() => { setActiveStatModal(null); setChartContext({ type: 'collab', id: c.id, name: c.name }); }} style={{ cursor: 'pointer' }}>
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{c.name}</span>
                      <span className="rcc-activity-date">{c.totalProduced || 0} atividades produzidas</span>
                    </div>
                    <div className="rcc-activity-value">
                      {c.progress}%
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'progress' && (
                tasks.flatMap(t => (t.executions || []).map(e => ({...e, taskTitle: t.title, collabName: users.find(u => String(u.id) === String(e.colaboradorId))?.name})))
                     .sort((a,b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime())
                     .slice(0, 50)
                     .map((exec, idx) => (
                  <div key={idx} className="rcc-activity-item">
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{exec.taskTitle}</span>
                      <span className="rcc-activity-date">
                        {exec.collabName} • {new Date(exec.timestamp || exec.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'urgent' && (
                tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').map(t => (
                  <div key={t.id} className="rcc-activity-item">
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{t.title}</span>
                      <span className="rcc-activity-date">{projects.find(p => p.id === t.projectId)?.name} • Resp: {t.assignee || 'Sem responsável'}</span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: 'var(--danger)' }}>
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'urgent' && tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length === 0 && (
                 <p className="rcc-empty-activities">Não há tarefas urgentes no momento.</p>
              )}
              {activeStatModal === 'progress' && tasks.flatMap(t => t.executions || []).length === 0 && (
                 <p className="rcc-empty-activities">Nenhuma atividade registrada.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}