import { useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, Users, TrendingUp, AlertTriangle, 
  BarChart3, FileText, X, Download, Calendar,
  CheckCircle2, Clock, User, Plus
} from 'lucide-react';
import { AppContext } from '../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Admin.css';

export default function Admin() {
  const { projects, tasks, users, stats } = useContext(AppContext);
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);

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

  const overallProgress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Concluída').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  const urgentTasks = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length;

  const generatePDF = (title, data, kpis = []) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // --- Header ---
    doc.setFillColor(33, 37, 41); // Dark Color
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GALIZA', 15, 17);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Gesto de Projetos Profissional', 55, 16);
    
    doc.setFontSize(9);
    doc.text(`Data: ${new Date().toLocaleString()}`, pageWidth - 15, 16, { align: 'right' });
    
    // --- Report Title ---
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 15, 40);
    
    // --- KPI Section ---
    if (kpis.length > 0) {
      let xPos = 15;
      const kpiWidth = (pageWidth - 45) / 4;
      
      kpis.forEach(kpi => {
        // Draw Card
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(xPos, 48, kpiWidth, 25, 3, 3, 'F');
        doc.setDrawColor(222, 226, 230);
        doc.roundedRect(xPos, 48, kpiWidth, 25, 3, 3, 'S');
        
        // Content
        doc.setTextColor(108, 117, 125);
        doc.setFontSize(8);
        doc.text(kpi.label.toUpperCase(), xPos + 5, 55);
        
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi.value), xPos + 5, 65);
        
        xPos += kpiWidth + 5;
      });
    }

    // --- Data Table ---
    const tableStartY = kpis.length > 0 ? 85 : 50;
    
    autoTable(doc, {
      startY: tableStartY,
      head: [Object.keys(data[0])],
      body: data.map(obj => Object.values(obj)),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { 
        fillColor: [52, 152, 219], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 }
    });
    
    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Pgina ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('Relatrio Gerado pelo Sistema Galiza', 15, doc.internal.pageSize.height - 10);
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

  const generateReport = (type) => {
    switch(type) {
      case 'Geral':
        generatePDF('Relatório de Status Geral', 
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
        generatePDF('Relatório de Progresso de Projetos', projData, [
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
        generatePDF('Relatório de Gestão de Equipe', collabData, [
          { label: 'Total Equipe', value: users.length },
          { label: 'Melhor Desempenho', value: tasksByCollaborator.length > 0 ? `${Math.max(...tasksByCollaborator.map(c => c.progress))}%` : '0%' }
        ]);
        break;
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
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <FolderKanban size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{projects.length}</span>
            <span className="stat-label">Projetos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper admin" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Colaboradores</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{overallProgress}%</span>
            <span className="stat-label">Conclusão Geral</span>
          </div>
        </div>

        <div className="stat-card">
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
                <div key={collab.id} className="performance-item">
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
              <div key={proj.id} className={`project-item ${proj.isLate ? 'late' : ''}`}>
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
    </div>
  );
}