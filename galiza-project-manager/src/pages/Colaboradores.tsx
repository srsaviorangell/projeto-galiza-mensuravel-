/* src/pages/Colaboradores.tsx */
import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { 
  Users, MapPin, Clock, Calendar, 
  Map as MapIcon, ShieldAlert, 
  ExternalLink, UserCheck, Activity,
  Database, X, TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Colaboradores.css';

export default function Colaboradores() {
  const { tasks, projects, users, isAdmin } = useContext(AppContext);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);

  // Bloqueio de Segurança
  if (!isAdmin) {
    return (
      <div className="dashboard-container animate-fadeIn">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--danger)' }}>
             <ShieldAlert size={48} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 10px' }}>Acesso Restrito</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>Apenas administradores e sudo podem monitorar a localização e atividades em tempo real da equipe.</p>
          </div>
        </div>
      </div>
    );
  }

  // Agrega todas as execuções de todas as tarefas em uma única timeline cronológica
  const allActivities = useMemo(() => {
    const activities: any[] = [];
    
    tasks.forEach(task => {
      if (task.executions && Array.isArray(task.executions)) {
        task.executions.forEach(exec => {
          activities.push({
            ...exec,
            taskTitle: task.title || task.name,
            projectId: task.projectId,
            projectName: projects.find(p => p.id === task.projectId)?.name || 'Tarefa Avulsa',
            measurementType: task.measurementType
          });
        });
      }
    });

    // Ordena por data (mais recente primeiro)
    return activities.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.data).getTime();
      const dateB = new Date(b.timestamp || b.data).getTime();
      return dateB - dateA;
    });
  }, [tasks, projects]);

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const activeToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return new Set(allActivities.filter(a => a.data === today).map(a => a.colaboradorId)).size;
  }, [allActivities]);

  const collabChartData = useMemo(() => {
    if (!selectedCollab) return [];
    
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dailyActivities = allActivities.filter(a => String(a.colaboradorId) === String(selectedCollab.id) && a.data === dateString);
      const sum = dailyActivities.reduce((acc, curr) => acc + (Number(curr.quantidade) || 1), 0);
      
      data.push({
        date: dateString.split('-').reverse().slice(0,2).join('/'),
        producao: sum
      });
    }
    return data;
  }, [selectedCollab, allActivities]);

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Monitoramento de Equipe</h1>
          <p className="dashboard-subtitle">Acompanhe em tempo real os lançamentos e localizações da equipe de campo.</p>
        </div>
        <div className="dashboard-date">
          <Calendar size={16} />
          <span>
             {new Date().toLocaleDateString('pt-BR', { 
               weekday: 'long', 
               day: 'numeric', 
               month: 'long',
               year: 'numeric'
             })}
          </span>
        </div>
      </div>

      <div className="monitoring-grid">
        {/* Coluna Central: Feed de Atividades */}
        <div className="activity-feed-card">
          <div className="section-title">
             <Activity size={20} />
             Atividade em Tempo Real
          </div>

          <div className="timeline">
            {allActivities.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                 <Database size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                 <p>Nenhuma atividade registrada no sistema ainda.</p>
              </div>
            ) : (
              allActivities.map((activity, idx) => {
                const collab = users.find(u => String(u.id) === String(activity.colaboradorId));
                return (
                  <div key={activity.id || idx} className="timeline-item">
                    <div className="timeline-icon">
                      {activity.location ? <MapPin size={18} /> : <UserCheck size={18} />}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="collab-name">{collab?.name || 'Colaborador desconhecido'}</span>
                        <span className="activity-time">
                          <Clock size={12} style={{ marginRight: '4px' }} />
                          {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : activity.data}
                        </span>
                      </div>
                      <div className="activity-desc">
                        Registrou a produção de <strong>{activity.quantidade} {activity.measurementType}</strong> na tarefa <strong>{activity.taskTitle}</strong>.
                      </div>
                      <div className="activity-meta">
                        <span className="meta-badge meta-project">
                           {activity.projectName}
                        </span>
                        {activity.location && (
                          <span className="meta-badge meta-location" onClick={() => openInMaps(activity.location.lat, activity.location.lng)}>
                             <MapIcon size={12} /> Ver Localização
                             <ExternalLink size={10} style={{ marginLeft: '4px' }} />
                          </span>
                        )}
                        {activity.observacao && (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', display: 'block', width: '100%', marginTop: '5px' }}>
                            "{activity.observacao}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Lateral: Analytics e Equipe */}
        <div className="collab-stats-sidebar">
          <div className="mini-stat-card">
             <div className="mini-stat-header">
                <Users size={16} /> Total de Colaboradores
             </div>
             <div className="mini-stat-value">{users.length}</div>
          </div>

          <div className="mini-stat-card">
             <div className="mini-stat-header" style={{ color: '#10b981' }}>
                <Activity size={16} /> Ativos Hoje
             </div>
             <div className="mini-stat-value">{activeToday}</div>
          </div>

          <div className="activity-feed-card" style={{ gap: '1rem' }}>
             <div className="section-title" style={{ fontSize: '15px' }}>
                Equipe de Campo
             </div>
             <div className="active-users-list">
                {users.map(c => {
                  const hasActivityToday = allActivities.some(a => String(a.colaboradorId) === String(c.id) && a.data === new Date().toISOString().split('T')[0]);
                  return (
                    <div key={c.id} className="active-user-item clickable-user" onClick={() => setSelectedCollab(c)}>
                       <div className={`user-status-dot ${hasActivityToday ? 'online' : 'offline'}`}></div>
                       <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, flex: 1 }}>{c.name}</span>
                       <TrendingUp size={14} className="user-chart-icon" />
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      </div>

      {/* Chart Modal */}
      {selectedCollab && (
        <div className="chart-modal-overlay animate-fadeIn" onClick={() => setSelectedCollab(null)}>
          <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <div>
                <h2>Desempenho: {selectedCollab.name}</h2>
                <p>Volume de produções nos últimos 30 dias</p>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedCollab(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collabChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-tertiary)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="var(--text-tertiary)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(26, 30, 41, 0.85)', 
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 97, 48, 0.2)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      color: 'var(--text-primary)'
                    }}
                    itemStyle={{ color: 'var(--accent-orange)', fontWeight: 800 }}
                    labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="producao" 
                    name="Produção"
                    stroke="var(--accent-orange)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--bg-main)', stroke: 'var(--accent-orange)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent-orange)', strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
