import React, { useState, useRef, useEffect } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, UserCheck, Activity, PieChart, FileText, Send, CheckSquare, Trash2, Edit2, Search, BarChart3, Clock, AlertCircle, FileSpreadsheet, Plus, Download, ShieldAlert, Calendar, AlertTriangle, Megaphone } from 'lucide-react';
import { format, endOfWeek, isWithinInterval, getDay, isSameDay } from 'date-fns';
import { sendEmail } from '../services/emailService';

// Helpers to replace missing date-fns exports
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }) => {
  const weekStartsOn = options?.weekStartsOn || 0;
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseISO = (dateString: string) => new Date(dateString);

export const AdminDashboard = () => {
  const { users, shifts, reports, currentUser, forms, submitFormResponse, 
          addAnnouncement, createForm, exportToGoogleSheets, exportToGoogleDocs, announcements, updateProntuario, acknowledgeLate } = useLifecare();
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'forms' | 'announcements' | 'integrations' | 'clients' | 'history'>('overview');
  
  // Prontuario View State
  const [selectedClientForProntuario, setSelectedClientForProntuario] = useState<any>(null);
  const [adminProntuarioText, setAdminProntuarioText] = useState('');

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 60000); // Verify every minute
      return () => clearInterval(interval);
  }, []);

  const todayShifts = (shifts || []).filter(s => s.startScheduled && new Date(s.startScheduled).toDateString() === new Date().toDateString());
  const lateShifts = todayShifts.filter(s => {
      if (s.status === 'completed' || s.checkIn || s.acknowledgedLate) return false;
      const scheduledTime = new Date(s.startScheduled).getTime();
      return (now - scheduledTime) > 15 * 60 * 1000;
  });


  // Stats
  const stats = [
    { label: 'Clientes Ativos', value: users.filter(u => u.role === 'client').length, icon: Users, color: 'bg-slate-200 text-[#141C4D]' },
    { label: 'Cuidadores', value: users.filter(u => u.role === 'caregiver').length, icon: UserCheck, color: 'bg-slate-200 text-[#141C4D]' },
    { label: 'Plantões Hoje', value: todayShifts.length, icon: Calendar, color: 'bg-slate-200 text-[#141C4D]' },
    { label: 'Relatórios (Mês)', value: reports.length, icon: FileText, color: 'bg-slate-200 text-[#141C4D]' },
  ];

  // --- Lógica do Gráfico Dinâmico ---
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Começa na segunda-feira
  const end = endOfWeek(today, { weekStartsOn: 1 });

  // Inicializa contadores para Seg(0) a Dom(6)
  const weekCounts = [0, 0, 0, 0, 0, 0, 0];

  shifts.forEach(shift => {
    try {
        const shiftDate = parseISO(shift.startScheduled);
        // Verifica se o plantão é desta semana
        if (isWithinInterval(shiftDate, { start, end })) {
            const dayIndex = getDay(shiftDate); // 0 (Dom) - 6 (Sáb)
            
            // Ajusta para o índice do array (0=Seg, ..., 6=Dom)
            // getDay: 0(Dom), 1(Seg), 2(Ter), 3(Qua), 4(Qui), 5(Sex), 6(Sáb)
            // Array:  6      0       1       2       3       4       5
            let chartIndex = dayIndex - 1;
            if (chartIndex < 0) chartIndex = 6; // Domingo vira o último

            weekCounts[chartIndex]++;
        }
    } catch (e) {
        console.error("Erro ao processar data do plantão no gráfico", e);
    }
  });

  const data = [
    { name: 'Seg', plantoes: weekCounts[0] },
    { name: 'Ter', plantoes: weekCounts[1] },
    { name: 'Qua', plantoes: weekCounts[2] },
    { name: 'Qui', plantoes: weekCounts[3] },
    { name: 'Sex', plantoes: weekCounts[4] },
    { name: 'Sáb', plantoes: weekCounts[5] },
    { name: 'Dom', plantoes: weekCounts[6] },
  ];

  // Dynamic Notification History (Compute past lates and incidents)
  const notificationHistory = [
      ...shifts.filter(s => s.checkIn && (new Date(s.checkIn).getTime() - new Date(s.startScheduled).getTime()) > 15 * 60000).map(s => ({
          id: `late-${s.id}`,
          type: 'Atraso Registrado',
          icon: AlertTriangle,
          color: 'text-orange-500 bg-orange-50',
          message: `${s.caregiverName} atrasou ${Math.floor((new Date(s.checkIn!).getTime() - new Date(s.startScheduled).getTime())/60000)} minutos no plantão de ${s.clientName}.`,
          date: s.checkIn!
      })),
      ...reports.filter(r => r.incidents && r.incidents.trim() !== '' && r.incidents !== 'Nenhuma intercorrência.').map(r => ({
          id: `inc-${r.id}`,
          type: 'Intercorrência Médica/Geral',
          icon: ShieldAlert,
          color: 'text-red-500 bg-red-50',
          message: `${r.caregiverName} reportou intercorrência para ${r.clientName}: "${r.incidents}"`,
          date: r.date
      }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Form Creation State
  const [newForm, setNewForm] = useState({
    title: '',
    question: '',
    targetRole: 'caregiver' as 'client' | 'caregiver' | 'all',
    active: true
  });

  // Announcement State
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    targetRole: 'all' as 'all' | 'caregiver' | 'client'
  });

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    createForm(newForm);
    setNewForm({ title: '', question: '', targetRole: 'caregiver', active: true });
    alert('Formulário enviado!');
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement(newAnnouncement);
    setNewAnnouncement({ title: '', message: '', targetRole: 'all' });
    alert('Comunicado enviado!');
  };

  const handleTestEmail = async () => {
      if (!currentUser?.email) return;
      alert(`Enviando email de teste para: ${currentUser.email}...`);
      
      await sendEmail({
          subject: "[Teste] Alertas Ativados",
          body: "Se você recebeu esse email, a conexão do Lifecare com o servidor de alertas está 100% funcional!"
      }, currentUser.email);

      alert("Requisição enviada! Verifique sua caixa de entrada (e spam) em instantes.");
  };

  const exportPayrollPlan = () => {
    const completedShifts = shifts.filter(s => s.status === 'completed' || s.checkOut);
    if (completedShifts.length === 0) {
        alert("Nenhum plantão COMPLETO foi encontrado! A planilha só exporta a folha de pagamento real de plantões que já tiveram a 'Saída' registrada pelos cuidadores.");
        return;
    }
    const data = completedShifts.map((s, index) => {
        const start = s.checkIn ? new Date(s.checkIn) : new Date(s.startScheduled);
        const end = s.checkOut ? new Date(s.checkOut) : new Date(s.endScheduled);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2).replace('.', ',');
        
        return {
            "Data do Plantao": format(start, "dd/MM/yyyy"),
            "Cuidador": s.caregiverName,
            "Cliente": s.clientName,
            "Entrada Real": s.checkIn ? format(start, "HH:mm") : format(start, "HH:mm") + " (Agend)",
            "Saida Real": s.checkOut ? format(end, "HH:mm") : format(end, "HH:mm") + " (Agend)",
            "Horas Trabalhadas": diffHours,
            "Valor Hora": "0",
            "Custo Passagem": "0",
            "Total A Pagar (R$)": "0"
        }
    });
    // Adiciona uma linha de instrução
    if (data.length > 0) {
        data.push({
            "Data do Plantao": "INSTRUÇÕES:", "Cuidador": "Preencha as colunas", "Cliente": "'Valor Hora' e", "Entrada Real": "'Custo Passagem'", "Saida Real": "no Excel para", "Horas Trabalhadas": "calcular os", "Valor Hora": "gastos da folha.", "Custo Passagem": "", "Total A Pagar (R$)": ""
        });
    }
    exportToGoogleSheets(data, 'Folha_Pagamento_Financeiro');
  };

  const exportClientDossier = () => {
    let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                h1 { color: #141C4D; border-bottom: 2px solid #13808E; padding-bottom: 10px; text-align: center; }
                h2 { color: #13808E; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                .client-block { margin-bottom: 40px; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; background-color: #fafbfc; }
                .stats { font-weight: bold; background: #e0f2f1; padding: 10px; display: inline-block; margin-bottom: 20px; color: #00695c; border-radius: 5px; }
                .incident { color: #d32f2f; font-weight: bold; }
                ul { padding-left: 20px; }
                li { padding: 6px 0; border-bottom: 1px dashed #e0e0e0; font-size: 14px; }
                .date-badge { font-weight: bold; color: #0288d1; }
            </style>
        </head>
        <body>
            <h1>Dossiê Gerencial de Clientes - Lifecare</h1>
            <p style="text-align: center; color: #666;">Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
    `;

    const clientsList = users.filter(u => u.role === 'client');
    clientsList.forEach(client => {
        const clientReports = reports.filter(r => r.clientName === client.name);
        
        let incidents = 0;
        let generalNotes: string[] = [];
        
        clientReports.forEach(r => {
            if (r.incidents && r.incidents !== 'Nenhuma intercorrência.') {
                incidents++;
            }
            if (r.generalState) {
                generalNotes.push(`<li><span class="date-badge">[${format(new Date(r.date), "dd/MM")}]</span> <strong>${r.caregiverName}:</strong> ${r.generalState}</li>`);
            }
        });

        htmlContent += `
        <div class="client-block">
            <h2>👤 Cliente: ${client.name.toUpperCase()}</h2>
            <div class="stats">
                Total de Plantões/Relatórios: ${clientReports.length} <br/>
                <span class="${incidents > 0 ? 'incident' : ''}">Volume de Alertas Vitais: ${incidents}</span>
            </div>
            
            <h3>📋 Histórico Odontológico/Geral e Observações:</h3>
            ${generalNotes.length === 0 ? '<p><i>Nenhum relatório diário arquivado neste mês.</i></p>' : `<ul>${generalNotes.slice(0, 20).join('')}</ul>`}
            ${generalNotes.length > 20 ? `<p><i>... e mais ${generalNotes.length - 20} registros anteriores.</i></p>` : ''}
        </div>
        `;
    });

    htmlContent += `</body></html>`;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = 'Dossie_Lifecare.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 relative">
        
        {lateShifts.length > 0 && activeTab !== 'monitoring' && (
            <div className="bg-[#141C4D] text-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-500 flex flex-col md:flex-row items-center justify-between animate-fade-in-down mb-4 space-y-3 md:space-y-0 relative z-50">
                <div className="flex items-center">
                    <AlertTriangle className="mr-3 animate-pulse text-red-400" size={24} />
                    <span><strong>Aviso Operacional:</strong> Você possui {lateShifts.length > 1 ? `${lateShifts.length} cuidadores com plantões atrasados` : `1 cuidador com plantão atrasado`} (&gt; 15 min de tolerância).</span>
                </div>
                <Button className="bg-[#13808E] hover:bg-[#0f606b] text-white font-bold border-none" onClick={() => setActiveTab('monitoring')}>
                    Acionar Supervisão
                </Button>
            </div>
        )}



        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-[#141C4D]">Painel Administrativo</h1>
            <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 flex flex-wrap justify-center">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Visão Geral
                </button>
                <button 
                    onClick={() => setActiveTab('monitoring')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'monitoring' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Monitoramento Ao Vivo
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Histórico de Alertas
                </button>
                <button 
                    onClick={() => setActiveTab('forms')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'forms' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Formulários
                </button>
                <button 
                    onClick={() => setActiveTab('announcements')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'announcements' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Comunicados
                </button>
                 <button 
                    onClick={() => setActiveTab('clients')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'clients' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Prontuários
                </button>
                 <button 
                    onClick={() => setActiveTab('integrations')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'integrations' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Integrações
                </button>
            </div>
        </header>
      
      {activeTab === 'overview' && (
        <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon size={24} />
                    </div>
                    <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#141C4D]">{stat.value}</p>
                    </div>
                </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#141C4D] mb-6">Volume de Plantões (Semana Atual)</h3>
                <div className="h-64 w-full">
                    {shifts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Calendar size={48} className="mb-2 opacity-50" />
                            <p>Nenhum plantão agendado.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAED" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} allowDecimals={false} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                cursor={{fill: '#F5F7FA'}}
                            />
                            <Bar dataKey="plantoes" fill="#13808E" radius={[6, 6, 0, 0]} barSize={30} />
                        </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                </div>

                {/* Real Late Alerts */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#141C4D] mb-6 flex items-center"><AlertTriangle className="mr-2 text-red-500"/> Alertas de Atraso (Hoje)</h3>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {lateShifts.length === 0 ? (
                         <div className="flex items-start p-3 bg-green-50 rounded-xl border border-green-100">
                            <div>
                                <p className="text-sm font-bold text-green-700">Tudo sob controle</p>
                                <p className="text-xs text-green-600">Nenhum cuidador está atrasado para os plantões de hoje. ✅</p>
                            </div>
                        </div>
                    ) : (
                        lateShifts.map(shift => (
                            <div key={shift.id} className="flex items-start p-3 bg-red-50 rounded-xl border border-red-100 animate-pulse">
                            <div>
                                <p className="text-sm font-bold text-red-700">URGENTE: Cuidador {shift.caregiverName}</p>
                                <p className="text-xs text-red-600 mt-1">
                                    Deveria ter iniciado o plantão em <strong>{shift.clientName}</strong> às {format(new Date(shift.startScheduled), 'HH:mm')}. 
                                </p>
                                <div className="flex-1 mt-3 md:mt-0 flex items-center justify-between">
                                      <p className="text-sm font-bold text-red-900 ml-0 md:ml-4">
                                          Tempo de atraso: {Math.floor((now - new Date(shift.startScheduled).getTime()) / 60000)} minutos
                                      </p>
                                      <Button size="sm" className="bg-red-600 hover:bg-red-800 text-white font-bold ml-4" onClick={() => acknowledgeLate(shift.id)}>
                                          Estou Ciente. Remover Alerta.
                                      </Button>
                                  </div>
                            </div>
                            </div>
                        ))
                    )}
                </div>
                </div>
            </div>
        </>
      )}

      {activeTab === 'monitoring' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h2 className="text-xl font-bold text-[#141C4D] mb-6">Monitoramento Ao Vivo (Hoje)</h2>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="border-b-2 border-gray-100 text-sm text-gray-400">
                              <th className="pb-3 text-left">Status</th>
                              <th className="pb-3 text-left">Cuidador</th>
                              <th className="pb-3 text-left">Cliente</th>
                              <th className="pb-3 text-center">Entrada Agendada</th>
                              <th className="pb-3 text-center">Entrada Real</th>
                              <th className="pb-3 text-center">Saída Agendada</th>
                              <th className="pb-3 text-center">Saída Real</th>
                          </tr>
                      </thead>
                      <tbody>
                          {todayShifts.length === 0 ? (
                              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhum plantão agendado para hoje.</td></tr>
                          ) : (
                              todayShifts.map(shift => {
                                  const isLate = !shift.checkIn && (now - new Date(shift.startScheduled).getTime()) > 15 * 60000;
                                  return (
                                  <tr key={shift.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                      <td className="py-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                              shift.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                              shift.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                                              isLate ? 'bg-red-100 text-red-700 animate-pulse' :
                                              'bg-gray-100 text-gray-600'
                                          }`}>
                                              {shift.status === 'completed' ? 'Finalizado' : shift.status === 'active' ? 'Em Andamento' : isLate ? 'Atrasado' : 'Agendado'}
                                          </span>
                                      </td>
                                      <td className="py-4 font-semibold text-[#141C4D] text-sm">
                                        <h4 className="font-bold text-[#141C4D] flex items-center">{shift.caregiverName} {shift.acknowledgedLate && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Atrasado (Ciente)</span>}</h4>
                                        <p className="text-sm text-gray-500">Paciente: {shift.clientName}</p>
                                      </td>
                                      <td className="py-4 text-sm text-gray-600">{shift.clientName}</td>
                                      <td className="py-4 text-center text-sm font-medium">{format(new Date(shift.startScheduled), 'HH:mm')}</td>
                                      <td className="py-4 text-center text-sm">
                                          {shift.checkIn ? <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">{format(new Date(shift.checkIn), 'HH:mm')}</span> : '-'}
                                      </td>
                                      <td className="py-4 text-center text-sm font-medium">{format(new Date(shift.endScheduled), 'HH:mm')}</td>
                                      <td className="py-4 text-center text-sm">
                                          {shift.checkOut ? <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">{format(new Date(shift.checkOut), 'HH:mm')}</span> : '-'}
                                      </td>
                                  </tr>
                                  )
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'forms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <h3 className="text-xl font-bold text-[#141C4D] mb-4">Criar Novo Formulário</h3>
                  <form onSubmit={handleCreateForm} className="space-y-4">
                      <div>
                          <label className="block text-sm text-gray-700 mb-1">Título</label>
                          <input 
                            required
                            className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                            placeholder="Ex: Pesquisa de Satisfação"
                            value={newForm.title}
                            onChange={e => setNewForm({...newForm, title: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-gray-700 mb-1">Pergunta</label>
                          <textarea 
                            required
                            className="w-full border border-gray-200 rounded-xl p-3 h-24 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                            placeholder="A pergunta que será enviada..."
                            value={newForm.question}
                            onChange={e => setNewForm({...newForm, question: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-gray-700 mb-1">Enviar Para</label>
                          <select 
                             className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                             value={newForm.targetRole}
                             onChange={e => setNewForm({...newForm, targetRole: e.target.value as any})}
                          >
                              <option value="caregiver">Apenas Cuidadores</option>
                              <option value="client">Apenas Clientes</option>
                              <option value="all">Todos</option>
                          </select>
                      </div>
                      <Button type="submit" className="w-full">
                          <Plus size={18} className="mr-2 inline" /> Criar e Enviar
                      </Button>
                  </form>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <h3 className="text-xl font-bold text-[#141C4D] mb-4">Formulários Ativos</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {forms.map(form => (
                          <div key={form.id} className="border p-4 rounded-xl border-gray-200 bg-white">
                              <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-[#141C4D]">{form.title}</h4>
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{form.targetRole === 'all' ? 'Todos' : form.targetRole}</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{form.question}</p>
                              
                              <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs font-bold text-gray-500 mb-2">{form.responses.length} Respostas</p>
                                  {form.responses.map((resp, idx) => (
                                      <div key={idx} className="text-xs border-b border-gray-200 last:border-0 pb-1 mb-1 last:mb-0">
                                          <span className="font-semibold">{resp.userName}:</span> {resp.response}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'announcements' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-6 rounded-3xl shadow-sm">
                   <h3 className="text-xl font-bold text-[#141C4D] mb-4">Enviar Comunicado</h3>
                   <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                       <div>
                           <label className="block text-sm text-gray-700 mb-1">Título do Comunicado</label>
                           <input 
                             required
                             className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                             placeholder="Ex: Atualização nos protocolos"
                             value={newAnnouncement.title}
                             onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm text-gray-700 mb-1">Mensagem</label>
                           <textarea 
                             required
                             className="w-full border border-gray-200 rounded-xl p-3 h-32 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                             placeholder="Digite a mensagem completa..."
                             value={newAnnouncement.message}
                             onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm text-gray-700 mb-1">Visível Para</label>
                           <select 
                              className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                              value={newAnnouncement.targetRole}
                              onChange={e => setNewAnnouncement({...newAnnouncement, targetRole: e.target.value as any})}
                           >
                               <option value="all">Todos</option>
                               <option value="caregiver">Apenas Cuidadores</option>
                               <option value="client">Apenas Clientes</option>
                           </select>
                       </div>
                       <Button type="submit" className="w-full">
                           <Megaphone size={18} className="mr-2 inline" /> Publicar Comunicado
                       </Button>
                   </form>
               </div>

               <div className="bg-white p-6 rounded-3xl shadow-sm">
                   <h3 className="text-xl font-bold text-[#141C4D] mb-4">Histórico de Comunicados</h3>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto">
                       {announcements.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Nenhum comunicado enviado.</p>
                       ) : (
                           announcements.map(ann => (
                               <div key={ann.id} className="border p-4 rounded-xl border-gray-200 bg-white">
                                   <div className="flex justify-between items-start mb-2">
                                       <h4 className="font-bold text-[#141C4D]">{ann.title}</h4>
                                       <span className="text-xs bg-gray-100 px-2 py-1 rounded">{ann.targetRole === 'all' ? 'Todos' : ann.targetRole}</span>
                                   </div>
                                   <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{ann.message}</p>
                                   <div className="text-xs text-gray-400">
                                       Enviado em {format(new Date(ann.date), "dd/MM/yyyy 'às' HH:mm")}
                                   </div>
                               </div>
                           ))
                       )}
                   </div>
               </div>
           </div>
      )}

      {activeTab === 'clients' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h2 className="text-xl font-bold text-[#141C4D] mb-6 flex items-center">
                  <FileText className="mr-2 text-[#13808E]" /> Gestão de Prontuários (Famílias)
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Lista de Clientes */}
                  <div className="lg:col-span-1 border border-gray-200 rounded-xl overflow-hidden h-[500px] flex flex-col">
                      <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold text-[#141C4D]">
                          Selecione um Paciente
                      </div>
                      <div className="overflow-y-auto flex-1">
                          {users.filter(u => u.role === 'client').map(client => {
                               const lastHistory = client.prontuarioHistory && client.prontuarioHistory.length > 0
                                     ? format(new Date(client.prontuarioHistory[client.prontuarioHistory.length - 1].date), "dd/MM/yyyy HH:mm")
                                     : 'Nenhuma alteração registrada';
                               return (
                                  <button 
                                      key={client.id}
                                      onClick={() => {
                                          setSelectedClientForProntuario(client);
                                          setAdminProntuarioText(client.prontuario || '');
                                      }}
                                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors ${selectedClientForProntuario?.id === client.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                  >
                                      <p className="font-semibold text-gray-800">{client.name}</p>
                                      <p className="text-xs text-blue-600 mt-1">Última ed.: {lastHistory}</p>
                                  </button>
                               );
                          })}
                      </div>
                  </div>

                  {/* Detalhes do Prontuário */}
                  <div className="lg:col-span-2">
                       {selectedClientForProntuario ? (
                           <div className="border border-gray-200 rounded-xl p-6 h-[500px] flex flex-col">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="font-bold text-lg text-[#141C4D]">Prontuário: {selectedClientForProntuario.name}</h3>
                               </div>
                               <textarea 
                                   className="w-full flex-1 border border-gray-200 rounded-xl p-4 bg-gray-50 outline-none focus:border-[#13808E] resize-none mb-4 text-sm"
                                   value={adminProntuarioText}
                                   onChange={e => setAdminProntuarioText(e.target.value)}
                                   placeholder="Escreva as observações clínicas principais, medicação, etc..."
                               />
                               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                   <div className="text-xs text-gray-500 max-w-sm">
                                       <strong>As famílias também podem alterar este documento via aplicativo.</strong><br/>
                                       O Histórico detalhado é compilado diretamente no arquivo Word (Dossiê).
                                   </div>
                                   <Button 
                                      className="whitespace-nowrap w-full md:w-auto"
                                      onClick={() => {
                                          updateProntuario(selectedClientForProntuario.id, adminProntuarioText);
                                          // Update interface optimistically
                                          setSelectedClientForProntuario({...selectedClientForProntuario, prontuario: adminProntuarioText});
                                          alert("O Prontuário Clínico desta família foi atualizado.");
                                      }}
                                      disabled={adminProntuarioText === selectedClientForProntuario.prontuario}
                                   >
                                      Salvar Atualizações do Admin
                                   </Button>
                               </div>
                           </div>
                       ) : (
                           <div className="border border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 h-[500px] bg-gray-50 text-gray-400">
                               <FileText size={64} className="mb-4 opacity-50" />
                               <p className="text-center font-medium">Selecione um paciente ao lado para visualizar<br/>e editar o Prontuário Compartilhado.</p>
                           </div>
                       )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'integrations' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
              <div className="mb-8">
                  <h2 className="text-xl font-bold text-[#141C4D] mb-2">Exportações Operacionais e Financeiras</h2>
                  <p className="text-gray-600">Gere relatórios automatizados para folha de pagamento e dossiês completos de clientes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-green-100 bg-green-50 p-6 rounded-2xl flex flex-col items-center text-center hover:shadow-md transition-all">
                      <FileSpreadsheet size={48} className="text-green-600 mb-4" />
                      <h3 className="font-bold text-green-800 text-lg">Planilha Financeira (Folha)</h3>
                      <p className="text-sm text-green-700 mb-6">Exporta todos os plantões com cálculo de horas trabalhadas + colunas para Valores e Passagem.</p>
                      <Button onClick={exportPayrollPlan} className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 w-full">
                          <Download size={18} className="mr-2 inline" /> Baixar Planilha (.csv)
                      </Button>
                  </div>

                  <div className="border border-blue-100 bg-blue-50 p-6 rounded-2xl flex flex-col items-center text-center hover:shadow-md transition-all">
                      <FileText size={48} className="text-blue-600 mb-4" />
                      <h3 className="font-bold text-blue-800 text-lg">Dossiê de Clientes (Word)</h3>
                      <p className="text-sm text-blue-700 mb-6">Gera um relatório textual completo resumindo a satisfação e histórico de todos os clientes.</p>
                      <Button onClick={exportClientDossier} className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 w-full">
                          <Download size={18} className="mr-2 inline" /> Baixar Dossiê (.txt)
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'history' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h2 className="text-xl font-bold text-[#141C4D] mb-6 flex items-center">
                  <Activity className="mr-2 text-[#13808E]" /> Histórico de Alertas e Notificações
              </h2>
              <div className="space-y-4">
                  {notificationHistory.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                          <CheckSquare size={48} className="mx-auto mb-4 opacity-30" />
                          <p>O histórico está limpo. Nenhuma notificação ou atraso registrado ainda.</p>
                      </div>
                  ) : (
                      notificationHistory.map(notif => (
                          <div key={notif.id} className="flex p-4 border border-gray-100 rounded-2xl items-start bg-gray-50/50 hover:bg-white transition-all shadow-sm">
                              <div className={`p-3 rounded-full mr-4 ${notif.color}`}>
                                  <notif.icon size={20} />
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-[#141C4D]">{notif.type}</h4>
                                  <p className="text-sm text-gray-700 mt-1">{notif.message}</p>
                              </div>
                              <div className="text-xs text-gray-400 whitespace-nowrap ml-4 border-l pl-4 border-gray-200">
                                  {format(new Date(notif.date), "dd/MM/yyyy")} <br/>
                                  <span className="font-bold text-gray-500">{format(new Date(notif.date), "HH:mm")}</span>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}
    </div>
  );
};