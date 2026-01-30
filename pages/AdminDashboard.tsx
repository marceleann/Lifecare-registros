import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Calendar, AlertTriangle, FileText, ClipboardList, Plus, Download, FileSpreadsheet, Megaphone, Send } from 'lucide-react';
import { format, endOfWeek, isWithinInterval, getDay } from 'date-fns';
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
  const { shifts, reports, forms, createForm, exportToGoogleSheets, exportToGoogleDocs, users, announcements, addAnnouncement, currentUser } = useLifecare();
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'announcements' | 'integrations'>('overview');

  // Stats
  const stats = [
    { label: 'Clientes Ativos', value: users.filter(u => u.role === 'client').length, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Cuidadores', value: users.filter(u => u.role === 'caregiver').length, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'Plantões Hoje', value: shifts.length, icon: Calendar, color: 'bg-purple-100 text-purple-600' },
    { label: 'Relatórios (Mês)', value: reports.length, icon: FileText, color: 'bg-orange-100 text-orange-600' },
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
          subject: "Teste de Integração Lifecare",
          body: "Se você recebeu este email, a integração com o Google Apps Script está funcionando perfeitamente!"
      }, currentUser.email);

      alert("Requisição enviada! Verifique sua caixa de entrada (e spam) em instantes.");
  };

  return (
    <div className="space-y-8">
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

                {/* Recent Activity / Alerts */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#141C4D] mb-6">Alertas e Atividades Recentes</h3>
                <div className="space-y-4">
                    {/* Exibe alertas reais baseados no estado se houver, caso contrário, mostra placeholder vazio ou mensagem */}
                    <div className="flex items-start p-3 bg-red-50 rounded-xl">
                    <AlertTriangle className="text-red-500 mt-1 mr-3" size={18} />
                    <div>
                        <p className="text-sm font-bold text-red-700">Sistema de Alertas Ativo</p>
                        <p className="text-xs text-red-600">O sistema notificará automaticamente atrasos superiores a 15 min.</p>
                    </div>
                    </div>
                    
                    {shifts.length === 0 && reports.length === 0 && (
                         <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-gray-600">Sem atividades recentes</p>
                                <p className="text-xs text-gray-500">Agende novos plantões para ver movimentações aqui.</p>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </>
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

      {activeTab === 'integrations' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
              <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#141C4D] mb-2">Integração Google Workspace</h2>
                  <p className="text-gray-600">Exporte dados e teste a conectividade com o Google Apps Script.</p>
              </div>
              
              <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <h3 className="font-bold text-yellow-800 flex items-center mb-2">
                      <Send size={20} className="mr-2" /> Teste de Email
                  </h3>
                  <p className="text-sm text-yellow-800 mb-4">
                      Clique abaixo para enviar um email de teste para <strong>{currentUser?.email || 'seu email'}</strong>. 
                      Isso validará se o script do Google está enviando emails corretamente.
                  </p>
                  <Button onClick={handleTestEmail} className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-none">
                      Enviar Email de Teste Agora
                  </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-green-100 bg-green-50 p-6 rounded-2xl flex flex-col items-center text-center">
                      <FileSpreadsheet size={48} className="text-green-600 mb-4" />
                      <h3 className="font-bold text-green-800 text-lg">Exportar para Planilhas</h3>
                      <p className="text-sm text-green-700 mb-6">Gera um arquivo CSV compatível com Google Sheets contendo todos os relatórios.</p>
                      <Button onClick={() => exportToGoogleSheets(reports, 'Relatorios_Lifecare')} className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 w-full">
                          <Download size={18} className="mr-2 inline" /> Baixar Dados (.csv)
                      </Button>
                  </div>

                  <div className="border border-blue-100 bg-blue-50 p-6 rounded-2xl flex flex-col items-center text-center">
                      <FileText size={48} className="text-blue-600 mb-4" />
                      <h3 className="font-bold text-blue-800 text-lg">Exportar para Docs</h3>
                      <p className="text-sm text-blue-700 mb-6">Gera um resumo textual dos formulários respondidos para documentação.</p>
                      <Button onClick={() => exportToGoogleDocs(JSON.stringify(forms, null, 2), 'Formularios_Lifecare')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 w-full">
                          <Download size={18} className="mr-2 inline" /> Baixar Resumo (.txt)
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};