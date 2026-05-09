/* src/pages/Tarefas.tsx */
import React, { useState, useMemo, useContext, useEffect, useDeferredValue, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AuthContext';
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
  CheckCircle2, Clock, AlertCircle, Link2, 
  CalendarDays, Calendar, User, X, History, RotateCcw,
  BarChart3, Layout, Play, Activity
} from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import './Tarefas.css';

const KPI_DICTIONARY = [
  { 
    code: 'OPE 009', 
    name: 'Tempo Médio de Diagnóstico', 
    category: 'Operacional',
    params: ['Hora_abertura_OS', 'Hora_diagnóstico_confirmado', 'N_OS_período'] 
  },
  { 
    code: 'OPE 012', 
    name: 'Incidentes Recorrentes %', 
    category: 'Operacional',
    params: ['N_incidentes_reincidentes', 'N_total_incidentes_período'] 
  },
  { 
    code: 'OPE 013', 
    name: 'Tempo Médio de Indisponibilidade', 
    category: 'Operacional',
    params: ['Hora_abertura_OS', 'Hora_resolução_confirmada', 'N_OS_resolvidas'] 
  },
  { 
    code: 'OPE 006', 
    name: '% OS Reincidentes', 
    category: 'Operacional',
    params: ['N_OS_período', 'OS_reabertas_mesmo_ponto_30d'] 
  },
  { 
    code: 'EXP.002', 
    name: 'Capacidade Instalada', 
    category: 'Expansão',
    params: ['Portas_disponíveis_por_CTO'] 
  },
  { 
    code: 'EXP.003', 
    name: 'Casas Passadas por Rota', 
    category: 'Expansão',
    params: ['UHs_no_trajeto_da_rota'] 
  },
  { 
    code: 'FIN 005', 
    name: 'Custo de Rede por Cliente', 
    category: 'Financeiro',
    params: ['Custo_total_rede_período', 'Média_clientes_ativos_período'] 
  }
];

