/* src/pages/Tarefas.tsx */
import React, { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../App';
import { 
  Plus, Search, Filter, MoreVertical, Edit3, Trash2, 
  CheckCircle2, Clock, AlertCircle, Link2, 
  CalendarDays, User as UserIcon, X, History, Undo2 
} from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import './Tarefas.css';

export default function Tarefas() {
  const { tasks, userTasks, projects, users, addTask, updateTask, deleteTask, isAdmin, assignTask, getAllAssignees, getHistory, deleteHistory, undoTaskComplete } = useContext(AppContext);
  const navigate = useNavigate();
  
  const displayedTasks = isAdmin ? tasks : userTasks;
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

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

  const openExecutionModal = (task: any) => {
    setExecutionModalTask(task);
    setExecutionForm({
      ...executionForm,
      colaboradorId: task.assigneeId || '',
      data: new Date().toISOString().split('T')[0]
    });
  };

  // Task Form State
  const emptyTask = {
    title: '',
    description: '',
    priority: 'Média',
    status: 'A Fazer',
    projectId: '', // Empty means avulsa
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
      const matchProject = filterProject === 'all' 
        ? true 
        : filterProject === 'standalone' 
          ? !t.projectId 
          : t.projectId === Number(filterProject);
      const matchStatus = filterStatus === 'all' ? true : t.status === filterStatus;
      
      return matchSearch && matchProject && matchStatus;
    });
  }, [displayedTasks, searchTerm, filterProject, filterStatus]);

  // Handlers
  const handleOpenModal = (task: any = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        ...task,
        projectId: task.projectId || '',
        assigneeId: task.assigneeId || ''
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
    if (!taskForm.title) return alert('Por favor, insira um título.');
    
    const dataToSave = {
      ...taskForm,
      projectId: isLinked ? Number(taskForm.projectId) : null
    };
    
    // Cleanup for safety (prevent schema cache errors)
    delete (dataToSave as any).assignee;

    if (editingTask) {
      await updateTask(editingTask.id, dataToSave);
    } else {
      await addTask(dataToSave);
    }
    
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveExecution = async () => {
    if (!executionModalTask) return;
    const qty = Number(executionForm.quantidade);
    if (!qty || qty <= 0) return alert('Quantidade inválida.');
    
    try {
      // Get geolocation if possible
      let location = null;
      try {
        if ("geolocation" in navigator) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: (position as any).coords.latitude,
            lng: (position as any).coords.longitude
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

      await updateTask(currentTask.id, {
         measurementCurrent: newCurrent,
         executions: updatedExecutions
      });
      setExecutionModalTask(null);
      setExecutionForm({ colaboradorId: '', quantidade: '', data: new Date().toISOString().split('T')[0], observacao: '' });
    } catch (error: any) {
      console.error(error);
      alert("Erro ao registrar produção: " + (error.message || "Erro de sincronização"));
    }
  };

  const openEditTask = (task: any) => {
    setTaskForm({ 
      ...task,
      projectId: task.projectId || '',
      assigneeId: task.assigneeId || ''
    });
    setEditingTask(task);
    setIsLinked(!!task.projectId);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(id);
    }
  };

  const handleUndoComplete = async (task: any) => {
    if (undoTaskComplete) {
      await undoTaskComplete(task.id);
    }
    setOpenMenuId(null);
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

  const handleDeleteHistory = async (historyId: string) => {
    if (!window.confirm('Deseja excluir este registro de atividade?')) return;
    const success = await (deleteHistory as any)(historyId);
    if (success && historyModalTask) {
       const changes = await (getHistory as any)('task', historyModalTask.id);
       setTaskHistory(changes || []);
    }
  };

  const formatHistoryValue = (h: any) => {
    try {
      if (h.action === 'create') return 'Atividade Criada';
      if (h.action === 'delete') return 'Atividade Excluída';
      
      let newValue = h.newValue;
      let oldValue = h.oldValue;
      
      if (typeof newValue === 'string' && (newValue.startsWith('{') || newValue.startsWith('['))) newValue = JSON.parse(newValue);
      if (typeof oldValue === 'string' && (oldValue.startsWith('{') || oldValue.startsWith('['))) oldValue = JSON.parse(oldValue);

      if (newValue?.measurementCurrent !== undefined && oldValue?.measurementCurrent !== undefined) {
        const diff = Number(newValue.measurementCurrent) - Number(oldValue.measurementCurrent);
        const unit = newValue.measurementType || 'UN';
        if (diff > 0) return `Lançou +${diff} ${unit} (Total: ${newValue.measurementCurrent}/${newValue.measurementTarget})`;
        if (diff < 0) return `Removeu ${Math.abs(diff)} ${unit} (Total: ${newValue.measurementCurrent}/${newValue.measurementTarget})`;
      }

      if (h.action === 'update' && newValue?.status && oldValue?.status && newValue.status !== oldValue.status) {
        return `Atividade movida para: ${newValue.status}`;
      }

      return 'Alteração de dados';
    } catch (e) {
      return 'Alteração registrada';
    }
  };

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

      {/* Stats Cards */}
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
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título da tarefa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <select className="filter-select" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="all">Todos os Projetos</option>
            <option value="standalone">Apenas Avulsas</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
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
          
          return (
            <div key={task.id} className="rich-task-card projeto-card" style={isDone ? { borderColor: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.04)' } : {}}>
              <div className="rich-task-header">
                <div>
                  <span className="rtc-title" style={isDone ? { color: 'var(--success)' } : {}}>{task.title || task.name}</span>
                  <div className="rtc-project-badge" style={!pName ? { background: 'var(--bg-hover)', color: 'var(--text-secondary)' } : {}}>
                      {pName ? <><Link2 size={10} /> {pName}</> : 'Avulsa'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="rtc-tag" style={isDone ? { backgroundColor: 'var(--success)', color: '#fff' } : {}}>{task.status}</span>
                    <button className="rtc-icon-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}>
                        <MoreVertical size={16}/>
                    </button>
                </div>
                
                {openMenuId === task.id && (
                    <div className="projeto-context-menu" style={{ right: '10px', top: '40px', display: 'flex' }}>
                         {isDone && <button onClick={() => handleUndoComplete(task)}><Undo2 size={14} /> Desfazer</button>}
                         <button onClick={() => { handleOpenModal(task); setOpenMenuId(null); }}><Edit3 size={14} /> Editar</button>
                         <button className="menu-danger" onClick={() => { handleDelete(task.id); setOpenMenuId(null); }}><Trash2 size={14} /> Excluir</button>
                    </div>
                )}
              </div>

              <div className="rtc-desc">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="rtc-color-dot" style={{ backgroundColor: task.color }} />
                    <span style={{ fontWeight: 600 }}>{task.priority || 'Média'}</span>
                 </div>
                 <p style={{ margin: '4px 0', fontSize: '13px' }}>{task.description || 'Sem descrição.'}</p>
                 <div className="rtc-user-assignee">
                    <div className="rtc-user-avatar">{assigneeName.charAt(0).toUpperCase()}</div>
                    <span>{assigneeName}</span>
                 </div>
              </div>

              <div className="rtc-progress-area">
                <CircularProgress current={task.measurementCurrent || 0} total={task.measurementTarget || 1} color={isDone ? 'var(--success)' : 'var(--accent)'}/>
                <span className="rtc-progress-text">{task.measurementCurrent || 0} {task.measurementType} de {task.measurementTarget || 1} {task.measurementType}</span>
              </div>

              <div style={{ minHeight: '22px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                 {task.dueDate ? (
                    <div className="rtc-alert" style={{ color: isDone ? 'var(--success)' : 'var(--text-secondary)' }}>
                        <Clock size={14}/> {isDone ? 'Fechada em' : 'Prazo:'} {task.dueDate}
                    </div>
                 ) : <div style={{ height: '22px' }}></div>}
              </div>

              <div className="rtc-actions" style={{ marginTop: 'auto' }}>
                 <button className="btn-registrar" onClick={() => openExecutionModal(task)} disabled={!task.assigneeId} style={!task.assigneeId ? { background: '#cbd5e1', cursor: 'not-allowed', color: '#64748b' } : (isDone ? { background: 'var(--success)' } : {})}>
                    {task.assigneeId ? (isDone ? 'Ver Histórico' : 'Lançar Atividade') : 'Sem Responsável'}
                 </button>
                 <button className="rtc-icon-btn" onClick={() => openHistoryModal(task)}><History size={16}/></button>
                 <button className="rtc-icon-btn" onClick={() => handleOpenModal(task)}><Edit3 size={16}/></button>
                 <button className="rtc-icon-btn danger" onClick={() => handleDelete(task.id)}><Trash2 size={16}/></button>
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
               <button className="btn-primary" onClick={handleSaveExecution} disabled={!executionForm.colaboradorId} style={!executionForm.colaboradorId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>Salvar Produção</button>
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
                 <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhuma alteração registrada ainda.</p>
               ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {taskHistory.map((h: any, index) => (
                      <li key={index} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{formatHistoryValue(h)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Por: {h.userName || 'Sistema'} • {h.timestamp ? new Date(h.timestamp).toLocaleString('pt-BR') : ''}</div>
                         </div>
                         {isAdmin && (
                           <button onClick={() => handleDeleteHistory(h.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '8px', cursor: 'pointer', opacity: 0.6 }} title="Excluir"><Trash2 size={18} /></button>
                         )}
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
              <h3>{editingTask ? 'Editar Atividade' : 'Nova Atividade'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="link-project-toggle">
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>Vincular a Projeto?</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>{isLinked ? 'Tarefa fará parte de um projeto.' : 'Tarefa avulsa/solta sem projeto.'}</p>
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
