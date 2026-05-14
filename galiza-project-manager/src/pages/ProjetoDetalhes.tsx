import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AuthContext';
import { ArrowLeft, Edit2, Trash2, TrendingUp, CheckCircle2, Clock, Target, Plus, X, History, AlertCircle, Link2, Image as ImageIcon, ExternalLink, User as UserIcon, Layout, BarChart3 } from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import './ProjetoDetalhes.css';



export default function ProjetoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, tasks, users, addTask, updateTask, deleteTask, updateProject, getHistory, getAllAssignees, addKpiCollection, kpis = [] } = useContext(AppContext);
  
  // States
  const [executionModalTask, setExecutionModalTask] = useState<any>(null);
  const [historyModalTask, setHistoryModalTask] = useState<any>(null);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [disintegratingTaskId, setDisintegratingTaskId] = useState<number | null>(null);
  
  // Project Edit Modal state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
     name: '', description: '', difficulty: 'Médio', startDate: '', endDate: ''
  });
  const [executionForm, setExecutionForm] = useState<any>({
    colaboradorId: '',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    observacao: '',
    kpiValues: {}
  });

  const [openTabs, setOpenTabs] = useState<string[]>(['Atividade']);
  const [activeTab, setActiveTab] = useState('Atividade');

  const openHistoryModal = async (task: any) => {
    setHistoryModalTask(task);
    const changes = await getHistory('task', task.id);
    setTaskHistory(changes || []);
  };

  const openExecutionModal = (task: any) => {
    setExecutionModalTask(task);
    setExecutionForm({
      colaboradorId: task.assigneeId || '',
      data: new Date().toISOString().split('T')[0],
      quantidade: '',
      observacao: '',
      kpiValues: {}
    });
  };

  // Links/Attachments State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '', type: 'link' });

  // Default task form state
  const emptyTask = {
    title: '',
    description: '',
    priority: 'Média',
    status: 'A Fazer',
    color: 'var(--success)', // Green by default
    measurementType: 'UN',
    measurementTarget: 1,
    measurementCurrent: 0,
    dueDate: '',
    assigneeId: '',
    kpiEnabled: false,
    kpiCode: '',
    kpiCategory: '',
    kpiParams: [],
    executions: []
  };

  const [taskForm, setTaskForm] = useState(emptyTask);

  const project = projects.find(p => String(p.id) === String(id));
  const projectTasks = tasks.filter(t => String(t.projectId) === String(id));

  // If no project is found, return error
  if (!project) {
    return (
      <div className="page-container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2>Projeto não encontrado.</h2>
        <button className="btn-primary" onClick={() => navigate('/projetos')} style={{ width: 'fit-content' }}>Voltar</button>
      </div>
    );
  }

  // Calculated Stats
  const completedTasks = projectTasks.filter(t => t.status === 'Concluída').length;
  const totalTasks = projectTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks/totalTasks) * 100) : 0;
  
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  
  // Date math
  let daysLeftStr = '--';
  if (project.endDate) {
    let endD = new Date(project.endDate);
    if (isNaN(endD.getTime()) && project.endDate.includes('/')) {
       const [d, m, y] = project.endDate.split('/');
       endD = new Date(`${y.length === 2 ? '20' + y : y}-${m}-${d}`);
    }
    if (!isNaN(endD.getTime())) {
      const diff = endD.getTime() - todayDate.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      daysLeftStr = days >= 0 ? `${days} dias` : 'Atrasado';
    }
  }

  const getAssigneeName = (id: any) => {
    if(!id) return 'Não atribuído';
    const user = users.find(u => String(u.id) === String(id));
    if (!user) return 'Não atribuído';
    return user.matricula ? `${user.name} (${user.matricula})` : user.name;
  };

  const delayedTasks = projectTasks.filter(t => {
     if(!t.dueDate || t.status === 'Concluída') return false;
     let dueD = new Date(t.dueDate);
     if (isNaN(dueD.getTime()) && t.dueDate.includes('/')) {
       const [d, m, y] = t.dueDate.split('/');
       dueD = new Date(`${y.length === 2 ? '20' + y : y}-${m}-${d}`);
     }
     dueD.setHours(0,0,0,0);
     return dueD < todayDate;
  }).length;

  const handleSaveExecution = async () => {
    if (!executionModalTask) return;
    const qty = Number(executionForm.quantidade);
    if (!qty || qty <= 0) return;
    
    // Get geolocation if possible
    let location = null;
    try {
      if ("geolocation" in navigator) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      }
    } catch (err) {
      console.warn("Could not get location:", err);
    }

    const currentTask = tasks.find(t => t.id === executionModalTask.id);
    if(!currentTask) return;

    const newCurrent = (currentTask.measurementCurrent || 0) + qty;
    const updatedExecutions = [...(currentTask.executions || []), {
       id: Date.now(),
       colaboradorId: executionForm.colaboradorId,
       quantidade: qty,
       data: executionForm.data,
       observacao: executionForm.observacao,
       kpiValues: executionForm.kpiValues,
       location: location,
       timestamp: new Date().toISOString()
    }];

    await updateTask(currentTask.id, {
       measurementCurrent: newCurrent,
       executions: updatedExecutions,
       status: newCurrent >= (currentTask.measurementTarget || 1) ? 'Concluída' : 'A Fazer'
    });

    if (currentTask.kpiEnabled && currentTask.kpiCode) {
      await addKpiCollection({
        taskId: currentTask.id,
        kpiCode: currentTask.kpiCode,
        kpiCategory: currentTask.kpiCategory,
        quantidade: qty,
        dataColeta: executionForm.data,
        parametros: currentTask.kpiParams || [],
        valores: executionForm.kpiValues || {},
        collaboratorId: executionForm.colaboradorId,
        observacao: executionForm.observacao
      });
    }

    setExecutionModalTask(null);
    setExecutionForm({ colaboradorId: '', quantidade: '', data: new Date().toISOString().split('T')[0], observacao: '', kpiValues: {} });
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) {
      return;
    }
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskForm);
      } else {
        await addTask({ ...taskForm, projectId: project.id });
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Erro ao salvar atividade:', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    setDisintegratingTaskId(id);
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      await deleteTask(id);
    } catch (error: any) {
      console.error('Erro ao excluir tarefa:', error);
    } finally {
      setDisintegratingTaskId(null);
    }
  };

  const openEditTask = (task: any) => {
    setTaskForm({ ...task });
    setEditingTask(task);
    setIsTaskModalOpen(true);
    if (task.kpiCode || task.kpiEnabled || (task.kpiParams && task.kpiParams.length > 0)) {
      setOpenTabs(['Atividade', 'KPI']);
      setActiveTab('Atividade');
    } else {
      setOpenTabs(['Atividade']);
      setActiveTab('Atividade');
    }
  };

  const openProjectEdit = () => {
     if(!project) return;
     setProjectForm({
        name: project.name || '',
        description: project.description || '',
        difficulty: project.difficulty || 'Médio',
        startDate: project.startDate || '',
        endDate: project.endDate || ''
     });
     setIsEditProjectOpen(true);
  };

  const saveProjectEdit = async () => {
     if(!projectForm.name) {
       return;
     }
     try {
       await updateProject(project.id, projectForm);
       setIsEditProjectOpen(false);
     } catch (error: any) {
       console.error('Erro ao atualizar projeto:', error);
     }
  };

  const handleAddLink = async () => {
if(!linkForm.url || !linkForm.title) {
        return;
      }
      try {
        const newLink = { ...linkForm, id: Date.now() };
        const updatedLinks = [...(project.links || []), newLink];
        await updateProject(project.id, { links: updatedLinks });
        setLinkForm({ title: '', url: '', type: 'link' });
        setIsLinkModalOpen(false);
      } catch (error: any) {
        console.error('Erro ao adicionar link:', error);
      }
   };
   
   const handleRemoveLink = async (linkId: number) => {
      try {
        const updatedLinks = (project.links || []).filter((l:any) => l.id !== linkId);
        await updateProject(project.id, { links: updatedLinks });
      } catch (error: any) {
        console.error('Erro ao remover link:', error);
      }
   };

  const openCreateTask = () => {
    setTaskForm(emptyTask);
    setIsTaskModalOpen(true);
    setOpenTabs(['Atividade']);
    setActiveTab('Atividade');
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="projeto-detalhes-container">
        
        {/* Header */}
        <div className="pd-header">
          <div className="pd-title-area">
            <button className="pd-back-btn" onClick={() => navigate('/projetos')}>
              <ArrowLeft size={24} />
            </button>
            <h2>{project.name}</h2>
          </div>
          <div className="pd-header-actions">
            <button className="btn-ghost" onClick={openProjectEdit}><Edit2 size={16}/> Editar Projeto</button>
            <button className="btn-ghost btn-ghost-danger"><Trash2 size={16}/> Excluir Projeto</button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="pd-stats-row">
          <div className="pd-stat-card">
            <div className="stat-info">
              <span className="stat-label">Progresso Total</span>
              <span className="stat-value">{progress}%</span>
            </div>
            <div className="stat-icon trend"><TrendingUp size={20} /></div>
          </div>
          <div className="pd-stat-card">
            <div className="stat-info">
              <span className="stat-label">Tarefas Concluídas</span>
              <span className="stat-value">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="stat-icon check"><CheckCircle2 size={20} /></div>
          </div>
        </div>

        

        {/* Links & Attachments Row */}
        <div className="pd-attachments-row" style={{ marginTop: '1.5rem' }}>
           <div className="pd-info-card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '15px' }}><Link2 size={18} className="text-secondary" /> Anexos e Links</h4>
                 <button className="btn-ghost" onClick={() => setIsLinkModalOpen(true)}><Plus size={16}/> Adicionar Mídia/Link</button>
              </div>
              
              {!(project.links && project.links.length > 0) ? (
                 <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '1.5rem 0', textAlign: 'center', background: 'rgba(15, 20, 30, 0.40)', borderRadius: 'var(--radius-md)' }}>
                   Nenhum documento, foto ou link externo atrelado a este projeto.
                 </div>
              ) : (
                 <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                   {project.links.map((link: any) => (
                      <div key={link.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', background: 'rgba(15, 20, 30, 0.50)', width: '220px', position: 'relative' }}>
                         <button style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveLink(link.id)}>
                            <Trash2 size={14}/>
                         </button>
                         <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                           {link.type === 'image' ? <ImageIcon size={16} className="text-accent"/> : <Link2 size={16} className="text-primary" />}
                           <strong style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '20px' }}>{link.title || 'Anexo'}</strong>
                         </div>
                         <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', wordBreak: 'break-all' }}>
                           Acessar Arquivo <ExternalLink size={12}/>
                         </a>
                      </div>
                   ))}
                 </div>
              )}
           </div>
        </div>

        {/* Tasks View (CORE KANBAN) */}
        <div className="pd-tasks-section">
          <div className="pd-tasks-header">
            <h3 className="pd-tasks-title">Controle de Execução (Tarefas)</h3>
            <button className="btn-primary" onClick={openCreateTask}>
              <Plus size={16} /> Nova Tarefa
            </button>
          </div>

          <div className="pd-tasks-board" style={{ marginTop: '1rem' }}>
            {/* Column: A Fazer */}
            <div className="task-column">
              <div className="task-col-header">
                <div className="col-title"><div className="col-dot todo" /> A Fazer / Em Andamento</div>
                <div className="col-count">{projectTasks.filter(t => t.status === 'A Fazer').length}</div>
              </div>
              
              {projectTasks.filter(t => t.status === 'A Fazer').length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '3rem 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  Nenhuma atividade pendente.
                </div>
              )}

              {projectTasks.filter(t => t.status === 'A Fazer').map(task => {
                let isDelayed = false;
                let daysDelayed = 0;
                if (task.dueDate) {
                  let dueD = new Date(task.dueDate);
                  if (isNaN(dueD.getTime()) && task.dueDate.includes('/')) {
                    const [d, m, y] = task.dueDate.split('/');
                    dueD = new Date(`${y.length === 2 ? '20' + y : y}-${m}-${d}`);
                  }
                  dueD.setHours(0,0,0,0);
                  const diffTime = todayDate.getTime() - dueD.getTime();
                  daysDelayed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  if (daysDelayed > 0) isDelayed = true;
                }

                const taskPct = (task.measurementTarget || 1) > 0
                  ? Math.min(((task.measurementCurrent || 0) / (task.measurementTarget || 1)) * 100, 100)
                  : 0;

                return (
                <div className="rich-task-card rtc-status-afazer" key={task.id}>
                  {/* Tier 1: Header */}
                  <div className="rich-task-header">
                    <span className="rtc-title">{task.title || task.name}</span>
                    <span className="rtc-tag">{task.status}</span>
                  </div>

                  {/* Tier 2: Info & Assignees + Alerts */}
                  <div className="rtc-desc">
                      <div className="rtc-info-row">
                        <div className="rtc-color-dot" style={{ backgroundColor: task.color }} />
                        <span className="rtc-priority-label">{task.priority || 'Média'}</span>
                      </div>
                      <p className="rtc-description-text">{task.description || 'Sem descrição.'}</p>
                      
                      <div className="rtc-info-row" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        <div className="rtc-badge-item">
                          <div className="rtc-user-avatar">{getAssigneeName(task.assigneeId).charAt(0).toUpperCase()}</div>
                          <span className="rtc-user-name">{getAssigneeName(task.assigneeId)}</span>
                        </div>
                        
                        {isDelayed && (
                          <div className="rtc-badge-item danger">
                            <AlertCircle size={14}/> ATRASADA {daysDelayed}D
                          </div>
                        )}

                        {task.dueDate && (
                          <div className="rtc-badge-item warning">
                            <Clock size={14}/> PRAZO: {task.dueDate}
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Tier 3: Progress */}
                  <div className="rtc-progress-area">
                    <CircularProgress current={task.measurementCurrent || 0} total={task.measurementTarget || 1} size={72} />
                    <div className="rtc-progress-info">
                      <span className="rtc-progress-text">{task.measurementCurrent || 0} {task.measurementType} de {task.measurementTarget || 1} {task.measurementType}</span>
                      <div className="rtc-progress-bar-container">
                        <div className="rtc-progress-bar-fill" style={{ width: `${taskPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Tier 4: Spacing Slot */}
                  <div className="rtc-alert-slot" style={{ minHeight: '8px' }}>
                  </div>

                  {/* Tier 5: Actions */}
                  <div className="rtc-actions">
                    <button 
                      className="btn-registrar" 
                      onClick={() => openExecutionModal(task)}
                      disabled={!task.assigneeId}
                      style={!task.assigneeId ? { background: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', color: 'var(--text-tertiary)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' } : {}}
                    >
                       {task.assigneeId ? 'Lançar Atividade' : 'Sem Responsável'}
                    </button>
                    <button className="rtc-icon-btn" onClick={() => openHistoryModal(task)}><History size={16}/></button>
                    <button className="rtc-icon-btn" onClick={() => openEditTask(task)}><Edit2 size={16}/></button>
                    <button 
                      className={`rtc-icon-btn danger ${disintegratingTaskId === task.id ? 'btn-disintegrate' : ''}`} 
                      onClick={() => handleDeleteTask(task.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              )})}
            </div>

            {/* Column: Concluído */}
            <div className="task-column">
              <div className="task-col-header">
                <div className="col-title"><div className="col-dot done" /> Concluído</div>
                <div className="col-count">{projectTasks.filter(t => t.status === 'Concluída').length}</div>
              </div>
              
              {projectTasks.filter(t => t.status === 'Concluída').length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '3rem 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  Ainda não há entregas finalizadas.
                </div>
              )}

              {projectTasks.filter(t => t.status === 'Concluída').map(task => {
                const donePct = (task.measurementTarget || 1) > 0
                  ? Math.min(((task.measurementCurrent || task.measurementTarget || 1) / (task.measurementTarget || 1)) * 100, 100)
                  : 100;

                return (
                <div className="rich-task-card rtc-status-concluida" key={task.id}>
                  <div className="rich-task-header">
                    <span className="rtc-title" style={{ color: 'var(--success)' }}>{task.title || task.name}</span>
                    <span className="rtc-tag" style={{ backgroundColor: 'rgba(52, 211, 153, 0.08)', color: 'var(--success)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>{task.status}</span>
                  </div>
                  <div className="rtc-desc">
                      <div className="rtc-info-row">
                        <div className="rtc-color-dot" style={{ backgroundColor: task.color }} />
                        <span className="rtc-priority-label">{task.priority || 'Média'}</span>
                      </div>
                      <p className="rtc-description-text">{task.description || 'Tarefa concluída.'}</p>
                  </div>

                  <div className="rtc-progress-area">
                    <CircularProgress current={task.measurementCurrent || task.measurementTarget || 1} total={task.measurementTarget || 1} color="var(--success)" size={72} />
                    <div className="rtc-progress-info">
                      <span className="rtc-progress-text">{task.measurementCurrent || task.measurementTarget || 1} {task.measurementType} de {task.measurementTarget || 1} {task.measurementType}</span>
                      <div className="rtc-progress-bar-container">
                        <div className="rtc-progress-bar-fill" style={{ width: `${donePct}%`, background: 'linear-gradient(90deg, var(--success), #2DD4BF)', boxShadow: '0 0 8px rgba(52, 211, 153, 0.4)' }} />
                      </div>
                    </div>
                  </div>

                  <div className="rtc-alert-slot">
                    {task.dueDate ? (
                      <div className="rtc-alert" style={{ color: 'var(--success)', background: 'rgba(52, 211, 153, 0.08)' }}>
                        <CheckCircle2 size={14}/> Concluída (Prazo: {task.dueDate})
                      </div>
                    ) : null}
                  </div>

                  <div className="rtc-actions">
                    <button 
                        className="btn-registrar" 
                        style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.4), 0 4px 16px rgba(16, 185, 129, 0.2)' }} 
                        onClick={() => openHistoryModal(task)}
                    >
                       Ver Histórico
                    </button>
                    <button className="rtc-icon-btn" onClick={() => openEditTask(task)}><Edit2 size={16}/></button>
                    <button 
                      className={`rtc-icon-btn danger ${disintegratingTaskId === task.id ? 'btn-disintegrate' : ''}`} 
                      onClick={() => handleDeleteTask(task.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Modal */}
      {executionModalTask && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExecutionModalTask(null); }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Lançar Execução: {executionModalTask.title || executionModalTask.name}</h3>
              <button className="modal-close" onClick={() => setExecutionModalTask(null)}><X size={20}/></button>
            </div>
            <div className="modal-body">
               <div className="form-group">
                 <label>Colaborador *</label>
                 <select value={executionForm.colaboradorId} onChange={e => setExecutionForm({...executionForm, colaboradorId: e.target.value})}>
                   <option value="">Selecione...</option>
                   {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Quantidade ({executionModalTask.measurementType}) *</label>
                   <input type="number" value={executionForm.quantidade} onChange={e => setExecutionForm({...executionForm, quantidade: e.target.value})} />
                 </div>
                 <div className="form-group">
                   <label>Data</label>
                   <input type="date" value={executionForm.data} onChange={e => setExecutionForm({...executionForm, data: e.target.value})} />
                 </div>
               </div>

               {executionModalTask.kpiParams && executionModalTask.kpiParams.length > 0 && (
                 <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                   <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--accent)' }}>Preenchimento de Indicadores (KPI)</h4>
                   {executionModalTask.kpiParams.map((param: string, idx: number) => (
                     <div className="form-group" key={idx}>
                       <label>{param}</label>
                       <input 
                         type="text" 
                         value={executionForm.kpiValues?.[param] || ''} 
                         onChange={e => {
                           setExecutionForm({
                             ...executionForm, 
                             kpiValues: {
                               ...(executionForm.kpiValues || {}),
                               [param]: e.target.value
                             }
                           });
                         }} 
                         placeholder={`Digite o valor para ${param}`}
                       />
                     </div>
                   ))}
                 </div>
               )}
            </div>
            <div className="modal-footer">
               <button className="btn-secondary" onClick={() => setExecutionModalTask(null)}>Cancelar</button>
               <button 
                 className="btn-primary" 
                 onClick={handleSaveExecution}
                 disabled={!executionForm.colaboradorId}
                 style={!executionForm.colaboradorId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
               >
                 Salvar Produção
               </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* History Modal */}
      {historyModalTask && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setHistoryModalTask(null); }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Histórico: {historyModalTask.title || historyModalTask.name}</h3>
              <button className="modal-close" onClick={() => setHistoryModalTask(null)}><X size={20}/></button>
            </div>
            <div className="modal-body">
               {taskHistory.length === 0 ? (
                 <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                   Nenhuma alteração registrada ainda.
                   <br/><small>Alterações de criação, edição e exclusão aparecerão aqui.</small>
                 </p>
               ) : (
                 <ul style={{ listStyle: 'none', padding: 0 }}>
                    {taskHistory.map((h: any, index) => (
                      <li key={index} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: h.action === 'delete' ? 'var(--danger)' : h.action === 'create' ? 'var(--success)' : 'var(--accent)' }}>
                               {h.action === 'create' ? 'Criado' : h.action === 'update' ? 'Atualizado' : h.action === 'delete' ? 'Excluído' : h.action}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                               {h.timestamp ? new Date(h.timestamp).toLocaleString('pt-BR') : ''}
                            </span>
                         </div>
                         {h.action === 'update' && h.newValue && (
                           <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                             {(() => {
                               try {
                                 const oldVal = h.oldValue ? JSON.parse(h.oldValue) : {};
                                 const newVal = JSON.parse(h.newValue);
                                 const changes = Object.keys(newVal).filter(k => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k]));
                                 return changes.map(k => `${k}: ${oldVal[k] || '-'} → ${newVal[k]}`).join(', ');
                               } catch { return ''; }
                             })()}
                           </div>
                         )}
                         <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                           Por: {h.userName || 'Sistema'}
                         </div>
                      </li>
                    ))}
                 </ul>
               )}
            </div>
            <div className="modal-footer">
               <button className="btn-primary" onClick={() => setHistoryModalTask(null)}>Fechar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Project Edit Modal Portal */}
      {isEditProjectOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsEditProjectOpen(false); }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Editar Informações do Projeto</h3>
              <button className="modal-close" onClick={() => setIsEditProjectOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do Projeto *</label>
                <input type="text" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Dificuldade</label>
                <select value={projectForm.difficulty} onChange={e => setProjectForm({...projectForm, difficulty: e.target.value})}>
                  <option>Fácil</option>
                  <option>Médio</option>
                  <option>Difícil</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data de Início</label>
                  <input type="date" value={projectForm.startDate} onChange={e => setProjectForm({...projectForm, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Data de Término</label>
                  <input type="date" value={projectForm.endDate} onChange={e => setProjectForm({...projectForm, endDate: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea rows={3} value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsEditProjectOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveProjectEdit}>Salvar Projeto</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Links Modal Portal */}
      {isLinkModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsLinkModalOpen(false); }}>
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>Adicionar Anexo/Link</h3>
              <button className="modal-close" onClick={() => setIsLinkModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de Anexo</label>
                <select value={linkForm.type} onChange={e => setLinkForm({...linkForm, type: e.target.value})}>
                  <option value="link">Link da Web (Google Drive, Docs, etc)</option>
                  <option value="image">URL de Foto (Imgur, S3, etc)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Título Curto *</label>
                <input type="text" placeholder="Ex: Planta Baixa Setor A" value={linkForm.title} onChange={e => setLinkForm({...linkForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>URL / Caminho *</label>
                <input type="url" placeholder="https://..." value={linkForm.url} onChange={e => setLinkForm({...linkForm, url: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsLinkModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddLink}>Salvar Link</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Create Task Modal Portal */}
      {isTaskModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsTaskModalOpen(false); }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="chrome-tabs-container">
              {openTabs.map(tab => (
                <div 
                  key={tab} 
                  className={`chrome-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <div className="tab-background-svg">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0,100 L0,12 C0,5 5,0 12,0 L88,0 C95,0 100,5 100,12 L100,100 Z" /></svg>
                  </div>
                  <div className="tab-content">
                    {tab === 'Atividade' ? <Layout size={12} /> : <BarChart3 size={12} />}
                    <span>{tab}</span>
                    {tab === 'KPI' && (
                      <X 
                        size={10} 
                        className="close-tab-icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTabs(['Atividade']);
                          setActiveTab('Atividade');
                          setTaskForm({...taskForm, kpiEnabled: false, kpiCode: ''});
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
              {!openTabs.includes('KPI') && (
                <button className="chrome-plus-btn" onClick={() => { setOpenTabs(['Atividade', 'KPI']); setActiveTab('KPI'); }} title="Adicionar KPI"><Plus size={14} /></button>
              )}
              <button className="chrome-close-modal" onClick={() => setIsTaskModalOpen(false)}><X size={18} /></button>
            </div>

            <div className="modal-header" style={{ paddingTop: '0.5rem', borderBottom: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {activeTab === 'KPI' ? 'Configuração de KPI e Dados' : (editingTask ? 'Editar Atividade' : 'Nova Atividade')}
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {activeTab === 'KPI' ? 'Vincule regras de coleta e exija parâmetros na execução.' : 'Defina os detalhes fundamentais da tarefa do projeto.'}
                </p>
              </div>
            </div>

            <div className="modal-body" style={{ minHeight: '340px' }}>
              {activeTab === 'Atividade' ? (
                <div className="animate-fadeIn">
                  <div className="form-group">
                    <label>Título da Atividade *</label>
                    <input type="text" placeholder="Ex: Passagem de cabos" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Responsável</label>
                      <select value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
                        <option value="">Não atribuído</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Prazo</label>
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Meta (Quantidade)</label>
                      <input type="number" value={taskForm.measurementTarget} onChange={e => setTaskForm({...taskForm, measurementTarget: Number(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label>Unidade (Ex: Metros)</label>
                      <input type="text" value={taskForm.measurementType} onChange={e => setTaskForm({...taskForm, measurementType: e.target.value})} />
                    </div>
                  </div>
                </div>
               ) : (
                <div className="animate-fadeIn">
                  <div className="form-group">
                    <label>Vincular a Indicador Oficial</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginTop: '10px' }}>
                      {kpis.map((kpi: any) => (
                        <button
                          key={kpi.code}
                          onClick={() => {
                            setTaskForm({
                              ...taskForm,
                              kpiCode: kpi.code,
                              kpiEnabled: true,
                              kpiCategory: kpi.category || '',
                              kpiParams: kpi.params || []
                            });
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: taskForm.kpiCode === kpi.code ? 'rgba(255,100,0,0.1)' : 'rgba(255,255,255,0.02)',
                            color: taskForm.kpiCode === kpi.code ? 'var(--accent)' : 'var(--text-primary)',
                            borderColor: taskForm.kpiCode === kpi.code ? 'var(--accent)' : 'var(--border)',
                            fontSize: '11px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <strong style={{ fontSize: '13px' }}>{kpi.code}</strong>
                          <span style={{ opacity: 0.7, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.name}</span>
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Ou digite um código manual:</label>
                      <input 
                        type="text" 
                        value={taskForm.kpiCode || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setTaskForm({...taskForm, kpiCode: val, kpiEnabled: val.length > 0});
                        }} 
                        placeholder="Ex: CUSTOM_KPI"
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                  </div>
                  {taskForm.kpiEnabled && (
                    <div className="kpi-info-box" style={{ marginTop: '1.5rem', background: 'rgba(255,100,0,0.05)', borderColor: 'var(--accent)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px' }}>Esta tarefa alimenta o KPI <strong>{taskForm.kpiCode}</strong>.</span>
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Parâmetros / Dados Adicionais</span>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          const p = [...(taskForm.kpiParams || []), ''];
                          setTaskForm({...taskForm, kpiParams: p});
                        }}
                      >
                        + Adicionar
                      </button>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      Adicione campos extras que devem ser preenchidos na hora de lançar a atividade.
                    </p>
                    
                    <div>
                      {(taskForm.kpiParams || []).map((param: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input 
                            type="text" 
                            value={param} 
                            onChange={e => {
                              const p = [...(taskForm.kpiParams || [])];
                              p[idx] = e.target.value;
                              setTaskForm({...taskForm, kpiParams: p});
                            }}
                            placeholder="Nome do Parâmetro (Ex: Data da OS)" 
                            style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                          />
                          <button className="rtc-icon-btn danger" onClick={() => {
                            const p = [...(taskForm.kpiParams || [])];
                            p.splice(idx, 1);
                            setTaskForm({...taskForm, kpiParams: p});
                          }}><Trash2 size={14}/></button>
                        </div>
                      ))}
                      {(taskForm.kpiParams?.length === 0 || !taskForm.kpiParams) && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Nenhum parâmetro vinculado.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateTask}>{editingTask ? 'Salvar Alterações' : 'Criar Atividade'}</button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
}
