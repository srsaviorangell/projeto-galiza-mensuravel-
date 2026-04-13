import { NavLink } from 'react-router-dom';
import { Bell, User, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Navbar.css';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/projetos', label: 'Projetos' },
  { path: '/tarefas', label: 'Tarefas' },
  { path: '/usuarios', label: 'Usuários' },
  { path: '/colaboradores', label: 'Colaboradores' },
  { path: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { stats } = useApp();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" />
          </svg>
        </div>
        <div className="navbar-brand-text">
          <h1>Galiza</h1>
          <span>Gestão de Projetos</span>
        </div>
      </div>

      <div className="navbar-links">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `navbar-link ${isActive ? 'active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-actions">
        <button className="navbar-action-btn" title="Notificações">
          <Bell size={18} />
          {stats.urgentTasks > 0 && (
            <span className="notification-badge">{stats.urgentTasks}</span>
          )}
        </button>
        <button className="navbar-action-btn" title="Perfil">
          <User size={18} />
        </button>
        <button className="navbar-action-btn" title="Configurações">
          <Settings size={18} />
        </button>
      </div>
    </nav>
  );
}
