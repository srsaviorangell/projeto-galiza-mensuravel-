/* src/pages/Tarefas.tsx */
import React, { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../App';
import { 
  Plus, Search, Filter, MoreVertical, Edit3, Trash2, 
  CheckCircle2, Clock, AlertCircle, Link2, 
  CalendarDays, User as UserIcon, X, History 
} from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import './Tarefas.css';

export default function Tarefas() {
  const { tasks, userTasks, projects, users, addTask, updateTask, deleteTask, isAdmin, assignTask, getAllAssignees, addHistory, getHistory } = useContext(AppContext);
  const navigate = useNavigate();
  
  const [filterProject, setFilterProject] = useState('all'); // 'all', 'avulsa', or projectId
  
  const displayedTasks = useMemo(() => {
    let base = isAdmin ? tasks : userTasks;
    if (filterProject === 'avulsa') {
      base = base.filter((t: any) => !t.projectId);
    } else if (filterProject !== 'all' && filterProject !== '') {
      base = base.filter((t: any) => t.projectId === Number(filterProject));
    }
    return base;
  }, [tasks, userTasks, filterProject, isAdmin]);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const openExecutionModal = (task: any) => {
    setExecutionModalTask(task);
    setExecutionForm({
      ...executionForm,
      colaboradorId: task.assigneeId || '',
      data: new Date().toISOString().split('T')[0]
    });
  };
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [executionModalTask, setExecutionModalTask] = useState<any>(null);
  const [historyModalTask, setHistoryModalTask] = useState<any>(null);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);

  const openHistoryModal = async (task: any) => {
    setHistoryModalTask(task);
    const changes = await getHistory('task', task.id);
    setTaskHistory(changes || []);
  };
  const [executionForm, setExecutionForm] = useState({
    colaboradorId: '',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  // Task Form State
  const emptyTask = {
    title: '',
    description: '',
    priority: 'Média',
    status: 'A Fazer',
    projectId: '', // Empty means avulsa
    assignee: '',
    assigneeId: '',
    dueDate: '',
    measurementTarget: 1,
    measurementCurrent: 0,
    measurementType: 'UN',
    color: 'var(--accent)'
  };
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [isLinked, setIsLinked] = useState(false);

  // Filtering
  const filteredTasks = useMemo(() => {
    return displayedTasks.filter(t => {
      const matchSearch = (t.title || t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' ? true : t.status === filterStatus;
      
      return matchSearch && matchStatus;
    });
  }, [displayedTasks, searchTerm, filterStatus]);

  // Handlers
  const handleOpenModal = (task: any = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        ...task,
        projectId: task.projectId || '',
        assignee: task.assignee || ''
      });
      setIsLinked(!!task.projectId);
    } else {
      setEditingTask(null);
      setTaskForm(emptyTask);
      setIsLinked(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!taskForm.title) {
      return;
    }
    
    const dataToSave = {
      ...taskForm,
      projectId: (isLinked && taskForm.projectId) ? Number(taskForm.projectId) : null,
      assigneeId: taskForm.assigneeId || null
    };


    try {
      if (editingTask) {
        await updateTask(editingTask.id, dataToSave);
        setIsModalOpen(false);
      } else {
        await addTask(dataToSave);
      }
      
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Erro ao salvar atividade:', error);
    }
  };

  const handleSaveExecution = async () => {
    if (!executionModalTask) return;
    const qty = Number(executionForm.quantidade);
    if (!qty || qty <= 0) {
      return;
    }
    
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
       location: location,
       timestamp: new Date().toISOString()
    }];

    try {
      await updateTask(currentTask.id, {
         measurementCurrent: newCurrent,
         executions: updatedExecutions,
         status: newCurrent >= (currentTask.measurementTarget || 1) ? 'Concluída' : 'A Fazer'
      });
setExecutionModalTask(null);
      } catch (error: any) {
        console.error('Erro ao registrar execução:', error);
      }
  };

  const openEditTask = (task: any) => {
    setTaskForm({ 
      ...task,
      projectId: task.projectId || '',
      assignee: task.assignee || ''
    });
    setEditingTask(task);
    setIsLinked(!!task.projectId);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await deleteTask(id);
        } catch (error: any) {
        console.error('Erro ao excluir tarefa:', error);
      }
    }
  };

  const getProjectName = (id: number | null) => {
    if (!id) return null;
    return projects.find(p => p.id === id)?.name || 'Projeto não encontrado';
  };

  const getAssigneeName = (id: any) => {
    if(!id) return 'Não atribuído';
    const user = users.find(u => u.id === Number(id));
    return user?.name || 'Não atribuído';
  };

  const assignees = getAllAssignees();

  return (
    <div className="tarefas-container animate-fadeIn">
      {/* Header */}
      <div className="tarefas-header-row">
        <div className="tarefas-title-area">
          <h2>Central de Tarefas</h2>
          <p>Gerencie atividades do projeto ou tarefas avulsas operacionais.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      {/* Stats Cards (Mini Dashboard for Tasks) */}
      <div className="pd-stats-row">
          <div className="pd-stat-card">
              <div className="stat-info">
                  <span className="stat-label">Total de Tarefas</span>
                  <span className="stat-value">{tasks.length}</span>
              </div>
              <div className="stat-icon trend"><CheckCircle2 size={20} /></div>
          </div>
          <div className="pd-stat-card">
              <div className="stat-info">
                  <span className="stat-label">A Fazer</span>
                  <span className="stat-value">{displayedTasks.filter(t => t.status === 'A Fazer').length}</span>
              </div>
              <div className="stat-icon clock"><Clock size={20} /></div>
          </div>
          <div className="pd-stat-card">
              <div className="stat-info">
                  <span className="stat-label">Concluídas</span>
                  <span className="stat-value text-success">{displayedTasks.filter(t => t.status === 'Concluída').length}</span>
              </div>
              <div className="stat-icon check"><CheckCircle2 size={20} /></div>
          </div>
          <div className="pd-stat-card">
              <div className="stat-info">
                  <span className="stat-label">Tarefas Avulsas</span>
                  <span className="stat-value">{displayedTasks.filter(t => !t.projectId).length}</span>
              </div>
              <div className="stat-icon target"><Link2 size={20} /></div>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Buscar por título da tarefa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <select 
            className="filter-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">Todos os Projetos</option>
            <option value="avulsa">Avulsas (Sem Projeto)</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="filters-group">
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="A Fazer">A Fazer</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="tarefas-grid">
        {filteredTasks.map((task) => {
          const isDone = task.status === 'Concluída';
          const pName = getProjectName(task.projectId);
          const assigneeName = getAssigneeName(task.assigneeId);
          
          const taskPct = (task.measurementTarget || 1) > 0
            ? Math.min(((task.measurementCurrent || 0) / (task.measurementTarget || 1)) * 100, 100)
            : 0;

          // Cálculo do Atraso (Sincronizado com ProjetoDetalhes)
          const dueD = task.dueDate ? new Date(task.dueDate) : null;
          if (dueD) dueD.setHours(0,0,0,0);
          const today = new Date();
          today.setHours(0,0,0,0);
          const isDelayed = dueD && today.getTime() > dueD.getTime() && !isDone;
          const daysDelayed = isDelayed ? Math.floor((today.getTime() - dueD.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          return (
            <div 
              key={task.id} 
              className={`rich-task-card ${isDone ? 'rtc-status-concluida' : 'rtc-status-afazer'}`}
            >
              {/* CAMADA 1: HEADER */}
              <div className="rich-task-header">
                <div>
                  <span className="rtc-title" style={isDone ? { color: 'var(--success)' } : {}}>{task.title || task.name}</span>
                  {pName ? (
                    <div className="rtc-project-badge">
                        <Link2 size={10} /> {pName}
                    </div>
                  ) : (
                    <div className="rtc-project-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                        ATIVIDADE AVULSA
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="rtc-tag" style={isDone ? { backgroundColor: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', borderColor: 'rgba(52, 211, 153, 0.2)' } : {}}>{task.status}</span>
                    <button className="rtc-icon-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}>
                        <MoreVertical size={16}/>
                    </button>
                </div>
                
                {openMenuId === task.id && (
                    <div className="projeto-context-menu">
                         <button onClick={() => { handleOpenModal(task); setOpenMenuId(null); }}><Edit3 size={14} /> Editar</button>
                         <button className="menu-danger" onClick={() => { handleDelete(task.id); setOpenMenuId(null); }}><Trash2 size={14} /> Excluir</button>
                    </div>
                )}
              </div>

              {/* CAMADA 2: DESCRIÇÃO E BADGES (ALTURA FIXA 200PX) */}
              <div className="rtc-desc">
                  <div className="rtc-info-row">
                    <div className="rtc-color-dot" style={{ backgroundColor: task.color || 'var(--accent)' }} />
                    <span className="rtc-priority-label">{task.priority || 'Média'}</span>
                  </div>
                  <p className="rtc-description-text">{task.description || 'Sem descrição.'}</p>
                  
                  <div className="rtc-info-row" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <div className="rtc-badge-item">
                      <div className="rtc-user-avatar">{assigneeName.charAt(0).toUpperCase()}</div>
                      <span className="rtc-user-name">{assigneeName}</span>
                    </div>

                    {isDelayed && (
                      <div className="rtc-badge-item danger">
                        <AlertCircle size={14}/> ATRASADA {daysDelayed}D
                      </div>
                    )}

                    {task.dueDate && !isDone && (
                      <div className="rtc-badge-item warning">
                        <Clock size={14}/> PRAZO: {task.dueDate}
                      </div>
                    )}
                  </div>
              </div>

              {/* CAMADA 3: PROGRESSO (ALTURA FIXA 110PX) */}
              <div className="rtc-progress-area">
                <CircularProgress 
                    current={task.measurementCurrent || 0} 
                    total={task.measurementTarget || 1} 
                    color={isDone ? 'var(--success)' : 'var(--accent)'}
                    size={72}
                />
                <div className="rtc-progress-info">
                  <span className="rtc-progress-text">{task.measurementCurrent || 0} {task.measurementType} de {task.measurementTarget || 1} {task.measurementType}</span>
                  <div className="rtc-progress-bar-container">
                    <div className="rtc-progress-bar-fill" style={{ width: `${isDone ? 100 : taskPct}%` }} />
                  </div>
                </div>
              </div>

              {/* CAMADA 4: ALERT SLOT (ALTURA FIXA 44PX) */}
              <div className="rtc-alert-slot">
                  {isDone && (
                    <div className="rtc-alert" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={14}/> Tarefa finalizada com sucesso
                    </div>
                  )}
              </div>

              {/* CAMADA 5: AÇÕES (ALTURA FIXA 90PX) */}
              <div className="rtc-actions">
                <button 
                   className="btn-registrar" 
                   onClick={() => openExecutionModal(task)}
                   disabled={!task.assigneeId}
                   style={!task.assigneeId ? { background: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', color: 'var(--text-tertiary)', boxShadow: 'none' } : (isDone ? { background: 'linear-gradient(135deg, var(--success), #2DD4BF)' } : {})}
                >
                    {isDone ? 'Ver Histórico' : (task.assigneeId ? 'Lançar Atividade' : 'Sem Responsável')}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="rtc-icon-btn" onClick={() => openHistoryModal(task)} title="Histórico"><History size={16}/></button>
                  <button className="rtc-icon-btn" onClick={() => openEditTask(task)} title="Editar"><Edit3 size={16}/></button>
                  <button className="rtc-icon-btn danger" onClick={() => handleDelete(task.id)} title="Excluir"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Creation Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>{editingTask ? 'Editar Atividade Global' : 'Nova Atividade Global'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            
            <div className="modal-body">
              <div className="link-project-toggle">
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>Vincular a Projeto?</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {isLinked ? 'Tarefa fará parte de um projeto.' : 'Tarefa avulsa/solta sem projeto.'}
                  </p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isLinked} onChange={(e) => setIsLinked(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>

              {isLinked && (
                <div className="form-group">
                  <label>Selecione o Projeto *</label>
                  <select value={taskForm.projectId} onChange={e => setTaskForm({...taskForm, projectId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Título da Atividade *</label>
                <input type="text" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Título..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Responsável</label>
                  <select value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
                    <option value="">Não atribuído</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
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
                  <label>Unidade</label>
                  <input type="text" value={taskForm.measurementType} onChange={e => setTaskForm({...taskForm, measurementType: e.target.value})} placeholder="Ex: Metros" />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
