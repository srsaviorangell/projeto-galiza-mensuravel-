import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Projetos from './pages/Projetos';
import ProjetoDetalhes from './pages/ProjetoDetalhes';
import Tarefas from './pages/Tarefas';
import Usuarios from './pages/Usuarios';
import Colaboradores from './pages/Colaboradores';
import Login from './pages/Login';
import FirstAccess from './pages/FirstAccess';
import InvitePage from './pages/InvitePage';
import Admin from './pages/Admin';
import { AppProvider, AppContext, useApp } from './context/AuthContext';
import './app.css';

export { AppContext, useApp };

function ProtectedLayout() {
  const { currentUser, isLoading, isFirstAccess } = useApp();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', background: '#0f172a' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#FF5E2A', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8' }}>Carregando dados do sistema...</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ marginTop: '20px', padding: '8px 16px', background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}
        >
          Recarregar Página
        </button>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (isFirstAccess) {
    return <Navigate to="/first-access" replace />;
  }
  
  return (
    <div className="app-container">
      <Topbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/first-access" element={<FirstAccess />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;