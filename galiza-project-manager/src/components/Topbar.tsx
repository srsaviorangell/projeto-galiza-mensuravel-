import { NavLink } from 'react-router-dom';
import { Bell, User, Moon } from 'lucide-react';
import './Topbar.css';

export default function Topbar() {
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Projetos', path: '/projetos' },
    { name: 'Tarefas', path: '/tarefas' },
    { name: 'Usuários', path: '/usuarios' },
    { name: 'Colaboradores', path: '/colaboradores' },
    { name: 'Admin', path: '/admin' }
  ];

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <div className="logo-icon-wrapper">
          <img src="/logo.png" alt="Galiza Logo" width="40" height="40" className="img-logo" />
        </div>
        <div className="logo-text">
          <h1>Galiza</h1>
          <span>Gestão de Projetos</span>
        </div>
      </div>
      
      <nav className="topbar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-actions">
        <button className="action-button icon-btn">
          <div className="notification-badge">42</div>
          <Bell size={20} />
        </button>
        <button className="action-button icon-btn">
          <User size={20} />
        </button>
        <button className="action-button icon-btn">
          <Moon size={20} />
        </button>
      </div>
    </header>
  );
}
