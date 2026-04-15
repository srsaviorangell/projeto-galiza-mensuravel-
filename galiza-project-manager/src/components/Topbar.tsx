import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, User, Moon, Sun, Menu, X, LogOut, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../App';
import './Topbar.css';

interface Notification {
  id: number;
  type: 'task' | 'alert' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function Topbar() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { isAdmin, currentUser, tasks, projects, users, logout } = useApp();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('galiza_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    localStorage.setItem('galiza_theme', newMode ? 'dark' : 'light');
  };

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const now = new Date();
    
    tasks.forEach(task => {
      if (task.assigneeId === currentUser?.id || isAdmin) {
        if (task.priority === 'Urgente' && task.status !== 'Concluída') {
          notifs.push({
            id: task.id + 1000,
            type: 'alert',
            title: 'Tarefa Urgente',
            message: `${task.title || task.name} está marcada como urgente`,
            timestamp: now,
            read: false
          });
        }
        
        if (task.dueDate) {
          const [day, month, year] = task.dueDate.split('/');
          const dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 2 && diffDays >= 0 && task.status !== 'Concluída') {
            notifs.push({
              id: task.id + 2000,
              type: 'task',
              title: 'Prazo Próximo',
              message: `${task.title || task.name} vence em ${diffDays} dia(s)`,
              timestamp: now,
              read: false
            });
          }
        }
        
        if (task.status === 'Concluída' && task.executions && task.executions.length > 0) {
          const lastExec = task.executions[task.executions.length - 1];
          const execDate = new Date(lastExec.timestamp || lastExec.data);
          const hoursDiff = (now.getTime() - execDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff <= 24) {
            notifs.push({
              id: task.id + 3000,
              type: 'success',
              title: 'Tarefa Concluída',
              message: `${task.title || task.name} foi finalizada`,
              timestamp: execDate,
              read: false
            });
          }
        }
      }
    });

    if (isAdmin) {
      const unassigned = tasks.filter(t => !t.assigneeId && t.status !== 'Concluída');
      if (unassigned.length > 0) {
        notifs.push({
          id: 9999,
          type: 'alert',
          title: 'Tarefas Sem Responsável',
          message: `${unassigned.length} tarefa(s) precisam de responsável`,
          timestamp: now,
          read: false
        });
      }
    }

    return notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }, [tasks, currentUser, isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Projetos', path: '/projetos' },
    { name: 'Tarefas', path: '/tarefas' },
    { name: 'Usuários', path: '/usuarios', adminOnly: true },
    { name: 'Colaboradores', path: '/colaboradores', adminOnly: true },
    { name: 'Admin', path: '/admin', adminOnly: true }
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={16} />;
      case 'success': return <CheckCircle2 size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'alert': return 'var(--danger)';
      case 'success': return 'var(--success)';
      default: return 'var(--accent)';
    }
  };

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
        {filteredNavItems.map((item) => (
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
        <div className="notification-wrapper" ref={notifRef}>
          <button 
            className="action-button icon-btn"
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Notificações</h4>
                <span className="notification-count">{notifications.length} itens</span>
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <Bell size={32} />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="notification-item">
                      <div 
                        className="notification-icon"
                        style={{ color: getNotificationColor(notif.type) }}
                      >
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="notification-content">
                        <span className="notification-title">{notif.title}</span>
                        <span className="notification-message">{notif.message}</span>
                        <span className="notification-time">
                          {notif.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-menu-wrapper" ref={userRef}>
          <button 
            className="action-button icon-btn"
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
          >
            <User size={20} />
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="user-avatar">{currentUser?.name?.charAt(0) || 'U'}</div>
                <div className="user-details">
                  <span className="user-name">{currentUser?.name}</span>
                  <span className="user-role">{currentUser?.role}</span>
                </div>
              </div>
              <div className="user-menu-items">
                <button onClick={toggleTheme}>
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>
                <button onClick={handleLogout} className="logout-btn">
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="action-button icon-btn" onClick={toggleTheme}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button 
          className="action-button icon-btn mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
            {filteredNavItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
              >
                {item.name}
              </NavLink>
            ))}
            <button className="nav-link" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
               Sair
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}