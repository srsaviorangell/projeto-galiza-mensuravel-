import React, { useState } from 'react';
import { CheckCircle2, Clock, CalendarDays, UploadCloud, X, Plus } from 'lucide-react';

export default function Projetos() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const projetos = [
    {
      id: 1,
      title: 'ATIVIDADE AVULSA INFRA',
      subtitle: '',
      difficulty: 'Difícil',
      progress: 0,
      tasks_completed: 0,
      tasks_total: 1,
      time_left: '262d',
      status: 'pending',
      date_range: '01/01/26 - 01/01/27'
    },
    {
      id: 2,
      title: 'JARDIM BRASIL',
      subtitle: 'LANCAMENTETO DE REDE PARA CONDOMINIO PROXIMO AO VIDA BELA',
      difficulty: 'Médio',
      progress: 0,
      tasks_completed: 0,
      tasks_total: 2,
      time_left: 'Atrasado',
      status: 'late',
      date_range: '27/03/26 - 28/03/26'
    },
    {
      id: 3,
      title: 'PDN REDE 09/10/11/12',
      subtitle: 'projeto. da concepção ate a implementação',
      difficulty: 'Médio',
      progress: 88,
      tasks_completed: 30,
      tasks_total: 34,
      time_left: 'Atrasado',
      status: 'late',
      date_range: '01/07/25 - 31/03/26'
    },
    {
      id: 4,
      title: 'Projeto Povoados de P. Dutra',
      subtitle: 'Migração de rede via rádio para 100% fibra óptica.',
      difficulty: 'Médio',
      progress: 100,
      tasks_completed: 1,
      tasks_total: 1,
      time_left: 'Atrasado',
      status: 'late',
      date_range: '01/07/25 - 31/03/26'
    }
  ];

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h2>Projetos</h2>
          <p>Gerencie todos os seus projetos em um só lugar</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span className="plus-icon">+</span> Novo Projeto
        </button>
      </div>
      
      <div className="grid-container">
        {projetos.map(proj => (
          <div className="card projeto-card" key={proj.id}>
            <div className="projeto-header">
              <div className="projeto-title-wrapper">
                <h3>{proj.title}</h3>
                {proj.subtitle && <span className="projeto-subtitle">{proj.subtitle}</span>}
              </div>
              <span className={`badge badge-${proj.difficulty.toLowerCase()}`}>
                {proj.difficulty}
              </span>
            </div>
            
            <div className="projeto-progress-section">
              <div className="progress-labels">
                <span>Progresso</span>
                <span className="progress-value">{proj.progress}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${proj.progress}%`, backgroundColor: proj.progress > 0 ? (proj.progress === 100 ? 'var(--success)' : 'var(--accent)') : 'transparent' }}
                ></div>
              </div>
            </div>

            <div className="projeto-stats">
              <div className="stat-item">
                <CheckCircle2 size={16} className="stat-icon text-accent" />
                <div className="stat-text">
                  <span className="stat-label">Tarefas</span>
                  <strong>{proj.tasks_completed}/{proj.tasks_total}</strong>
                </div>
              </div>
              <div className="stat-item">
                <Clock size={16} className={`stat-icon ${proj.status === 'late' ? 'text-danger' : 'text-accent'}`} />
                <div className="stat-text">
                  <span className="stat-label">Prazo</span>
                  <strong className={proj.status === 'late' ? 'text-danger' : 'text-primary'}>
                    {proj.time_left}
                  </strong>
                </div>
              </div>
            </div>
            
            <div className="projeto-footer">
              <CalendarDays size={14} className="text-tertiary" />
              <span>{proj.date_range}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Novo Projeto</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Nome do Projeto *</label>
                  <input type="text" placeholder="Digite o nome do projeto" />
                </div>
                <div className="form-group">
                  <label>Dificuldade</label>
                  <select defaultValue="Médio">
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea placeholder="Descreva os objetivos e detalhes do projeto"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data de Início *</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>Data de Término *</label>
                  <input type="date" />
                </div>
              </div>

              <div className="form-group">
                <label>Fotos do Projeto</label>
                <div className="upload-box">
                  <UploadCloud size={24} />
                  <span>Adicionar</span>
                </div>
              </div>

              <div className="docs-section">
                <span>Links de Documentação</span>
                <button className="btn-outline">
                  <Plus size={16} /> Adicionar Link
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => setIsModalOpen(false)}>Criar Projeto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