// Componente Memoizado para evitar re-renders pesados ao digitar
const MemoizedTaskCard = memo(({ task, isDone, onEdit, onLaunch, onDelete, onRevert, getProjectName, openHistoryModal }: any) => {
  const pName = getProjectName(task.projectId);
  const progress = task.measurementTarget > 0 ? (task.measurementCurrent / task.measurementTarget) * 100 : 0;
  const isUrgent = task.priority === 'Alta' && task.status !== 'Concluída';
  const assigneeInitial = (task.assignee || 'N')[0].toUpperCase();

  return (
    <div className={`rich-task-card ${isDone ? 'is-done' : ''} ${isUrgent ? 'urgent-border' : ''}`}>
      <div className="rtc-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isDone ? 'var(--success)' : 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {task.title || task.name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="rtc-tag" style={{ background: isDone ? 'rgba(52,211,153,0.1)' : 'rgba(255,100,0,0.1)', color: isDone ? 'var(--success)' : 'var(--accent)', borderColor: isDone ? 'rgba(52,211,153,0.2)' : 'rgba(255,100,0,0.2)', fontSize: '10px', fontWeight: 800 }}>
              {task.status.toUpperCase()}
            </span>
            <MoreVertical size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>

        {pName && (
          <div className="rtc-project" style={{ marginBottom: '0' }}>
            <div className="rtc-badge-item" style={{ background: 'rgba(255,100,0,0.08)', color: 'var(--accent)', borderColor: 'rgba(255,100,0,0.2)', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Link2 size={10} />
              <span style={{ fontSize: '10px', fontWeight: 800 }}>{pName.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="rtc-body" style={{ padding: '20px 24px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.priority === 'Alta' ? '#ef4444' : task.priority === 'Média' ? '#f59e0b' : '#10b981' }}></div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{task.priority}</span>
        </div>

        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {task.description || 'Sem descrição.'}
        </p>

        <div className="rtc-user-assignee" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '12px', width: 'fit-content', marginBottom: '25px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '14px' }}>
            {assigneeInitial}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{task.assignee || 'Não atribuído'}</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0 -24px 15px -24px' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px' }}>
            <CircularProgress progress={progress} size={64} strokeWidth={6} color={isDone ? '#10b981' : '#f97316'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {task.measurementCurrent} {task.measurementType} de {task.measurementTarget} {task.measurementType}
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: isDone ? '#10b981' : 'linear-gradient(90deg, #f97316, #fb923c)' }}></div>
            </div>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '20px -24px 0 -24px' }}></div>
        {isDone && (
          <div className="rtc-alert" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '11px', fontWeight: 800 }}>
            <CheckCircle2 size={14} />
            <span>TAREFA FINALIZADA COM SUCESSO</span>
          </div>
        )}
      </div>

      <div className="rtc-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '15px 24px 20px 24px', display: 'flex', gap: '10px', marginTop: 'auto' }}>
        <button 
          className="btn-primary" 
          onClick={() => isDone ? openHistoryModal(task) : onLaunch(task)}
          style={{ flex: 1, background: isDone ? 'rgba(16,185,129,0.1)' : 'var(--accent)', color: isDone ? '#10b981' : 'white', border: isDone ? '1px solid rgba(16,185,129,0.2)' : 'none', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', height: '42px' }}
        >
          {isDone ? 'VER HISTÓRICO' : 'LANÇAR PRODUÇÃO'}
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isDone && (
            <button className="rtc-icon-btn" onClick={() => onRevert(task)} style={{ width: '42px', height: '42px', color: '#f97316', borderColor: 'rgba(249,115,22,0.2)' }}><RotateCcw size={18}/></button>
          )}
          <button className="rtc-icon-btn" onClick={() => openHistoryModal(task)} style={{ width: '42px', height: '42px' }}><History size={18}/></button>
          <button className="rtc-icon-btn" onClick={() => onEdit(task)} style={{ width: '42px', height: '42px' }}><Edit2 size={18}/></button>
          <button className="rtc-icon-btn danger" onClick={() => onDelete(task.id)} style={{ width: '42px', height: '42px' }}><Trash2 size={18}/></button>
        </div>
      </div>
    </div>
  );
});

export default function Tarefas() {
  const context = useContext(AppContext);
  
  // Safety check to avoid crash if context is missing
  if (!context) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Carregando contexto...</div>;
  }

  const { 
    tasks = [], 
    userTasks = [], 
    projects = [], 
    users = [], 
    addTask, 
    updateTask, 
    deleteTask, 
    isAdmin, 
    assignTask, 
    getAllAssignees, 
    addHistory, 
    getHistory, 
    deleteHistory,
    addKpiCollection
  } = context;
  
  const navigate = useNavigate();
  
  // Debug log for production tracking
  useEffect(() => {
    console.log('Tarefas Page Loaded:', { tasksCount: tasks?.length, projectsCount: projects?.length, isAdmin });
  }, [tasks, projects, isAdmin]);

  const [filterProject, setFilterProject] = useState('all'); // 'all', 'avulsa', or projectId
  
  const displayedTasks = useMemo(() => {
    const taskList = Array.isArray(tasks) ? tasks : [];
    const userTaskList = Array.isArray(userTasks) ? userTasks : [];
    let base = isAdmin ? taskList : userTaskList;
    
    if (filterProject === 'avulsa') {
      base = base.filter((t: any) => !t.projectId);
    } else if (filterProject !== 'all' && filterProject !== '') {
      base = base.filter((t: any) => String(t.projectId) === String(filterProject));
    }
    return base;
  }, [tasks, userTasks, filterProject, isAdmin]);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all'); // format: 'YYYY-MM' or 'all'
  const [visiblePendingCount, setVisiblePendingCount] = useState(50);
  const [visibleDoneCount, setVisibleDoneCount] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [openTabs, setOpenTabs] = useState<string[]>(['Atividade']);
  const [activeTab, setActiveTab] = useState('Atividade');

  const [executionForm, setExecutionForm] = useState<any>({
    colaboradorId: '',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    observacao: '',
    kpiValues: {}
  });

  const openExecutionModal = (task: any) => {
    setExecutionModalTask(task);
    setExecutionForm({
      colaboradorId: task.assigneeId || '',
      quantidade: '',
      data: new Date().toISOString().split('T')[0],
      observacao: '',
      kpiValues: {}
    });
  };
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [executionModalTask, setExecutionModalTask] = useState<any>(null);
  const [historyModalTask, setHistoryModalTask] = useState<any>(null);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);

  const openHistoryModal = async (task: any) => {
    setHistoryModalTask(task);
    console.log('Buscando histórico para task:', task.id);
    const [taskHistoryData, execHistoryData] = await Promise.all([
      getHistory('task', task.id).catch(() => []),
      getHistory('execution', task.id).catch(() => [])
    ]);
    const combined = [...(taskHistoryData || []), ...(execHistoryData || [])];
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setTaskHistory(combined);
  };

  const handleDeleteHistoryEntry = async (historyEntry: any) => {
    setDisintegratingHistoryId(historyEntry.id);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const oldValue = historyEntry.old_value || historyEntry.oldValue;
      const newValue = historyEntry.new_value || historyEntry.newValue;
      
      if (historyEntry.entity_type === 'execution' && newValue && historyModalTask) {
        const execData = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
        const qtyToRemove = execData.quantidade || 0;
        
        const currentTask = tasks.find(t => t.id === historyModalTask.id);
        if (currentTask && qtyToRemove > 0) {
          const newCurrent = Math.max(0, (currentTask.measurementCurrent || 0) - qtyToRemove);
          const newExecutions = (currentTask.executions || []).slice(0, -1);
          
          await updateTask(historyModalTask.id, {
            measurementCurrent: newCurrent,
            executions: newExecutions,
            status: newCurrent >= (currentTask.measurementTarget || 1) ? 'Concluída' : 'A Fazer'
          });
        }
      }
      else if (oldValue && historyModalTask) {
        const oldVal = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue;
        const toRestore: any = {};
        
        if (oldVal.status !== undefined) toRestore.status = oldVal.status;
        
        const mc = oldVal.measurementCurrent ?? oldVal.measurement_current;
        if (mc !== undefined) toRestore.measurementCurrent = mc;
        
        const mt = oldVal.measurementTarget ?? oldVal.measurement_target;
        if (mt !== undefined) toRestore.measurementTarget = mt;

        if (oldVal.executions !== undefined) toRestore.executions = oldVal.executions;

        if (Object.keys(toRestore).length > 0) {
          await updateTask(historyModalTask.id, toRestore);
        }
      }
      
      await deleteHistory(historyEntry.id);
      const [taskHistoryData, execHistoryData] = await Promise.all([
        getHistory('task', historyModalTask.id).catch(() => []),
        getHistory('execution', historyModalTask.id).catch(() => [])
      ]);
      const combined = [...(taskHistoryData || []), ...(execHistoryData || [])];
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTaskHistory(combined);
    } catch (error: any) {
      console.error('Erro ao excluir histórico:', error);
    } finally {
      setDisintegratingHistoryId(null);
    }
  };


  // Task Form State
  const emptyTask = {
    title: '',
    description: '',
    priority: 'Média',
    status: 'A Fazer',
    projectId: '',
    assignee: '',
    assigneeId: '',
    dueDate: '',
    kpiEnabled: false,
    kpiCode: '',
    kpiCategory: '',
    kpiParams: [],
    measurementCurrent: 0,
    measurementTarget: 1,
    measurementType: 'UN',
    color: 'var(--accent)',
    executions: []
  };
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [isLinked, setIsLinked] = useState(false);
  const [expandedDoneIds, setExpandedDoneIds] = useState<Set<number>>(new Set());
  const [disintegratingTaskId, setDisintegratingTaskId] = useState<number | null>(null);
  const [disintegratingHistoryId, setDisintegratingHistoryId] = useState<number | null>(null);

  const toggleDoneExpand = (id: number) => {
    setExpandedDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filtering + Sorting (A Fazer primeiro, Concluída por último)
  const filteredTasks = useMemo(() => {
    const taskList = Array.isArray(displayedTasks) ? displayedTasks : [];
    const filtered = taskList.filter(t => {
      const matchSearch = (t.title || t.name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' ? true : t.status === filterStatus;
      
      let matchMonth = true;
      if (filterMonth !== 'all') {
        const tDate = t.dueDate ? new Date(t.dueDate) : (t.created_at ? new Date(t.created_at) : null);
        if (tDate) {
          const mStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
          matchMonth = mStr === filterMonth;
        } else {
          matchMonth = false;
        }
      }
      
      return matchSearch && matchStatus && matchMonth;
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
      if (task.kpiCode || task.kpiEnabled) {
        setOpenTabs(['Atividade', 'KPI']);
        setActiveTab('Atividade');
      } else {
        setOpenTabs(['Atividade']);
        setActiveTab('Atividade');
      }
    } else {
      setEditingTask(null);
      setTaskForm(emptyTask);
      setIsLinked(false);
      setOpenTabs(['Atividade']);
      setActiveTab('Atividade');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!taskForm.title) {
      return;
    }
    
    const dataToSave = {
      ...taskForm,
      projectId: (isLinked && taskForm.projectId) ? taskForm.projectId : null,
      assigneeId: taskForm.assigneeId || null
    };


    try {
      if (editingTask) {
        const res = await updateTask(editingTask.id, dataToSave);
        if (!res.success) {
          alert('Erro ao atualizar: ' + res.error);
          return;
        }
        setIsModalOpen(false);
      } else {
        const res = await addTask(dataToSave);
        if (!res.success) {
          alert('Erro ao criar tarefa: ' + res.error);
          return;
        }
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
    const newExecution = {
       id: Date.now(),
       colaboradorId: executionForm.colaboradorId,
       quantidade: qty,
       data: executionForm.data,
       observacao: executionForm.observacao,
       kpiValues: executionForm.kpiValues,
       location: location,
       timestamp: new Date().toISOString()
    };
    const updatedExecutions = [...(currentTask.executions || []), newExecution];

    try {
      console.log('Salvando execução...', qty);
      await updateTask(currentTask.id, {
         measurementCurrent: newCurrent,
         executions: updatedExecutions,
         status: newCurrent >= (currentTask.measurementTarget || 1) ? 'Concluída' : 'A Fazer'
       });
       
       const collabName = users.find(u => u.id === executionForm.colaboradorId)?.name || 'Desconhecido';
       console.log('Salvando no histórico - collaborator:', collabName);
        await addHistory('execution', currentTask.id, 'create', null, {
          quantidade: qty,
          data: executionForm.data,
          observacao: executionForm.observacao,
          kpiValues: executionForm.kpiValues,
          collaboratorName: collabName,
          kpiCode: currentTask.kpiEnabled ? currentTask.kpiCode : null,
          kpiCategory: currentTask.kpiEnabled ? currentTask.kpiCategory : null
        });

        if (currentTask.kpiEnabled && currentTask.kpiCode) {
           console.log(`[KPI ENGINE] Coletando ${qty} ${currentTask.measurementType} para o indicador ${currentTask.kpiCode}`, executionForm.kpiValues);
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
      } catch (error: any) {
        console.error('Erro ao registrar execução:', error);
      }
  };

  const handleRevertExecution = async (task: any) => {
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
      if (!window.confirm('Tem certeza que deseja excluir esta atividade?')) return;
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

  const getProjectName = (id: number | null) => {
    if (!id) return null;
    return projects.find(p => p.id === id)?.name || 'Projeto não encontrado';
  };

  const getAssigneeName = (id: any) => {
    if(!id) return 'Não atribuído';
    const user = users.find(u => String(u.id) === String(id));
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
            {Array.isArray(projects) && projects.map((p: any) => (
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
        <div className="filters-group">
          <select 
            className="filter-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Todo o Período</option>
            {/* Gerar meses dinamicamente baseados no ano atual e anterior */}
            {(() => {
              const months = [];
              const now = new Date();
              for (let i = 0; i < 18; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                months.push(<option key={val} value={val}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>);
              }
              return months;
            })()}
          </select>
        </div>
      </div>

      {/* ===== TWO-PANEL LAYOUT ===== */}
      {(() => {
        const pending = filteredTasks.filter(t => t.status !== 'Concluída');
        const done    = filteredTasks.filter(t => t.status === 'Concluída');

        const renderFullCard = (task: any, isDone = false) => {
          try {
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
                    <button className="rtc-icon-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}><MoreVertical size={16}/></button>
                  </div>
                  {openMenuId === task.id && (
                    <div className="projeto-context-menu">
                      <button onClick={() => { handleOpenModal(task); setOpenMenuId(null); }}><Edit3 size={14} /> Editar</button>
                      <button 
                        className={`menu-danger ${disintegratingTaskId === task.id ? 'btn-disintegrate' : ''}`} 
                        onClick={() => { handleDelete(task.id); setOpenMenuId(null); }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
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
                    <button 
                      className={`rtc-icon-btn danger ${disintegratingTaskId === task.id ? 'btn-disintegrate' : ''}`} 
                      onClick={() => handleDelete(task.id)} 
                      title="Excluir"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          } catch (e) {
            console.error('Error rendering task card:', task, e);
            return <div className="rich-task-card" style={{ padding: '20px', color: 'var(--danger)' }}>Erro ao exibir tarefa #{task?.id}</div>;
          }
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
                {pending.slice(0, visiblePendingCount).map(task => (
                  <MemoizedTaskCard 
                    key={task.id}
                    task={task} 
                    isDone={false}
                    onEdit={openEditTask}
                    onLaunch={openExecutionModal}
                    onDelete={handleDelete}
                    onRevert={handleRevertExecution}
                    getProjectName={getProjectName}
                    openHistoryModal={openHistoryModal}
                  />
                ))}
                {pending.length > visiblePendingCount && (
                  <button 
                    onClick={() => setVisiblePendingCount(prev => prev + 100)}
                    className="rtc-btn-load-more"
                  >
                    Carregar mais {Math.min(100, pending.length - visiblePendingCount)} de {pending.length - visiblePendingCount} pendentes
                  </button>
                )}
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
                {done.slice(0, 50).map(task => {
                  const isExpanded = expandedDoneIds.has(task.id);
                  const pName = getProjectName(task.projectId);
                  return (
                    <div key={task.id} className="rtc-accordion">
                      {/* ROW COLAPSADO */}
                      <div className="rtc-accordion-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <div 
                          className="rtc-accordion-click-area" 
                          onClick={() => toggleDoneExpand(task.id)} 
                          style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div className="rtc-accordion-left">
                            <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            <span className="rtc-accordion-title">{task.title || task.name}</span>
                            {pName && <span className="rtc-accordion-proj"><Link2 size={9}/> {pName}</span>}
                          </div>
                          <div className="rtc-accordion-right">
                            <span className="rtc-tag" style={{ backgroundColor: 'rgba(52,211,153,0.1)', color: 'var(--success)', borderColor: 'rgba(52,211,153,0.2)', fontSize: '10px', padding: '2px 8px' }}>Concluída</span>
                            <span className="rtc-accordion-chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </div>
                        </div>
                      </div>
                      {/* CARD EXPANDIDO */}
                      {isExpanded && (
                        <div className="rtc-accordion-body">
                          <MemoizedTaskCard 
                            task={task} 
                            isDone={true}
                            onEdit={openEditTask}
                            onLaunch={openExecutionModal}
                            onDelete={handleDelete}
                            onRevert={handleRevertExecution}
                            getProjectName={getProjectName}
                            openHistoryModal={openHistoryModal}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {done.length > visibleDoneCount && (
                  <button 
                    onClick={() => setVisibleDoneCount(prev => prev + 100)}
                    className="rtc-btn-load-more"
                  >
                    Ver mais {Math.min(100, done.length - visibleDoneCount)} conclusões antigas
                  </button>
                )}
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
                 <select value={executionForm.colaboradorId || ''} onChange={e => setExecutionForm({...executionForm, colaboradorId: e.target.value})}>
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
                        <li key={index} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem', position: 'relative' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: h.action === 'delete' ? 'var(--danger)' : h.action === 'create' && h.entity_type !== 'execution' ? 'var(--success)' : 'var(--accent)' }}>
                                  {h.entity_type === 'execution' ? `Execução: +${JSON.parse(h.new_value || '{}').quantidade || 0}` : 
                                   h.action === 'create' ? 'Criado' : h.action === 'update' ? 'Atualizado' : h.action === 'delete' ? 'Excluído' : h.action}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                  Por: {h.user_name || h.userName || 'Sistema'}
                                </span>
                              </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                 {h.timestamp ? new Date(h.timestamp).toLocaleString('pt-BR') : ''}
                               </span>
                               {isAdmin && (
                                 <button
                                   title={h.action === 'update' ? "Excluir e reverter para estado anterior" : "Excluir registro"}
                                   className={`rtc-icon-btn danger mini ${disintegratingHistoryId === h.id ? 'btn-disintegrate' : ''}`}
                                   onClick={() => handleDeleteHistoryEntry(h)}
                                   style={{ width: '26px', height: '26px' }}
                                 >
                                   <Trash2 size={12}/>
                                 </button>
                               )}
                             </div>
                          </div>
                          {h.entity_type === 'execution' && h.new_value && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {(() => {
                                try {
                                  const execData = typeof h.new_value === 'string' ? JSON.parse(h.new_value) : h.new_value;
                                  let text = `${execData.quantidade} unidades • ${execData.collaboratorName || 'Colaborador'} • ${execData.data || ''}`;
                                  if (execData.kpiValues && Object.keys(execData.kpiValues).length > 0) {
                                    text += ` | KPI: ` + Object.entries(execData.kpiValues).map(([k,v]) => `${k}: ${v}`).join(', ');
                                  }
                                  return text;
                                } catch { return ''; }
                              })()}
                            </div>
                          )}
                          {h.action === 'update' && h.new_value && h.old_value && h.entity_type !== 'execution' && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {(() => {
                                try {
                                  const oldVal = typeof h.old_value === 'string' ? JSON.parse(h.old_value) : h.old_value;
                                  const newVal = typeof h.new_value === 'string' ? JSON.parse(h.new_value) : h.new_value;
                                  const changes = Object.keys(newVal).filter(k => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k]));
                                  return changes.map(k => `${k}: ${oldVal[k] ?? '-'} → ${newVal[k]}`).join(', ');
                                } catch { return ''; }
                              })()}
                            </div>
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
            {/* Chrome-style Tabs Header */}
            <div className="chrome-tabs-container">
              {openTabs.map(tab => (
                <div 
                  key={tab} 
                  className={`chrome-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <div className="tab-background-svg">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0,100 L0,12 C0,5 5,0 12,0 L88,0 C95,0 100,5 100,12 L100,100 Z" />
                    </svg>
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
                <button 
                  className="chrome-plus-btn"
                  onClick={() => {
                    setOpenTabs(['Atividade', 'KPI']);
                    setActiveTab('KPI');
                  }}
                  title="Adicionar KPI"
                >
                  <Plus size={14} />
                </button>
              )}

              <button className="chrome-close-modal" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-header" style={{ paddingTop: '0.5rem', borderBottom: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {activeTab === 'KPI' ? 'Configuração de KPI e Dados' : (editingTask ? 'Editar Atividade' : 'Nova Atividade')}
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {activeTab === 'KPI' ? 'Vincule regras de coleta e exija parâmetros na execução.' : 'Defina os detalhes fundamentais da tarefa.'}
                </p>
              </div>
            </div>
            
            <div className="modal-body" style={{ minHeight: '340px' }}>
              {activeTab === 'Atividade' ? (
                <div className="animate-fadeIn">
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
                      <select value={taskForm.projectId || ''} onChange={e => setTaskForm({...taskForm, projectId: e.target.value})}>
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
                      <select value={taskForm.assigneeId || ''} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
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
              ) : (
                <div className="animate-fadeIn">
                  <div className="form-group">
                    <label>Vincular a Indicador Oficial</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginTop: '10px' }}>
                      {KPI_DICTIONARY.map(kpi => (
                        <button
                          key={kpi.code}
                          onClick={() => {
                            setTaskForm({
                              ...taskForm,
                              kpiCode: kpi.code,
                              kpiEnabled: true,
                              kpiCategory: kpi.category || '',
                              kpiParams: kpi.params
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
                    <div className="kpi-info-box animate-fadeIn" style={{ marginTop: '1.5rem', background: 'rgba(255,100,0,0.05)', borderColor: 'var(--accent)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '13px' }}>Esta tarefa está configurada para alimentar o KPI <strong>{taskForm.kpiCode}</strong>.</span>
                      </div>
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
                          <button 
                            className="rtc-icon-btn danger" 
                            onClick={() => {
                              const p = [...(taskForm.kpiParams || [])];
                              p.splice(idx, 1);
                              setTaskForm({...taskForm, kpiParams: p});
                            }}
                          >
                            <Trash2 size={14}/>
                          </button>
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
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>
                {editingTask ? 'Salvar Alterações' : 'Criar Atividade'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
