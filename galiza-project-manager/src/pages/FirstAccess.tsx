import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Briefcase, Shield, AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AuthContext';
import './Login.css';
import logoIcon from '../assets/logos/logo-icon.png';

export default function FirstAccess() {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { completeProfile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('currentUser');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user && !storedUser) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }

    setIsLoading(true);

    const result = await completeProfile({
      name: name.trim(),
      specialty: specialty.trim(),
      phone: phone.trim()
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setError(result.error || 'Erro ao salvar');
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-backdrop"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img src={logoIcon} alt="Galiza Logo" className="login-g-logo" />
          </div>
          <h1>Completar Cadastro</h1>
          <p>Informe seus dados para continuar</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={64} className="success-icon" />
            <h2>Cadastro Completo!</h2>
            <p>Redirecionando para o dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="first-access-info">
              <Shield size={24} />
              <p>
                Complete suas informações para acessar o sistema.
                Estes dados são importantes para identificação e permissões.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="name">
                <User size={16} /> Nome Completo
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex: Técnico de Campo, Engenheiro, etc."
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} /> Telefone / Celular
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Completar Cadastro'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}