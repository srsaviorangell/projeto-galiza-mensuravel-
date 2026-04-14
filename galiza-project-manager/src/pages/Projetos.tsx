import React, { useState, useMemo, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  UploadCloud,
  X,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  AlertTriangle,
  TrendingUp,
  FolderOpen,
  LayoutGrid,
  List,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { AppContext } from '../App';
import './Projetos.css';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'Em andamento' | 'Concluído' | 'Atrasado';

interface ProjectFormData {
  name: string;
  description: string;
  difficulty: string;
  startDate: string;
  endDate: string;
  files: File[];
  links: { title: string; url: string }[];
}

const emptyForm: ProjectFormData = {
  name: '',
  description: '',
  difficulty: 'Médio',
  startDate: '',
  endDate: '',
  files: [],
  links: [],
};

// Helper: converte DD/MM/YYYY do estado para YYYY-MM-DD do input date
function toDateInputFormat(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  let year = parts[2];
  if (year.length === 2) year = '20' + year;
  return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Helper: converte YYYY-MM-DD do input date de volta para DD/MM/YYYY no estado
function toDisplayFormat(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function Projetos() {
  const { projects, tasks, addProject, updateProject, deleteProject } = useContext(AppContext);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Prevent body scrolling when a modal is open
  useEffect(() => {
    if (isModalOpen || deleteConfirm !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deleteConfirm]);

  // Helper: compute deadline info for a project
  function getDeadlineInfo(proj: any) {
    if (!proj.endDate) return { label: '—', isLate: false };
    // Parse dd/mm/yy or dd/mm/yyyy
    const parts = proj.endDate.split('/');
    if (parts.length !== 3) return { label: proj.endDate, isLate: false };
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const end = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Atrasado', isLate: true };
    return { label: `${diff}d`, isLate: false };
  }

  // Determine effective status
  function getEffectiveStatus(proj: any) {
    if (proj.progress === 100) return 'Concluído';
    const { isLate } = getDeadlineInfo(proj);
    if (isLate || proj.deadlineStatus === 'Atrasado') return 'Atrasado';
    return 'Em andamento';
  }

  // Filtered and searched projects
  const filteredProjects = useMemo(() => {
    return projects.filter((proj: any) => {
      const matchesSearch =
        proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (proj.description && proj.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const effectiveStatus = getEffectiveStatus(proj);
      const matchesFilter = filterStatus === 'all' || effectiveStatus === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchQuery, filterStatus]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p: any) => p.progress === 100).length;
    const late = projects.filter((p: any) => getEffectiveStatus(p) === 'Atrasado').length;
    const avgProgress =
      total > 0 ? Math.round(projects.reduce((s: number, p: any) => s + p.progress, 0) / total) : 0;
    return { total, completed, late, avgProgress };
  }, [projects]);

  // Form handlers
  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: any) => {
    setEditingProject(proj.id);
    setFormData({
      name: proj.name,
      description: proj.description || '',
      difficulty: proj.difficulty,
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      files: proj.files || [],
      links: proj.links || [],
    });
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingProject) {
      updateProject(editingProject, {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        startDate: formData.startDate,
        endDate: formData.endDate,
        files: formData.files,
        links: formData.links,
      });
    } else {
      addProject({
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        progress: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
        deadline: null,
        deadlineStatus: 'normal',
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'Em andamento',
        files: formData.files,
        links: formData.links,
      });
    }
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData(emptyForm);
  };

  const handleConfirmDelete = (id: number) => {
    deleteProject(id);
    setDeleteConfirm(null);
    setOpenMenuId(null);
  };

  const handleFieldChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => {
      const newFiles = [...prev.files];
      newFiles.splice(index, 1);
      return { ...prev, files: newFiles };
    });
  };

  const handleAddLink = () => {
    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { title: '', url: '' }]
    }));
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    setFormData(prev => {
      const newLinks = [...prev.links];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, links: newLinks };
    });
  };

  const removeLink = (index: number) => {
    setFormData(prev => {
      const newLinks = [...prev.links];
      newLinks.splice(index, 1);
      return { ...prev, links: newLinks };
    });
  };

  // Get project task count from tasks context
  function getProjectTasks(projectId: number) {
    const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
    const completed = projectTasks.filter((t: any) => t.status === 'Concluída').length;
    return { completed, total: projectTasks.length };
  }

  const filterOptions: { label: string; value: FilterStatus; color: string }[] = [
    { label: 'Todos', value: 'all', color: 'var(--text-secondary)' },
    { label: 'Em andamento', value: 'Em andamento', color: 'var(--accent)' },
    { label: 'Concluídos', value: 'Concluído', color: 'var(--success)' },
    { label: 'Atrasados', value: 'Atrasado', color: 'var(--danger)' },
  ];

  return (
    <div className="page-container animate-fadeIn">
      {/* ===== Summary Cards ===== */}
      <div className="projetos-summary">
        <div className="summary-card summary-total">
          <div className="summary-icon-wrapper summary-icon-total">
            <FolderOpen size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summaryStats.total}</span>
            <span className="summary-label">Total Projetos</span>
          </div>
        </div>
        <div className="summary-card summary-progress">
          <div className="summary-icon-wrapper summary-icon-progress">
            <TrendingUp size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summaryStats.avgProgress}%</span>
            <span className="summary-label">Progresso Médio</span>
          </div>
        </div>
        <div className="summary-card summary-completed">
          <div className="summary-icon-wrapper summary-icon-completed">
            <CheckCircle2 size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summaryStats.completed}</span>
            <span className="summary-label">Concluídos</span>
          </div>
        </div>
        <div className="summary-card summary-late">
          <div className="summary-icon-wrapper summary-icon-late">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summaryStats.late}</span>
            <span className="summary-label">Atrasados</span>
          </div>
        </div>
      </div>

      {/* ===== Header ===== */}
      <div className="projetos-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-projects"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="filter-dropdown-wrapper">
            <button
              className={`toolbar-btn ${filterStatus !== 'all' ? 'active' : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              id="filter-projects"
            >
              <Filter size={16} />
              <span>{filterOptions.find((f) => f.value === filterStatus)?.label}</span>
              <ChevronDown size={14} className={`chevron ${isFilterOpen ? 'open' : ''}`} />
            </button>
            {isFilterOpen && (
              <>
                <div className="filter-backdrop" onClick={() => setIsFilterOpen(false)} />
                <div className="filter-dropdown">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-option ${filterStatus === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        setFilterStatus(opt.value);
                        setIsFilterOpen(false);
                      }}
                    >
                      <span className="filter-dot" style={{ backgroundColor: opt.color }} />
                      {opt.label}
                      {filterStatus === opt.value && <CheckCircle2 size={14} className="filter-check" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
              id="view-grid"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              id="view-list"
            >
              <List size={18} />
            </button>
          </div>
          <button className="btn-primary btn-novo" onClick={handleOpenCreate} id="btn-new-project">
            <Plus size={18} />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* ===== Projects Grid / List ===== */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} strokeWidth={1.2} />
          <h3>Nenhum projeto encontrado</h3>
          <p>
            {searchQuery || filterStatus !== 'all'
              ? 'Tente ajustar sua busca ou filtros'
              : 'Comece criando seu primeiro projeto'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={18} /> Criar Primeiro Projeto
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'projetos-grid' : 'projetos-list'}>
          {filteredProjects.map((proj: any, index: number) => {
            const deadline = getDeadlineInfo(proj);
            const effectiveStatus = getEffectiveStatus(proj);
            const taskInfo = getProjectTasks(proj.id);
            const progressColor =
              proj.progress === 100
                ? 'var(--success)'
                : proj.progress > 0
                ? 'var(--accent)'
                : 'var(--border)';
            const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
              Concluído: { bg: 'var(--success-light)', text: 'var(--success)', label: 'Concluído' },
              Atrasado: { bg: 'var(--danger-light)', text: 'var(--danger)', label: 'Atrasado' },
              'Em andamento': { bg: 'var(--accent-light)', text: 'var(--accent)', label: 'Em andamento' },
            };
            const statusStyle = statusConfig[effectiveStatus] || statusConfig['Em andamento'];

            return (
              <div
                className={`projeto-card ${viewMode === 'list' ? 'projeto-card-list' : ''}`}
                key={proj.id}
                style={{ animationDelay: `${index * 0.06}s`, cursor: 'pointer' }}
                onClick={() => navigate('/projetos/' + proj.id)}
              >
                {/* Status indicator line */}
                <div
                  className="projeto-status-line"
                  style={{ backgroundColor: statusStyle.text }}
                />

                <div className="projeto-card-body">
                  {/* Tier 1: Title Area */}
                  <div className="projeto-title-row">
                    <div className="projeto-title-wrapper">
                      <h3>{proj.name}</h3>
                      <div className="projeto-badges" style={{ marginTop: '4px' }}>
                        <span
                          className="badge-status"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                        <span className={`badge badge-${proj.difficulty.toLowerCase()}`}>
                          {proj.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <div className="projeto-menu-wrapper">
                      <button
                        className="projeto-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === proj.id ? null : proj.id);
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {openMenuId === proj.id && (
                        <>
                          <div className="menu-backdrop" onClick={() => setOpenMenuId(null)} />
                          <div className="projeto-context-menu">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(proj); }}><Edit3 size={14} /> Editar</button>
                            <button className="menu-danger" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(proj.id); setOpenMenuId(null); }}><Trash2 size={14} /> Excluir</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tier 2: Description */}
                  <div className="projeto-subtitle">
                    {proj.description || '\u00A0'}
                  </div>

                  {/* Tier 3: Progress */}
                  <div className="projeto-progress-section" style={{ marginTop: 'auto' }}>
                    <div className="progress-labels">
                      <span>Progresso</span>
                      <span className="progress-value">{proj.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${proj.progress}%`, backgroundColor: progressColor }} />
                    </div>
                  </div>

                  {/* Tier 4: Stats */}
                  <div className="projeto-stats">
                    <div className="stat-item">
                      <CheckCircle2 size={16} className="stat-icon text-accent" />
                      <div className="stat-text">
                        <span className="stat-label">Tarefas</span>
                        <strong>{taskInfo.completed}/{taskInfo.total}</strong>
                      </div>
                    </div>
                    <div className="stat-item">
                      <Clock size={16} className={`stat-icon ${deadline.isLate ? 'text-danger' : 'text-accent'}`} />
                      <div className="stat-text">
                        <span className="stat-label">Prazo</span>
                        <strong className={deadline.isLate ? 'text-danger' : 'text-primary'}>{deadline.label}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tier 5: Footer */}
                  <div className="projeto-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <div className="projeto-date" style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '20px', color: 'var(--text-tertiary)' }}>
                      <CalendarDays size={14} />
                      <span style={{ fontSize: '12px' }}>
                        {proj.startDate || '--'} — {proj.endDate || '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Create / Edit Modal ===== */}
      {isModalOpen && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-name">Nome do Projeto *</label>
                  <input
                    type="text"
                    id="project-name"
                    placeholder="Digite o nome do projeto"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="project-difficulty">Dificuldade</label>
                  <select
                    id="project-difficulty"
                    value={formData.difficulty}
                    onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="project-desc">Descrição</label>
                <textarea
                  id="project-desc"
                  placeholder="Descreva os objetivos e detalhes do projeto"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-start">Data de Início</label>
                  <input
                    type="date"
                    id="project-start"
                    value={toDateInputFormat(formData.startDate)}
                    onChange={(e) => handleFieldChange('startDate', toDisplayFormat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="project-end">Data de Término</label>
                  <input
                    type="date"
                    id="project-end"
                    value={toDateInputFormat(formData.endDate)}
                    onChange={(e) => handleFieldChange('endDate', toDisplayFormat(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fotos / Anexos do Projeto</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div 
                    className="upload-box" 
                    onClick={() => document.getElementById('project-files')?.click()}
                  >
                    <UploadCloud size={24} />
                    <span>Adicionar</span>
                    <input 
                      type="file" 
                      id="project-files" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                    />
                  </div>
                  {formData.files.length > 0 && (
                    <div className="files-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
                      {formData.files.map((f, i) => (
                        <div key={i} className="file-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)} style={{ color: 'var(--danger)', marginLeft: '8px' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="docs-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Links de Documentação</span>
                  <button type="button" className="btn-outline" onClick={handleAddLink}>
                    <Plus size={16} /> Adicionar Link
                  </button>
                </div>
                {formData.links.length > 0 && (
                  <div className="links-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.links.map((link, i) => (
                      <div key={i} className="link-item" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          placeholder="Título (Ex: Figma)" 
                          value={link.title} 
                          onChange={(e) => updateLink(i, 'title', e.target.value)} 
                          style={{ flex: 1 }}
                        />
                        <input 
                          type="text" 
                          placeholder="URL (Ex: https://...)" 
                          value={link.url} 
                          onChange={(e) => updateLink(i, 'url', e.target.value)} 
                          style={{ flex: 2 }}
                        />
                        <button type="button" className="btn-secondary" onClick={() => removeLink(i)} style={{ padding: '0.6rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteConfirm !== null && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null);
          }}
        >
          <div className="modal-content modal-delete-confirm">
            <div className="delete-confirm-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={32} />
              </div>
              <h3>Excluir Projeto</h3>
              <p>
                Tem certeza que deseja excluir{' '}
                <strong>
                  {projects.find((p: any) => p.id === deleteConfirm)?.name}
                </strong>
                ? Todas as tarefas associadas serão removidas. Esta ação não pode ser desfeita.
              </p>
              <div className="delete-confirm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleConfirmDelete(deleteConfirm)}
                >
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
