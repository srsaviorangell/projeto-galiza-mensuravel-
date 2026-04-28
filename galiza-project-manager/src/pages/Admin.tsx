import { useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, Users, TrendingUp, AlertTriangle, 
  BarChart3, FileText, X, Download, Calendar,
  CheckCircle2, Clock, User, Plus, Settings, ArrowUpRight
} from 'lucide-react';
import { AppContext } from '../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Admin.css';

export default function Admin() {
  const { projects, tasks, users, stats } = useContext(AppContext);
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string, filename: string, doc: any } | null>(null);
  const [chartContext, setChartContext] = useState<{ type: 'collab' | 'project', id: string, name: string } | null>(null);
  const [activeStatModal, setActiveStatModal] = useState<'projects' | 'users' | 'progress' | 'urgent' | null>(null);
  const [timeRange, setTimeRange] = useState<'3 Dias' | 'Semana' | '15 Dias' | 'Mês' | 'Trimestre' | 'Semestre' | 'Ano'>('Semana');
  const [reportConfig, setReportConfig] = useState({
    type: 'Colaboradores' as 'Geral' | 'Projetos' | 'Colaboradores',
    collabId: 'all',
    period: 'Sempre' as 'Sempre' | '7 Dias' | '15 Dias' | '30 Dias' | '90 Dias',
    unit: 'Todas'
  });

  const availableUnits = useMemo(() => {
    const units = Array.from(new Set(tasks.map(t => t.measurementType || 'UN')));
    return ['Todas', ...units];
  }, [tasks]);

  const allAssignees = useMemo(() => {
    return users.map(u => ({ id: u.id, name: u.name, type: 'user' }));
  }, [users]);

  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.assignee && !t.assigneeId && t.status !== 'Concluída').slice(0, 10);
  }, [tasks]);

  const tasksByCollaborator = useMemo(() => {
    return allAssignees.map(assignee => {
      const collabTasks = tasks.filter(t => t.assignee === assignee.name || t.assigneeId === assignee.id);
      const completed = collabTasks.filter(t => t.status === 'Concluída').length;
      const inProgress = collabTasks.filter(t => t.status === 'Em andamento').length;
      const todo = collabTasks.filter(t => t.status === 'Pendente' || t.status === 'A fazer').length;
      const progress = collabTasks.length > 0 ? Math.round((completed / collabTasks.length) * 100) : 0;
      
      const allExecutions = collabTasks.flatMap(t => t.executions || []);
      const collabExecutions = allExecutions.filter(e => String(e.colaboradorId) === String(assignee.id));
      const totalProduced = collabExecutions.reduce((sum, e) => sum + (Number(e.quantidade) || 0), 0);
      const lastExecution = collabExecutions.length > 0 
        ? collabExecutions.sort((a, b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime())[0]
        : null;
      
      return { 
        ...assignee, 
        total: collabTasks.length, 
        completed, 
        inProgress, 
        todo, 
        progress,
        totalProduced,
        executionsCount: collabExecutions.length,
        lastActivity: lastExecution ? (lastExecution.timestamp || lastExecution.data) : null
      };
    });
  }, [allAssignees, tasks]);

  const projectStatus = useMemo(() => {
    const now = new Date();
    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const completed = projTasks.filter(t => t.status === 'Concluída').length;
      const total = projTasks.length;
      
      let daysLeft = null;
      let isLate = false;
      
      if (proj.endDate) {
        const parts = proj.endDate.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[2]) + (parts[2].length === 2 ? 2000 : 0);
          const endDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
          const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) isLate = true;
          daysLeft = Math.abs(diff);
        }
      }
      
      return { ...proj, completed, total, daysLeft, isLate };
    }).sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }, [projects, tasks]);

  const targetTasks = useMemo(() => {
    if (!chartContext) return [];
    if (chartContext.type === 'collab') {
      return tasks.filter(t => t.assignee === chartContext.name || t.assigneeId === chartContext.id);
    } else {
      return tasks.filter(t => t.projectId === chartContext.id);
    }
  }, [tasks, chartContext]);

  const targetExecutions = useMemo(() => {
    if (!chartContext) return [];
    const executions = targetTasks.flatMap(t => {
      return (t.executions || []).map(e => ({
        ...e,
        taskTitle: t.title,
        taskMeasurement: t.measurementType || 'un'
      }));
    });
    
    if (chartContext.type === 'collab') {
       return executions.filter(e => String(e.colaboradorId) === String(chartContext.id));
    }
    return executions;
  }, [targetTasks, chartContext]);

  const chartData = useMemo(() => {
    if (!chartContext) return [];
    
    const data = [];
    const today = new Date();
    
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dailyActivities = targetExecutions.filter(a => a.data === dateString);
      const sum = dailyActivities.length;
      
      const [year, month, day] = dateString.split('-');
      const label = days > 90 ? `${month}/${year}` : `${day}/${month}`;
      
      data.push({
        date: label,
        producao: sum
      });
    }
    return data;
  }, [chartContext, targetExecutions, timeRange]);

  const filteredExecutions = useMemo(() => {
    if (!chartContext) return [];
    
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;
    
    const now = new Date().getTime();
    return targetExecutions.filter(e => {
       const eDate = new Date(e.timestamp || e.data).getTime();
       const diffDays = (now - eDate) / (1000 * 3600 * 24);
       return diffDays <= days;
    }).sort((a, b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime());
  }, [chartContext, targetExecutions, timeRange]);

  const chartStats = useMemo(() => {
    if (!chartContext) return { total: 0, prevTotal: 0, increase: 0, percent: 0 };
    
    const currentData = chartData.map(d => d.producao);
    const total = currentData.reduce((a, b) => a + b, 0);
    
    let days = 7;
    if (timeRange === '3 Dias') days = 3;
    else if (timeRange === 'Semana') days = 7;
    else if (timeRange === '15 Dias') days = 15;
    else if (timeRange === 'Mês') days = 30;
    else if (timeRange === 'Trimestre') days = 90;
    else if (timeRange === 'Semestre') days = 180;
    else if (timeRange === 'Ano') days = 365;
    
    const prevTotal = targetExecutions.filter(e => {
       const eDate = new Date(e.timestamp || e.data).getTime();
       const now = new Date().getTime();
       const diffDays = (now - eDate) / (1000 * 3600 * 24);
       return diffDays >= days && diffDays < days * 2;
    }).length;
    
    const increase = total - prevTotal;
    const percent = prevTotal === 0 ? (total > 0 ? 100 : 0) : ((increase / prevTotal) * 100);
    
    return { total, increase, percent: percent.toFixed(1) };
  }, [chartData, chartContext, targetExecutions, timeRange]);

  const overallProgress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Concluída').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  const urgentTasks = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length;

  const generatePDF = (title, data, kpis = [], timelineData = [], detailedActivities = []) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // --- Luxury Header ---
    doc.setFillColor(15, 17, 23); 
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(255, 97, 48); 
    doc.rect(0, 30, pageWidth, 1.5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('G A L I Z A', 15, 20);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('PAINEL DE PERFORMANCE OPERACIONAL', 15, 26);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`, pageWidth - 15, 19, { align: 'right' });
    
    // --- Report Subtitle ---
    doc.setTextColor(15, 17, 23);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 15, 45);
    
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, 48, pageWidth - 15, 48);
    
    // --- KPI Cards ---
    let currentY = 58;
    if (kpis.length > 0) {
      let xPos = 15;
      const kpiWidth = (pageWidth - 45) / 4;
      
      kpis.forEach((kpi, idx) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(xPos, currentY, kpiWidth, 22, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xPos, currentY, kpiWidth, 22, 2, 2, 'S');
        
        const colors = [[255, 97, 48], [52, 211, 153], [96, 165, 250], [251, 191, 36]];
        const color = colors[idx % colors.length];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(xPos, currentY, kpiWidth, 1.2, 'F');
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.label.toUpperCase(), xPos + 4, currentY + 7);
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text(String(kpi.value), xPos + 4, currentY + 16);
        
        xPos += kpiWidth + 5;
      });
      currentY += 32;
    }

    // --- Timeline Chart (Matching the UI Screenshot) ---
    if (timelineData.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(15, 17, 23);
      doc.text("GRÁFICO DE DESEMPENHO DIÁRIO", 15, currentY);
      
      const chartX = 15;
      const chartY = currentY + 5;
      const chartW = pageWidth - 30;
      const chartH = 35;
      
      doc.setFillColor(252, 253, 254);
      doc.rect(chartX, chartY, chartW, chartH, 'F');
      
      const maxVal = timelineData.length > 0 ? Math.max(...timelineData.map(d => d.value), 1) : 1;
      
      // Draw Grid and Y-Axis Labels
      doc.setDrawColor(240, 240, 245);
      doc.setLineWidth(0.1);
      doc.setFontSize(5);
      doc.setTextColor(150);
      
      for(let g = 0; g <= 4; g++) {
        const gy = chartY + (g * (chartH / 4));
        doc.line(chartX, gy, chartX + chartW, gy);
        
        // Y-axis label (Quantidades)
        const yVal = Math.round(maxVal - (g * (maxVal / 4)));
        doc.text(String(yVal), chartX - 2, gy + 1, { align: 'right' });
      }

      const denominator = timelineData.length > 1 ? timelineData.length - 1 : 1;
      
      const points = timelineData.map((d, i) => ({
        x: chartX + (i * (chartW / denominator)),
        y: chartY + chartH - ((d.value / maxVal) * chartH)
      }));

      // Draw Area (Polygon)
      if (points.length > 1) {
        doc.setFillColor(255, 245, 240); 
        for(let i = 0; i < points.length - 1; i++) {
           doc.triangle(
             points[i].x, chartY + chartH,
             points[i+1].x, chartY + chartH,
             points[i].x, points[i].y,
             'F'
           );
           doc.triangle(
             points[i+1].x, chartY + chartH,
             points[i].x, points[i].y,
             points[i+1].x, points[i+1].y,
             'F'
           );
        }

        // Draw Line
        doc.setDrawColor(255, 97, 48);
        doc.setLineWidth(0.8);
        for(let i = 0; i < points.length - 1; i++) {
          doc.line(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
        }

        // Draw Dots (markers)
        doc.setFillColor(255, 97, 48);
        points.forEach((p, idx) => {
           if (timelineData.length <= 15 || idx % Math.ceil(timelineData.length / 15) === 0) {
             doc.circle(p.x, p.y, 0.8, 'F');
             doc.setDrawColor(255, 255, 255);
             doc.setLineWidth(0.3);
             doc.circle(p.x, p.y, 0.8, 'S');
           }
        });

      } else if (points.length === 1) {
        doc.setFillColor(255, 97, 48);
        doc.circle(points[0].x, points[0].y, 1.5, 'F');
      }

      // X-axis labels
      doc.setFontSize(6);
      doc.setTextColor(150);
      const step = Math.max(Math.ceil(timelineData.length / 10), 1);
      timelineData.forEach((d, i) => {
        if (i % step === 0 || i === timelineData.length - 1) {
          doc.text(d.label, points[i].x, chartY + chartH + 4, { align: 'center' });
        }
      });
      
      currentY += 55;
    }

    // --- Detailed Activity List by Unit (MT/UN) ---
    if (detailedActivities && detailedActivities.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(15, 17, 23);
      doc.text("DETALHAMENTO DE ATIVIDADES REALIZADAS", 15, currentY);
      currentY += 5;

      const units = Array.from(new Set(detailedActivities.map(a => a.unit || 'UN')));
      
      units.forEach(u => {
        const unitActivities = detailedActivities.filter(a => (a.unit || 'UN') === u);
        
        if (currentY > 260) { doc.addPage(); currentY = 20; }
        
        doc.setFillColor(240, 245, 250);
        doc.rect(15, currentY, pageWidth - 30, 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 80, 120);
        doc.text(`UNIDADE DE MEDIDA: ${u}`, 18, currentY + 4.5);
        currentY += 8;

        unitActivities.forEach(a => {
          if (currentY > 270) { doc.addPage(); currentY = 20; }
          
          doc.setDrawColor(240, 240, 240);
          doc.line(15, currentY + 8, pageWidth - 15, currentY + 8);
          
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 17, 23);
          doc.text(a.title || 'Sem Título', 18, currentY + 5);
          
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text(`${a.date || '-'} ${a.time || ''}`, 18, currentY + 9);
          
          doc.setTextColor(255, 97, 48);
          doc.setFont('helvetica', 'bold');
          doc.text(`+${a.amount || 0} ${u}`, pageWidth - 18, currentY + 6, { align: 'right' });
          
          currentY += 13;
        });
        currentY += 5;
      });
    } else if (data && data.length > 0) {
      // Standard Table if no detailed activities
      autoTable(doc, {
        startY: currentY,
        head: [Object.keys(data[0])],
        body: data.map(obj => Object.values(obj)),
        styles: { fontSize: 8.5, cellPadding: 4 },
        headStyles: { fillColor: [15, 17, 23], textColor: 255 },
        margin: { left: 15, right: 15 }
      });
    }
    
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} | Galiza Project Manager`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
    return { doc, filename };
  };

  const generateReport = () => {
    const { type, collabId, period, unit } = reportConfig;
    let result = null;

    const isWithinPeriod = (timestamp: any) => {
      if (period === 'Sempre') return true;
      const now = new Date().getTime();
      const date = new Date(timestamp).getTime();
      const diffDays = (now - date) / (1000 * 3600 * 24);
      
      const limit = period === '7 Dias' ? 7 : period === '15 Dias' ? 15 : period === '30 Dias' ? 30 : 90;
      return diffDays <= limit;
    };

    switch(type) {
      case 'Geral':
        const filteredTasks = tasks.filter(t => 
          isWithinPeriod(t.created_at || t.dueDate) && 
          (unit === 'Todas' || t.measurementType === unit)
        );
        const filteredCompleted = filteredTasks.filter(t => t.status === 'Concluída').length;
        const filteredUrgent = filteredTasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length;
        
        result = generatePDF('Relatório Geral de Operações', 
          [
            { Indicador: 'Período Selecionado', Valor: period },
            { Indicador: 'Unidade Filtrada', Valor: unit },
            { Indicador: 'Total de Atividades', Valor: filteredTasks.length },
            { Indicador: 'Atividades Finalizadas', Valor: filteredCompleted },
            { Indicador: 'Projetos Ativos', Valor: projects.length }
          ],
          [
            { label: 'ATIVIDADES', value: filteredTasks.length },
            { label: 'CONCLUÍDAS', value: filteredCompleted },
            { label: 'URGENTES', value: filteredUrgent },
            { label: 'PROJETOS', value: projects.length }
          ]
        );
        break;

      case 'Projetos':
        const projData = projectStatus.map(p => ({
          'Projeto': p.name,
          'Progresso': `${p.progress || 0}%`,
          'Status': p.progress === 100 ? 'Concluído' : p.isLate ? 'Atrasado' : 'Ativo',
          'Entregas': `${p.completed}/${p.total}`,
          'Prazo': p.daysLeft !== null ? (p.isLate ? `Atrasado ${p.daysLeft}d` : `${p.daysLeft} dias`) : '-'
        }));
        result = generatePDF('Status de Progresso dos Projetos', projData, [
          { label: 'TOTAL', value: projects.length },
          { label: 'CONCLUÍDOS', value: projects.filter(p => p.progress === 100).length },
          { label: 'EM ATRASO', value: projectStatus.filter(p => p.isLate).length }
        ]);
        break;

      case 'Colaboradores':
        let targetCollabs = tasksByCollaborator;
        if (collabId !== 'all') {
          targetCollabs = tasksByCollaborator.filter(c => String(c.id) === String(collabId));
        }

        const today = new Date();
        const daysToChart = period === 'Sempre' ? 30 : (period === '7 Dias' ? 7 : period === '15 Dias' ? 15 : period === '30 Dias' ? 30 : 90);
        const timelineData = [];

        for (let i = daysToChart - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const dailyExecs = targetCollabs.flatMap(c => {
             const collabTasks = tasks.filter(t => String(t.assigneeId) === String(c.id));
             return collabTasks.flatMap(t => (t.executions || []))
               .filter(e => String(e.colaboradorId) === String(c.id) && (e.data === dateStr || (e.timestamp && e.timestamp.split('T')[0] === dateStr)));
          });
          
          const [yr, mo, dy] = dateStr.split('-');
          timelineData.push({ label: `${dy}/${mo}`, value: dailyExecs.length });
        }

        const collabReportData = targetCollabs.map(c => {
          const collabTasks = tasks.filter(t => 
            String(t.assigneeId) === String(c.id) && 
            (unit === 'Todas' || t.measurementType === unit)
          );
          const collabExecutions = collabTasks.flatMap(t => (t.executions || []))
            .filter(e => String(e.colaboradorId) === String(c.id) && isWithinPeriod(e.timestamp || e.data));
          
          const periodProducedSum = collabExecutions.reduce((sum, e) => sum + (Number(e.quantidade) || 0), 0);
          const activityCount = collabExecutions.length;
          
          return {
            'Colaborador': c.name,
            'Ativ. Vinculadas': collabTasks.length,
            'Ativ. Realizadas (Qtd)': activityCount,
            'Produção (Soma)': `${periodProducedSum} ${unit === 'Todas' ? '' : unit}`,
            'Desempenho': `${c.progress}%`
          };
        });

        const detailedActivities = targetCollabs.flatMap(c => {
           const collabTasks = tasks.filter(t => String(t.assigneeId) === String(c.id));
           return collabTasks.flatMap(t => (t.executions || []).map(e => ({
              ...e,
              title: t.title,
              unit: t.measurementType || 'UN'
           })))
           .filter(e => String(e.colaboradorId) === String(c.id) && isWithinPeriod(e.timestamp || e.data))
           .map(e => {
              const dt = new Date(e.timestamp || e.data);
              return {
                title: e.title,
                date: dt.toLocaleDateString('pt-BR'),
                time: dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
                amount: e.quantidade || 0,
                unit: e.unit,
                timestamp: dt.getTime()
              };
           })
           .sort((a,b) => b.timestamp - a.timestamp);
        });

        result = generatePDF(
          collabId === 'all' ? 'Desempenho Geral da Equipe' : `Desempenho Individual: ${targetCollabs[0]?.name}`,
          collabReportData,
          [
            { label: 'INTEGRANTES', value: targetCollabs.length },
            { label: 'ATIVIDADES', value: collabReportData.reduce((sum, r) => sum + Number(r['Ativ. Realizadas (Qtd)']), 0) },
            { label: 'PROD. SOMA', value: unit === 'Todas' ? 'Múltiplas' : collabReportData.reduce((sum, r) => sum + Number(r['Produção (Soma)'].split(' ')[0]), 0) }
          ],
          timelineData,
          detailedActivities
        );
        break;
    }
    
    if (result) {
      const url = result.doc.output('bloburl');
      setPdfPreview({ url, filename: result.filename, doc: result.doc });
    }
    setShowReportModal(false);
  };

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Painel Administrativo</h1>
          <p className="dashboard-subtitle">Visão geral e relatórios do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="dashboard-date">
            <Calendar size={16} />
            <span>{new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
          <button className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowReportModal(true)}>
            <FileText size={18} />
            <span>Gerar Relatório</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('projects')}>
          <div className="stat-icon-wrapper">
            <FolderKanban size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{projects.length}</span>
            <span className="stat-label">Projetos</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('users')}>
          <div className="stat-icon-wrapper admin" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Colaboradores</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('progress')}>
          <div className="stat-icon-wrapper success" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{overallProgress}%</span>
            <span className="stat-label">Conclusão Geral</span>
          </div>
        </div>

        <div className="stat-card clickable-card" onClick={() => setActiveStatModal('urgent')}>
          <div className="stat-icon-wrapper urgent">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{urgentTasks}</span>
            <span className="stat-label">Urgentes</span>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card performance-card">
          <div className="card-header">
            <BarChart3 size={20} />
            <h3>Desempenho por Colaborador</h3>
          </div>
          <div className="performance-list">
            {tasksByCollaborator.length === 0 ? (
              <p className="empty-text">Nenhum colaborador cadastrado</p>
            ) : (
              tasksByCollaborator.map(collab => (
                <div key={collab.id} className="performance-item clickable" onClick={() => setChartContext({ type: 'collab', id: collab.id, name: collab.name })}>
                  <div className="collab-info">
                    <div className="collab-avatar">{collab.name?.charAt(0) || 'U'}</div>
                    <div className="collab-details">
                      <span className="collab-name">{collab.name}</span>
                      <span className="collab-stats">
                        {collab.inProgress} em progresso • {collab.todo} a fazer • {collab.executionsCount || 0} execuções
                      </span>
                      {collab.lastActivity && (
                        <span className="collab-kpi">
                          Última atividade: {new Date(collab.lastActivity).toLocaleDateString('pt-BR')} • Produzido: {collab.totalProduced || 0}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="collab-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${collab.progress}%` }} />
                    </div>
                    <span className="progress-text">{collab.progress}%</span>
                    <TrendingUp size={16} className="item-chart-icon" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-card tasks-by-collab-card">
          <div className="card-header">
            <Users size={20} />
            <h3>Tarefas por Colaborador</h3>
          </div>
          <div className="bar-chart">
            {tasksByCollaborator.map(collab => (
              <div key={collab.id} className="bar-item">
                <span className="bar-label">{collab.name?.split(' ')[0] || 'User'}</span>
                <div className="bar-wrapper">
                  <div className="bar-completed" style={{ width: `${(collab.completed / (collab.total || 1)) * 100}%` }} />
                  <div className="bar-pending" style={{ width: `${((collab.inProgress + collab.todo) / (collab.total || 1)) * 100}%` }} />
                </div>
                <span className="bar-value">{collab.total}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot completed"></span> Concluídas</span>
            <span className="legend-item"><span className="legend-dot pending"></span> Pendentes</span>
          </div>
          <div className="kpi-row">
            {tasksByCollaborator.slice(0, 3).map(collab => (
              <div key={collab.id} className="mini-kpi-card">
                <span className="mini-kpi-label">{collab.name?.split(' ')[0] || 'User'}</span>
                <span className="mini-kpi-value">{collab.executionsCount || 0} exec</span>
                <span className="mini-kpi-sub">{collab.totalProduced || 0} total</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card projects-status-card">
          <div className="card-header">
            <FolderKanban size={20} />
            <h3>Status dos Projetos</h3>
          </div>
          <div className="projects-list">
            {projectStatus.map(proj => (
              <div key={proj.id} className={`project-item clickable-card ${proj.isLate ? 'late' : ''}`} onClick={() => setChartContext({ type: 'project', id: proj.id, name: proj.name })}>
                <div className="project-info">
                  <span className="project-name">{proj.name}</span>
                  <span className="project-meta">
                    {proj.completed}/{proj.total} tarefas
                    {proj.daysLeft !== null && ` • ${proj.daysLeft}d restantes`}
                  </span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar small">
                    <div className="progress-fill" style={{ 
                      width: `${proj.progress || 0}%`,
                      backgroundColor: proj.progress === 100 ? 'var(--success)' : proj.isLate ? 'var(--danger)' : 'var(--accent)'
                    }} />
                  </div>
                  <span className={`status-badge ${proj.progress === 100 ? 'completed' : proj.isLate ? 'late' : 'active'}`}>
                    {proj.progress === 100 ? 'Concluído' : proj.isLate ? 'Atrasado' : `${proj.progress || 0}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card unassigned-card">
          <div className="card-header">
            <User size={20} />
            <h3>Tarefas Sem Responsável</h3>
            <span className="badge-count">{unassignedTasks.length}</span>
          </div>
          <div className="unassigned-list">
            {unassignedTasks.length === 0 ? (
              <p className="empty-text">Todas as tarefas estão atribuídas</p>
            ) : (
              unassignedTasks.map(task => (
                <div key={task.id} className="unassigned-item">
                  <div className="task-info">
                    <span className="task-title">{task.title}</span>
                    <span className="task-project">{projects.find(p => p.id === task.projectId)?.name}</span>
                  </div>
                  <span className="priority-badge">{task.priority || 'Média'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showReportModal && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReportModal(false)}>
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="var(--accent)" />
                <h3 style={{ margin: 0 }}>Configurar Relatório</h3>
              </div>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="form-group">
                <label>Tipo de Relatório</label>
                <select 
                  value={reportConfig.type} 
                  onChange={e => setReportConfig({...reportConfig, type: e.target.value as any})}
                >
                  <option value="Colaboradores">Desempenho da Equipe</option>
                  <option value="Projetos">Status de Projetos</option>
                  <option value="Geral">Resumo Geral Operacional</option>
                </select>
              </div>

              {reportConfig.type === 'Colaboradores' && (
                <div className="form-group animate-fadeIn">
                  <label>Colaborador</label>
                  <select 
                    value={reportConfig.collabId} 
                    onChange={e => setReportConfig({...reportConfig, collabId: e.target.value})}
                  >
                    <option value="all">Todos os Colaboradores</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Unidade de Medida (MT)</label>
                <select 
                  value={reportConfig.unit} 
                  onChange={e => setReportConfig({...reportConfig, unit: e.target.value})}
                >
                  {availableUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Período de Análise</label>
                <select 
                  value={reportConfig.period} 
                  onChange={e => setReportConfig({...reportConfig, period: e.target.value as any})}
                >
                  <option value="Sempre">Todo o Histórico</option>
                  <option value="7 Dias">Últimos 7 Dias</option>
                  <option value="15 Dias">Últimos 15 Dias</option>
                  <option value="30 Dias">Último Mês</option>
                  <option value="90 Dias">Último Trimestre</option>
                </select>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
                  <TrendingUp size={12} style={{ marginRight: '6px', color: 'var(--success)' }} />
                  O relatório incluirá tabelas de dados e indicadores de performance baseados nos filtros selecionados acima.
                </p>
              </div>
            </div>
            <div className="modal-footer">
               <button className="btn-secondary" onClick={() => setShowReportModal(false)}>Cancelar</button>
               <button className="btn-primary" onClick={generateReport} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <BarChart3 size={18} />
                 Gerar Visualização
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {pdfPreview && createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '90%', height: '90vh', maxWidth: 'none', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText style={{ color: 'var(--accent)' }} size={24} />
                <h3 style={{ margin: 0, color: 'white', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Pré-visualização do Relatório</h3>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn-primary" onClick={() => pdfPreview.doc.save(pdfPreview.filename)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 16px', borderRadius: 'var(--radius)' }}>
                  <Download size={18} />
                  <span>Baixar PDF</span>
                </button>
                <button className="icon-btn" onClick={() => setPdfPreview(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, background: '#323639' }}>
              <iframe 
                src={pdfPreview.url} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title="Pré-visualização de Documento"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {chartContext && createPortal(
        <div className="reference-modal-overlay animate-fadeIn" onClick={() => setChartContext(null)}>
          <div className="reference-chart-card" onClick={e => e.stopPropagation()}>
            <div className="rcc-header">
              <div className="rcc-title-row">
                <h2>Gráfico de Desempenho</h2>
                <button className="rcc-settings-btn" onClick={() => setChartContext(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="rcc-subtitle-row">
                <span className="rcc-label">{chartContext.type === 'collab' ? 'Colaborador' : 'Projeto'}</span>
                <div className="rcc-value-col">
                  <span className="rcc-main-value">{chartContext.name}</span>
                  <span className="rcc-sub-value">Produção Registrada (Atividades)</span>
                </div>
              </div>
            </div>

            <div className="rcc-tabs-container">
              <div className="rcc-tabs">
                <button className={`rcc-tab ${timeRange === '3 Dias' ? 'active' : ''}`} onClick={() => setTimeRange('3 Dias')}>3 Dias</button>
                <button className={`rcc-tab ${timeRange === 'Semana' ? 'active' : ''}`} onClick={() => setTimeRange('Semana')}>Semana</button>
                <button className={`rcc-tab ${timeRange === '15 Dias' ? 'active' : ''}`} onClick={() => setTimeRange('15 Dias')}>15 Dias</button>
                <button className={`rcc-tab ${timeRange === 'Mês' ? 'active' : ''}`} onClick={() => setTimeRange('Mês')}>Mês</button>
                <select 
                  className={`rcc-tab-select ${['Trimestre', 'Semestre', 'Ano'].includes(timeRange) ? 'active' : ''}`}
                  value={['Trimestre', 'Semestre', 'Ano'].includes(timeRange) ? timeRange : ''} 
                  onChange={(e) => {
                    if (e.target.value) setTimeRange(e.target.value as any);
                  }}
                >
                  <option value="" disabled>Mais...</option>
                  <option value="Trimestre">Trimestre</option>
                  <option value="Semestre">Semestre</option>
                  <option value="Ano">Ano</option>
                </select>
              </div>
            </div>

            <div className="rcc-chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    minTickGap={20}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1C1C1E', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#34D399', fontWeight: 700 }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="producao" 
                    name="Atividades"
                    stroke="#34D399" 
                    fillOpacity={1} 
                    fill="url(#colorProd)" 
                    strokeWidth={2}
                    activeDot={{ r: 5, fill: '#1C1C1E', stroke: '#34D399', strokeWidth: 2 }}
                    dot={false}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rcc-footer">
              <span className="rcc-footer-label">Total Produzido</span>
              <div className="rcc-footer-stats">
                <div className="rcc-big-number">
                  {chartStats.total}
                  <span className={`rcc-increment ${chartStats.increase >= 0 ? 'positive' : 'negative'}`}>
                    {chartStats.increase >= 0 ? '+' : ''}{chartStats.increase}
                  </span>
                </div>
                <div className={`rcc-percent ${chartStats.increase >= 0 ? 'positive' : 'negative'}`}>
                  <ArrowUpRight size={16} /> {Math.abs(Number(chartStats.percent))}%
                </div>
              </div>
            </div>

            <div className="rcc-activities-list">
              <h4 className="rcc-activities-title">Atividades Realizadas ({filteredExecutions.length})</h4>
              <div className="rcc-activities-scroll">
                {filteredExecutions.length === 0 ? (
                  <p className="rcc-empty-activities">Nenhuma atividade neste período.</p>
                ) : (
                  filteredExecutions.map((exec, idx) => (
                    <div key={exec.id || idx} className="rcc-activity-item">
                      <div className="rcc-activity-info">
                        <span className="rcc-activity-task">{exec.taskTitle}</span>
                        <span className="rcc-activity-date">
                          {new Date(exec.timestamp || exec.data).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="rcc-activity-value" style={{ color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {activeStatModal && createPortal(
        <div className="chart-modal-overlay animate-fadeIn" onClick={() => setActiveStatModal(null)}>
          <div className="chart-modal-content stat-list-modal" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <div>
                <h2>
                  {activeStatModal === 'projects' ? 'Projetos Ativos' : 
                   activeStatModal === 'users' ? 'Equipe de Colaboradores' : 
                   activeStatModal === 'progress' ? 'Últimas Atividades Globais' : 'Tarefas Urgentes'}
                </h2>
                <p>Detalhamento dos indicadores</p>
              </div>
              <button className="close-modal-btn" onClick={() => setActiveStatModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="stat-modal-body rcc-activities-scroll" style={{ maxHeight: '400px' }}>
              {activeStatModal === 'projects' && (
                projectStatus.map(p => (
                  <div key={p.id} className="rcc-activity-item" onClick={() => { setActiveStatModal(null); setChartContext({ type: 'project', id: p.id, name: p.name }); }} style={{ cursor: 'pointer' }}>
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{p.name}</span>
                      <span className="rcc-activity-date">{p.completed}/{p.total} tarefas concluídas</span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: p.progress === 100 ? 'var(--success)' : p.isLate ? 'var(--danger)' : 'var(--accent)' }}>
                      {p.progress}%
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'users' && (
                tasksByCollaborator.map(c => (
                  <div key={c.id} className="rcc-activity-item" onClick={() => { setActiveStatModal(null); setChartContext({ type: 'collab', id: c.id, name: c.name }); }} style={{ cursor: 'pointer' }}>
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{c.name}</span>
                      <span className="rcc-activity-date">{c.totalProduced || 0} atividades produzidas</span>
                    </div>
                    <div className="rcc-activity-value">
                      {c.progress}%
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'progress' && (
                tasks.flatMap(t => (t.executions || []).map(e => ({...e, taskTitle: t.title, collabName: users.find(u => String(u.id) === String(e.colaboradorId))?.name})))
                     .sort((a,b) => new Date(b.timestamp || b.data).getTime() - new Date(a.timestamp || a.data).getTime())
                     .slice(0, 50)
                     .map((exec, idx) => (
                  <div key={idx} className="rcc-activity-item">
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{exec.taskTitle}</span>
                      <span className="rcc-activity-date">
                        {exec.collabName} • {new Date(exec.timestamp || exec.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'urgent' && (
                tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').map(t => (
                  <div key={t.id} className="rcc-activity-item">
                    <div className="rcc-activity-info">
                      <span className="rcc-activity-task">{t.title}</span>
                      <span className="rcc-activity-date">{projects.find(p => p.id === t.projectId)?.name} • Resp: {t.assignee || 'Sem responsável'}</span>
                    </div>
                    <div className="rcc-activity-value" style={{ color: 'var(--danger)' }}>
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                ))
              )}
              {activeStatModal === 'urgent' && tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída').length === 0 && (
                 <p className="rcc-empty-activities">Não há tarefas urgentes no momento.</p>
              )}
              {activeStatModal === 'progress' && tasks.flatMap(t => t.executions || []).length === 0 && (
                 <p className="rcc-empty-activities">Nenhuma atividade registrada.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}