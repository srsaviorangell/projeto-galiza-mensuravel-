import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import Projetos from './pages/Projetos';
import './app.css';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>Esta página ainda está em construção (Fase 4)</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Topbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/tarefas" element={<PlaceholderPage title="Tarefas" />} />
            <Route path="/usuarios" element={<PlaceholderPage title="Gerenciamento de Usuários" />} />
            <Route path="/colaboradores" element={<PlaceholderPage title="Colaboradores" />} />
            <Route path="/admin" element={<PlaceholderPage title="Painel Administrativo" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
