import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Phone, Shield, AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { verifyInvite, acceptInvite } from '../lib/auth';
import './Login.css';
import logoIcon from '../assets/logos/logo-icon.png';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token de convite inválido');
        setLoading(false);
        return;
      }

      const result = await verifyInvite(token);
      
      if (result.valid) {
        setInvite(result.invite);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    const result = await acceptInvite(token, { password: formData.password, name: formData.name, specialty: formData.specialty, phone: formData.phone });

    if (result.success) {
      setStep(2);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (loading && !invite) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Verificando convite...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="error-state">
            <AlertCircle size={64} className="error-icon" />
            <h2>Convite Inválido</h2>
            <p>{error}</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="success-message">
            <CheckCircle size={64} className="success-icon" />
            <h2>Bem-vindo à Galiza!</h2>
            <p>Seu cadastro foi realizado com sucesso.</p>
            <p className="success-subtitle">Redirecionando para o login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-backdrop"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img src={logoIcon} alt="Galiza Logo" className="login-g-logo" />
          </div>
          <h1>Convite Galiza</h1>
          <p>Complete seu cadastro para acessar</p>
        </div>

        <div className="invite-info">
          <Shield size={32} />
          <h3>Convite Confirmado</h3>
          <p>Você foi convidado para participar do sistema Galiza como:</p>
          <div className="invite-role-badge">
            <Crown size={16} />
            {invite.role === 'admin' ? 'Administrador' : 'Colaborador'}
          </div>
          <p className="invite-email">{invite.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">
              <User size={16} /> Nome Completo
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seu nome completo"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialty">
              <Briefcase size={16} /> Cargo / Especialidade
            </label>
            <input
              type="text"
              id="specialty"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              placeholder="Ex: Técnico de Campo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              <Phone size={16} /> Telefone
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} /> Senha
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Crie sua senha de acesso"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={16} /> Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirme sua senha"
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Aceitar Convite e Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
