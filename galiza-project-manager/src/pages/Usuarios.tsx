import { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Edit3,
  X,
  Key,
  Mail,
  User,
  AlertTriangle,
  Crown,
  LogOut,
  Phone,
  BadgeCheck,
  Briefcase,
  Calendar,
  Copy,
  Send,
  Check
} from 'lucide-react';
import { AppContext } from '../context/AuthContext';
import './Usuarios.css';

const COMMERCIAL_DOMAIN = '@galizanet.com.br';

export default function Usuarios() {
  const { users, currentUser, isAdmin, addUser, updateUser, deleteUser, createInvite } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', role: 'user' });
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    specialty: '',
    status: 'Ativo'
  });

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      role: 'user',
      phone: '',
      specialty: '',
      status: 'Ativo'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      phone: user.phone || '',
      specialty: user.specialty || '',
      status: user.status || 'Ativo'
    });
    setIsModalOpen(true);
  };

  const validateEmailDomain = (email) => {
    if (!email.toLowerCase().endsWith(COMMERCIAL_DOMAIN)) {
      alert(`Apenas emails ${COMMERCIAL_DOMAIN} são permitidos`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    if (!validateEmailDomain(formData.email)) {
      return;
    }

    try {
      if (editingUser) {
        const updates = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          specialty: formData.specialty,
          status: formData.status
        };
        if (formData.password) {
          updates.password = formData.password;
        }
        await updateUser(editingUser, updates);
      } else {
        if (!formData.password) {
          return;
        }
        const result = await addUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          specialty: formData.specialty,
          status: formData.status,
          created_at: new Date().toISOString()
        });
        
        if (result.success && result.tempPassword) {
          alert(`Usuário criado! Senha provisória: ${result.tempPassword}\n\nEnvie o link de acesso: ${result.inviteLink}`);
        }
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'user' });
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleOpenInvite = () => {
    setInviteData({ email: '', role: 'user' });
    setInviteLink('');
    setInviteCopied(false);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    if (!validateEmailDomain(inviteData.email)) {
      return;
    }

    const result = await createInvite(inviteData.email, inviteData.role);
    
    if (result.success) {
      setInviteLink(result.link);
    } else {
      alert(result.error);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleConfirmDelete = async (id) => {
    try {
      const result = await deleteUser(id);
      if (result.success) {
        setDeleteConfirm(null);
      } else {
        alert("Erro ao excluir usuário: " + result.error);
        console.error('Erro ao excluir usuário:', result.error);
      }
    } catch (error: any) {
      console.error('Erro ao excluir usuário exception:', error);
      alert("Erro inexperado ao excluir: " + error.message);
    }
  };

  const toggleRole = async (user) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateUser(user.id, { role: newRole });
    } catch (error: any) {
      console.error('Erro ao alterar permissão:', error);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'sudo':
        return { label: 'Sudo', class: 'sudo' };
      case 'admin':
        return { label: 'Admin', class: 'admin' };
      default:
        return { label: 'Usuário', class: 'user' };
    }
  };

  useEffect(() => {
    if (isModalOpen || deleteConfirm !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, deleteConfirm]);

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="access-denied">
          <Shield size={64} />
          <h2>Acesso Restrito</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Gerenciamento de Usuários</h1>
          <p className="dashboard-subtitle">Gerencie acessos e permissões do sistema</p>
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
          <button className="btn-secondary" onClick={handleOpenInvite}>
            <Send size={18} />
            <span>Enviar Convite</span>
          </button>
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Cadastrar Usuário</span>
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total de Usuários</span>
          </div>
        </div>
      </div>

      <div className="usuarios-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="usuarios-table">
        <div className="table-header">
          <div className="col-user">Usuário</div>
          <div className="col-email">Contato</div>
          <div className="col-role">Função / Cargo</div>
          <div className="col-actions">Ações</div>
        </div>
        <div className="table-body">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const roleInfo = getRoleBadge(user.role);
              return (
                <div key={user.id} className="table-row">
                  <div className="col-user">
                    <div className="user-avatar">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.name}</span>
                      {user.id === currentUser?.id && (
                        <span className="you-badge">Você</span>
                      )}
                    </div>
                  </div>
                  <div className="col-email" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <Mail size={12} /> <span style={{ fontSize: '13px' }}>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)' }}>
                         <Phone size={12} /> <span style={{ fontSize: '12px' }}>{user.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-role" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`role-badge ${roleInfo.class}`}>
                        {roleInfo.label === 'Sudo' && <Crown size={12} />}
                        {roleInfo.label === 'Admin' && <Shield size={12} />}
                        {roleInfo.label}
                      </span>
                      {user.status === 'Ativo' && <span className="role-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Ativo</span>}
                    </div>
                    {user.specialty && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{user.specialty}</span>}
                  </div>
                  <div className="col-actions">
                    {user.role !== 'sudo' && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => toggleRole(user)}
                          title={user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                        >
                          {user.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleOpenEdit(user)}
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            className="action-btn danger"
                            onClick={() => setDeleteConfirm(user.id)}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label><User size={14} /> Nome</label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label><Mail size={14} /> E-mail</label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label><Key size={14} /> {editingUser ? 'Nova Senha (opcional)' : 'Senha'}</label>
                <input
                  type="password"
                  placeholder={editingUser ? 'Deixe vazio para manter a mesma' : 'Senha de acesso'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label><Shield size={14} /> Função</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><BadgeCheck size={14} /> Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Ferias">Em Férias</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label><Phone size={14} /> Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label><Briefcase size={14} /> Cargo / Especialidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Técnico de Campo"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsInviteModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Enviar Convite</h3>
              <button className="modal-close" onClick={() => setIsInviteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="invite-info-box">
                <Mail size={32} />
                <h4>Convite por Email</h4>
                <p>
                  Envie um convite para um novo colaborador. 
                  O link de acesso será enviado para o email corporativo.
                </p>
              </div>

              <div className="form-group">
                <label><Mail size={14} /> E-mail Corporativo</label>
                <input
                  type="email"
                  placeholder={`nome${COMMERCIAL_DOMAIN}`}
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                />
                <span className="form-hint">
                  Apenas emails {COMMERCIAL_DOMAIN} são permitidos
                </span>
              </div>

              <div className="form-group">
                <label><Shield size={14} /> Função</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                >
                  <option value="user">Usuário Comum</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {!inviteLink ? (
                <button 
                  className="btn-primary" 
                  onClick={handleSendInvite}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  <Send size={16} />
                  Gerar Link de Convite
                </button>
              ) : (
                <div className="invite-link-box">
                  <p className="invite-success">
                    <Check size={16} />
                    Convite gerado com sucesso!
                  </p>
                  <p className="invite-instructions">
                    Copie o link abaixo e envie por email para o colaborador:
                  </p>
                  <div className="invite-link-display">
                    <code>{inviteLink}</code>
                    <button 
                      className="btn-icon"
                      onClick={copyInviteLink}
                      title="Copiar link"
                    >
                      {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  {inviteCopied && (
                    <p className="copy-success">Link copiado!</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsInviteModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal-content modal-delete-confirm">
            <div className="delete-confirm-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={32} />
              </div>
              <h3>Excluir Usuário</h3>
              <p>
                Tem certeza que deseja excluir o usuário{' '}
                <strong>{users.find(u => u.id === deleteConfirm)?.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="delete-confirm-actions">
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancelar
                </button>
                <button className="btn-danger" onClick={() => handleConfirmDelete(deleteConfirm)}>
                  <Trash2 size={16} /> Excluir
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