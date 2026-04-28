/* src/pages/Tarefas.tsx */
import React, { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../App';
import { 
  Plus, Search, Filter, MoreVertical, Edit3, Trash2, 
  CheckCircle2, Clock, AlertCircle, Link2, 
  CalendarDays, Calendar, User as UserIcon, X, History, RotateCcw 
} from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import './Tarefas.css';

export default function Tarefas() {
  const { tasks, userTasks, projects, users, addTask, updateTask, deleteTask, isAdmin, assignTask, getAllAssignees, addHistory, getHistory, deleteHistory } = useContext(AppContext);
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

  const handleDeleteHistoryEntry = async (historyEntry: any) => {
    if (!window.confirm('Excluir este registro e reverter a atividade para o estado anterior?')) return;
    try {
      // Restaura a tarefa para o estado anterior (oldValue)
      if (historyEntry.oldValue && historyModalTask) {
        const oldVal = JSON.parse(historyEntry.oldValue);
        const toRestore: any = {};
        // status
        if (oldVal.status !== undefined) toRestore.status = oldVal.status;
        // medição
        const mc = oldVal.measurementCurrent ?? oldVal.measurement_current;
        if (mc !== undefined) toRestore.measurementCurrent = mc;
        const mt = oldVal.measurementTarget ?? oldVal.measurement_target;
        if (mt !== undefined) toRestore.measurementTarget = mt;
        // execucoes
        if (oldVal.executions !== undefined) toRestore.executions = oldVal.executions;

        if (Object.keys(toRestore).length > 0) {
          await updateTask(historyModalTask.id, toRestore);
        }
      }
      // Deleta o registro do histórico
      await deleteHistory(historyEntry.id);
      // Atualiza a lista do modal
      const changes = await getHistory('task', historyModalTask.id);
      setTaskHistory(changes || []);
    } catch (error: any) {
      console.error('Erro ao excluir histórico:', error);
    }
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
  const [expandedDoneIds, setExpandedDoneIds] = useState<Set<number>>(new Set());

  const toggleDoneExpand = (id: number) => {
    setExpandedDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filtering + Sorting (A Fazer primeiro, Concluída por último)
  const filteredTasks = useMemo(() => {
    const filtered = displayedTasks.filter(t => {
      const matchSearch = (t.title || t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' ? true : t.status === filterStatus;
      return matchSearch && matchStatus;
    });
    return filtered.sort((a, b) => {
      if (a.status === 'Concluída' && b.status !== 'Concluída') return 1;
      if (a.status !== 'Concluída' && b.status === 'Concluída') return -1;
      return 0;
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

  const handleRevertExecution = async (task: any) => {
    if (!window.confirm('Tem certeza que deseja reverter a conclusão desta atividade? A última execução lançada será removida.')) return;
    const currentTask = tasks.find((t: any) => t.id === task.id);
    if (!currentTask) return;

    const executions: any[] = currentTask.executions || [];
    if (executions.length === 0) {
      // Nenhuma execução, apenas reseta status e current
      await updateTask(currentTask.id, {
        status: 'A Fazer',
        measurementCurrent: 0
      });
      return;
    }

    // Remove a última execução
    const lastExec = executions[executions.length - 1];
    const newExecutions = executions.slice(0, -1);
    const newCurrent = Math.max(0, (currentTask.measurementCurrent || 0) - (lastExec.quantidade || 0));
    const newStatus = newCurrent >= (currentTask.measurementTarget || 1) ? 'Concluída' : 'A Fazer';

    try {
      await updateTask(currentTask.id, {
        measurementCurrent: newCurrent,
        executions: newExecutions,
        status: newStatus
      });
    } catch (error: any) {
      console.error('Erro ao reverter execução:', error);
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
    <div className="dashboard-container animate-fadeIn">
      {/* ===== Header ===== */}
      <div className="dashboard-header">
        <div>
          <h1>Central de Tarefas</h1>
          <p className="dashboard-subtitle">Gerencie atividades do projeto ou tarefas avulsas operacionais.</p>
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
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div className="stats-grid">
        <div className="stat-card stat-projects">
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{tasks.length}</span>
            <span className="stat-label">Total de Tarefas</span>
          </div>
        </div>
        <div className="stat-card stat-progress">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{displayedTasks.filter(t => t.status === 'A Fazer').length}</span>
            <span className="stat-label">A Fazer</span>
          </div>
        </div>
        <div className="stat-card stat-tasks">
          <div className="stat-icon-wrapper success" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value text-success">{displayedTasks.filter(t => t.status === 'Concluída').length}</span>
            <span className="stat-label">Concluídas</span>
          </div>
        </div>
        <div className="stat-card stat-urgent">
          <div className="stat-icon-wrapper urgent" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <Link2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{displayedTasks.filter(t => !t.projectId).length}</span>
            <span className="stat-label">Tarefas Avulsas</span>
          </div>
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

      {/* ===== TWO-PANEL LAYOUT ===== */}
      {(() => {
        const pending = filteredTasks.filter(t => t.status !== 'Concluída');
        const done    = filteredTasks.filter(t => t.status === 'Concluída');

        const renderFullCard = (task: any, isDone = false) => {
          const pName = getProjectName(task.projectId);
          const assigneeName = getAssigneeName(task.assigneeId);
          const taskPct = (task.measurementTarget || 1) > 0
            ? Math.min(((task.measurementCurrent || 0) / (task.measurementTarget || 1)) * 100, 100)
            : 0;
          const dueD = task.dueDate ? new Date(task.dueDate) : null;
          if (dueD) dueD.setHours(0,0,0,0);
          const today = new Date(); today.setHours(0,0,0,0);
          const isDelayed = dueD && today.getTime() > dueD.getTime() && !isDone;
          const daysDelayed = isDelayed ? Math.floor((today.getTime() - dueD!.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          return (
            <div className={`rich-task-card ${isDone ? 'rtc-status-concluida' : 'rtc-status-afazer'}`}>
              {/* HEADER */}
              <div className="rich-task-header">
                <div>
                  <span className="rtc-title" title={task.title || task.name} style={isDone ? { color: 'var(--success)' } : {}}>{task.title || task.name}</span>
                  {pName ? (
                    <div className="rtc-project-badge"><Link2 size={10} /> {pName}</div>
                  ) : (
                    <div className="rtc-project-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>ATIVIDADE AVULSA</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="rtc-tag" style={isDone ? { backgroundColor: 'rgba(52,211,153,0.1)', color: 'var(--success)', borderColor: 'rgba(52,211,153,0.2)' } : {}}>{task.status}</span>
                  {!isDone && <button className="rtc-icon-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}><MoreVertical size={16}/></button>}
                </div>
                {openMenuId === task.id && (
                  <div className="projeto-context-menu">
                    <button onClick={() => { handleOpenModal(task); setOpenMenuId(null); }}><Edit3 size={14} /> Editar</button>
                    <button className="menu-danger" onClick={() => { handleDelete(task.id); setOpenMenuId(null); }}><Trash2 size={14} /> Excluir</button>
                  </div>
                )}
              </div>
              {/* DESC */}
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
                  {isDelayed && <div className="rtc-badge-item danger"><AlertCircle size={14}/> ATRASADA {daysDelayed}D</div>}
                  {task.dueDate && !isDone && <div className="rtc-badge-item warning"><Clock size={14}/> PRAZO: {task.dueDate}</div>}
                </div>
              </div>
              {/* PROGRESSO */}
              <div className="rtc-progress-area">
                <CircularProgress current={task.measurementCurrent || 0} total={task.measurementTarget || 1} color={isDone ? 'var(--success)' : 'var(--accent)'} size={72} />
                <div className="rtc-progress-info">
                  <span className="rtc-progress-text">{task.measurementCurrent || 0} {task.measurementType} de {task.measurementTarget || 1} {task.measurementType}</span>
                  <div className="rtc-progress-bar-container">
                    <div className="rtc-progress-bar-fill" style={{ width: `${isDone ? 100 : taskPct}%`, background: isDone ? 'var(--success)' : undefined }} />
                  </div>
                </div>
              </div>
              {/* ALERT */}
              <div className="rtc-alert-slot">
                {isDone && <div className="rtc-alert" style={{ color: 'var(--success)' }}><CheckCircle2 size={14}/> Tarefa finalizada com sucesso</div>}
              </div>
              {/* AÇÕES */}
              <div className="rtc-actions">
                {isDone ? (
                  <button className="btn-registrar" onClick={() => openHistoryModal(task)} style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.4)' }}>
                    Ver Histórico
                  </button>
                ) : (
                  <button className="btn-registrar" onClick={() => openExecutionModal(task)} disabled={!task.assigneeId} style={!task.assigneeId ? { background: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', color: 'var(--text-tertiary)', boxShadow: 'none' } : {}}>
                    {task.assigneeId ? 'Lançar Atividade' : 'Sem Responsável'}
                  </button>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isDone && isAdmin && (
                    <button className="rtc-icon-btn" onClick={() => handleRevertExecution(task)} title="Reverter Conclusão" style={{ color: 'var(--accent)', border: '1px solid rgba(255,100,0,0.3)' }}><RotateCcw size={16}/></button>
                  )}
                  <button className="rtc-icon-btn" onClick={() => openHistoryModal(task)} title="Histórico"><History size={16}/></button>
                  {!isDone && <button className="rtc-icon-btn" onClick={() => openEditTask(task)} title="Editar"><Edit3 size={16}/></button>}
                  {!isDone && <button className="rtc-icon-btn danger" onClick={() => handleDelete(task.id)} title="Excluir"><Trash2 size={16}/></button>}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="tarefas-split-layout">
            {/* ── COLUNA ESQUERDA: A FAZER ── */}
            <div className="tarefas-split-col">
              <div className="tarefas-col-header">
                <Clock size={16} />
                <span>A Fazer</span>
                <span className="tarefas-col-count">{pending.length}</span>
              </div>
              <div className="tarefas-col-cards">
                {pending.length === 0 && (
                  <div className="tarefas-empty-state">
                    <CheckCircle2 size={32} style={{ color: 'var(--success)', opacity: 0.5 }} />
                    <span>Nenhuma atividade pendente!</span>
                  </div>
                )}
                {pending.map(task => (
                  <div key={task.id}>{renderFullCard(task, false)}</div>
                ))}
              </div>
            </div>

            {/* ── COLUNA DIREITA: CONCLUÍDAS (accordion) ── */}
            <div className="tarefas-split-col tarefas-split-done">
              <div className="tarefas-col-header" style={{ borderColor: 'rgba(52,211,153,0.25)', color: 'var(--success)' }}>
                <CheckCircle2 size={16} />
                <span>Concluídas</span>
                <span className="tarefas-col-count" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}>{done.length}</span>
              </div>
              <div className="tarefas-col-cards">
                {done.length === 0 && (
                  <div className="tarefas-empty-state">
                    <Clock size={32} style={{ opacity: 0.3 }} />
                    <span>Nenhuma atividade concluída ainda.</span>
                  </div>
                )}
                {done.map(task => {
                  const isExpanded = expandedDoneIds.has(task.id);
                  const pName = getProjectName(task.projectId);
                  return (
                    <div key={task.id} className="rtc-accordion">
                      {/* ROW COLAPSADO */}
                      <button className="rtc-accordion-row" onClick={() => toggleDoneExpand(task.id)}>
                        <div className="rtc-accordion-left">
                          <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <span className="rtc-accordion-title">{task.title || task.name}</span>
                          {pName && <span className="rtc-accordion-proj"><Link2 size={9}/> {pName}</span>}
                        </div>
                        <div className="rtc-accordion-right">
                          <span className="rtc-tag" style={{ backgroundColor: 'rgba(52,211,153,0.1)', color: 'var(--success)', borderColor: 'rgba(52,211,153,0.2)', fontSize: '10px', padding: '2px 8px' }}>Concluída</span>
                          <span className="rtc-accordion-chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                        </div>
                      </button>
                      {/* CARD EXPANDIDO */}
                      {isExpanded && (
                        <div className="rtc-accordion-body">
                          {renderFullCard(task, true)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}


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
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: h.action === 'delete' ? 'var(--danger)' : h.action === 'create' ? 'var(--success)' : 'var(--accent)' }}>
                              {h.action === 'create' ? 'Criado' : h.action === 'update' ? 'Atualizado' : h.action === 'delete' ? 'Excluído' : h.action}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                {h.timestamp ? new Date(h.timestamp).toLocaleString('pt-BR') : ''}
                              </span>
                              {isAdmin && h.action === 'update' && h.oldValue && (
                                <button
                                  title="Excluir e reverter para estado anterior"
                                  onClick={() => handleDeleteHistoryEntry(h)}
                                  style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '6px',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '3px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    lineHeight: 1
                                  }}
                                >
                                  <Trash2 size={12}/> Reverter
                                </button>
                              )}
                            </div>
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
