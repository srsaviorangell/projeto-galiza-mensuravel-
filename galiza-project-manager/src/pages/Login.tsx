import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Mail, Lock, Crown } from 'lucide-react';
import './Login.css';
import logoIcon from '../assets/logos/logo-icon.png';

const SUPABASE_URL = 'https://dgqmnzkauhpkpzhrnwlb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncW1uemthdWhwa3B6aHJud2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA0MTUsImV4cCI6MjA5MTczNjQxNX0.70a3IAwNlHJOnpKrzfsafDUNjtNfnPyScjKBkiQrpJE';

const COMMERCIAL_DOMAIN = '@galizanet.com.br';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const validateEmail = (email) => {
    if (!email.toLowerCase().endsWith(COMMERCIAL_DOMAIN)) {
      setError(`Apenas emails ${COMMERCIAL_DOMAIN} são permitidos`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      const users = await response.json();
      console.log('Resposta:', users);

      if (!users || users.length === 0) {
        setError('Usuário não encontrado');
        setIsLoading(false);
        return;
      }

      const user = users[0];

      if (user.password !== password) {
        setError('Senha incorreta');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError('Erro ao fazer login: ' + err.message);
      setIsLoading(false);
    }
  };

  const handleFirstAccessSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    
    try {
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      const existingUsers = await checkResponse.json();
      
      if (existingUsers && existingUsers.length > 0) {
        setError('Email já cadastrado. Faça login normal.');
        setIsLoading(false);
        return;
      }

      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/users`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password: password,
            name: email.split('@')[0],
            role: 'user',
            first_access: true,
            status: 'Ativo'
          })
        }
      );

      if (!insertResponse.ok) {
        throw new Error('Erro ao criar usuário');
      }

      const newUser = {
        email: email.toLowerCase(),
        password: password,
        name: email.split('@')[0],
        role: 'user',
        first_access: true
      };

      localStorage.setItem('currentUser', JSON.stringify(newUser));
      navigate('/first-access', { state: { email } });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-backdrop"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img src={logoIcon} alt="Galiza Logo" className="login-g-logo" />
          </div>
          <h1>Galiza</h1>
          <p>Gestão de Atividades</p>
        </div>

        {!isFirstAccessMode ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="login-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={16} /> E-mail Corporativo
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`seu.nome${COMMERCIAL_DOMAIN}`}
                  required
                />
                <span className="form-hint">
                  Apenas emails {COMMERCIAL_DOMAIN} são permitidos
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={16} /> Senha
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            

            <div className="login-footer">
              <p>
                Primeiro acesso?{' '}
                <button 
                  className="link-btn"
                  onClick={() => setIsFirstAccessMode(true)}
                >
                  Cadastrar
                </button>
              </p>
              <p className="admin-notice">
                <Crown size={14} />
                Acesso restrito a colaboradores Galiza
              </p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleFirstAccessSubmit} className="login-form">
              {error && (
                <div className="login-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="first-access-notice">
                <Shield size={32} />
                <h3>Primeiro Acesso</h3>
                <p>
                  Cadastre-se com seu email corporativo para acessar o sistema.
                  Após o cadastro, você deverá completar suas informações.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={16} /> E-mail Corporativo
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`seu.nome${COMMERCIAL_DOMAIN}`}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={16} /> Senha Provisória
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha provisória"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="form-hint">
                  Você poderá alterar a senha após completar o cadastro
                </span>
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </form>

            <div className="login-footer">
              <p>
                Já tem conta?{' '}
                <button 
                  className="link-btn"
                  onClick={() => setIsFirstAccessMode(false)}
                >
                  Fazer Login
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
