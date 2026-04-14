import { useMemo, useContext } from 'react';
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
} from 'lucide-react';
import { AppContext } from '../App';
import './Dashboard.css';

export default function Dashboard() {
  const { projects, tasks, users, stats, userStats, userTasks, isAdmin } = useContext(AppContext);
  const navigate = useNavigate();
  
  const displayTasks = isAdmin ? tasks : userTasks;
  const displayStats = isAdmin ? stats : userStats;

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

        <div className="stat-card stat-urgent">
          <div className="stat-icon-wrapper urgent">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{displayStats.urgentTasks}</span>
            <span className="stat-label">Tarefas Urgentes</span>
          </div>
          <div className="stat-trend negative">
            <ArrowDownRight size={14} />
            <span>{dashboardStats.lateProjects} projetos atrasados</span>
          </div>
        </div>

        <div className="stat-card stat-team">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Colaboradores</span>
          </div>
        </div>

        <div className="stat-card stat-ontime">
          <div className="stat-icon-wrapper success">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboardStats.projectsOnTime}</span>
            <span className="stat-label">Projetos no Prazo</span>
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

        {/* ===== Urgent Tasks ===== */}
        <div className="dashboard-card urgent-tasks-card">
          <div className="card-header">
            <div className="card-title">
              <Zap size={18} />
              <h3>Tarefas Urgentes</h3>
            </div>
            <button className="card-action" onClick={() => navigate('/tarefas')}>
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="urgent-tasks-list">
            {urgentTasks.length === 0 ? (
              <div className="empty-tasks">
                <CheckCircle2 size={32} />
                <p>Nenhuma tarefa urgente</p>
              </div>
            ) : (
              urgentTasks.map((task, i) => (
                <div key={task.id} className="urgent-task-item">
                  <div className={`priority-indicator ${task.priority?.toLowerCase()}`}>
                    {getPriorityIcon(task.priority)}
                  </div>
                  <div className="task-info">
                    <span className="task-name">{task.title}</span>
                    <span className="task-project">
                      {projects.find(p => p.id === task.projectId)?.name || 'Projeto'}
                    </span>
                  </div>
                  {task.daysLate > 0 && (
                    <span className="task-late">{task.daysLate}d atraso</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

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
    </div>
  );
}