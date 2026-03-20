import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { format, isSameDay, endOfWeek, isWithinInterval } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { ClipboardList, Megaphone, Calendar as CalendarIcon, MapPin, Clock, HeartPulse, FileText, ListChecks, Plus, Trash2, Home } from 'lucide-react';

// Helper for startOfWeek (Monday start)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const ClientDashboard = () => {
  const { currentUser, shifts, reports, forms, submitFormResponse, announcements, updateProntuario, updateClientChecklist } = useLifecare();
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'prontuario'>('overview');
  const [responseForm, setResponseForm] = useState<{ [key: string]: string }>({});
  const [prontuarioText, setProntuarioText] = useState(currentUser?.prontuario || '');
  const [showHistory, setShowHistory] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [checklistType, setChecklistType] = useState<'recurrent' | 'specific'>('recurrent');
  const [specificDate, setSpecificDate] = useState('');
  const [specificTime, setSpecificTime] = useState('');

  const todayShift = shifts.find(s => isSameDay(new Date(s.startScheduled), new Date()));
  
  // Weekly Summary Logic
  const today = new Date();
  const start = getStartOfWeek(today);
  const end = endOfWeek(today, { weekStartsOn: 1 });
  const weeklyReports = reports.filter(r => isWithinInterval(new Date(r.date), { start, end }));
  
  const pendingForms = forms.filter(f => 
    (f.targetRole === 'client' || f.targetRole === 'all') && 
    f.active &&
    !f.responses.some(r => r.userId === currentUser?.id)
  );

  // Filter announcements
  const visibleAnnouncements = announcements.filter(a => a.targetRole === 'client' || a.targetRole === 'all');

  const handleFormSubmit = (formId: string) => {
    if (responseForm[formId]) {
      submitFormResponse(formId, responseForm[formId]);
      setResponseForm(prev => ({...prev, [formId]: ''}));
    }
  };

  const handleSaveProntuario = () => {
      if (prontuarioText !== currentUser?.prontuario) {
          updateProntuario(currentUser!.id, prontuarioText);
      }
  };

  const handleAddChecklist = () => {
      if (!newChecklistItem.trim() || !currentUser) return;
      
      if (checklistType === 'specific' && !specificDate) {
          alert("Por favor, selecione uma data para o evento específico.");
          return;
      }

      const currentList = currentUser.customChecklist || [];
      const finalLabel = (checklistType === 'specific' && specificTime) 
          ? `${newChecklistItem} (às ${specificTime})` 
          : newChecklistItem;

      const newItem: any = {
          id: Math.random().toString(36).substr(2, 9),
          label: finalLabel,
          category: 'other',
          completed: false,
          required: true
      };

      if (checklistType === 'recurrent') {
          newItem.daysOfWeek = selectedDays;
      } else {
          newItem.specificDate = specificDate;
          newItem.time = specificTime;
      }

      updateClientChecklist(currentUser.id, [...currentList, newItem]);
      setNewChecklistItem('');
      setSelectedDays([]);
      setSpecificDate('');
      setSpecificTime('');
  };

  const toggleDay = (dayIndex: number) => {
      setSelectedDays(prev => 
          prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
      );
  };

  const handleRemoveChecklist = (id: string) => {
      if (!currentUser) return;
      const currentList = currentUser.customChecklist || [];
      updateClientChecklist(currentUser.id, currentList.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="bg-white p-6 rounded-3xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-[#141C4D]">Olá, {currentUser?.name} 👋</h1>
            <p className="text-gray-500">Acompanhe seus cuidados de hoje.</p>
        </div>
        <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg gap-1">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'overview' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                <Home size={16} className="mr-2" /> Início
            </button>
            <button 
                onClick={() => setActiveTab('checklist')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'checklist' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                <ListChecks size={16} className="mr-2" /> Tarefas / Rotinas
            </button>
            <button 
                onClick={() => setActiveTab('prontuario')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'prontuario' ? 'bg-[#141C4D] text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                <FileText size={16} className="mr-2" /> Quadro de Saúde
            </button>
        </div>
      </header>

      {activeTab === 'overview' && (
      <>

      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
          <div className="space-y-4">
              {visibleAnnouncements.map(ann => (
                  <div key={ann.id} className="bg-gradient-to-r from-blue-50 to-white border-l-4 border-blue-500 p-4 rounded-xl shadow-sm">
                      <h4 className="font-bold text-blue-900 flex items-center mb-1">
                          <Megaphone size={16} className="mr-2" /> {ann.title}
                      </h4>
                      <p className="text-blue-800 text-sm">{ann.message}</p>
                      <p className="text-xs text-blue-400 mt-2 text-right">{format(new Date(ann.date), "dd/MM HH:mm")}</p>
                  </div>
              ))}
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Shift Card */}
        <div className="bg-[#141C4D] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#13808E] rounded-full filter blur-3xl opacity-20 transform translate-x-1/3 -translate-y-1/3"></div>
          
          <h2 className="text-xl font-bold mb-4 flex items-center relative z-10">
            <CalendarIcon className="mr-2 text-[#99FFB6]" /> Plantão de Hoje
          </h2>

          {todayShift ? (
            <div className="relative z-10 space-y-4">
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <p className="text-xs text-[#99FFB6] uppercase tracking-wider mb-1">Cuidador(a)</p>
                <p className="text-xl font-bold">{todayShift.caregiverName}</p>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-xl flex-1">
                  <Clock size={16} className="text-[#99FFB6] mb-2" />
                  <p className="text-sm">Chegada</p>
                  <p className="font-bold">{format(new Date(todayShift.startScheduled), 'HH:mm')}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl flex-1">
                  <Clock size={16} className="text-[#99FFB6] mb-2" />
                  <p className="text-sm">Saída</p>
                  <p className="font-bold">{format(new Date(todayShift.endScheduled), 'HH:mm')}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  todayShift.status === 'active' ? 'bg-[#99FFB6] text-[#141C4D]' : 'bg-gray-600 text-gray-300'
                }`}>
                  {todayShift.status === 'active' ? 'Em Andamento' : todayShift.status === 'completed' ? 'Finalizado' : 'Agendado'}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 py-8 text-center text-gray-400">
              <p>Nenhum plantão agendado para hoje.</p>
            </div>
          )}
        </div>

        {/* Pending Forms & Info */}
        <div className="space-y-6">
          {pendingForms.length > 0 ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100">
              <h3 className="font-bold text-[#141C4D] flex items-center mb-4">
                <ClipboardList className="mr-2 text-orange-500" /> Pesquisas Pendentes
              </h3>
              <div className="space-y-4">
                {pendingForms.map(form => (
                  <div key={form.id} className="p-4 bg-orange-50 rounded-xl">
                    <p className="text-sm font-semibold text-gray-800 mb-2">{form.question}</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Sua resposta..." 
                        className="flex-1 border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={responseForm[form.id] || ''}
                        onChange={e => setResponseForm({...responseForm, [form.id]: e.target.value})}
                      />
                      <Button onClick={() => handleFormSubmit(form.id)} className="h-auto py-2 px-4 text-sm">Enviar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col justify-center items-center text-center h-full">
              <ClipboardList size={48} className="text-gray-200 mb-2" />
              <p className="text-gray-500">Você não tem pesquisas pendentes.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {activeTab === 'checklist' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-[#13808E]">
              <h3 className="text-xl font-bold text-[#141C4D] flex items-center mb-2">
                 <ListChecks className="mr-2 text-[#13808E]" /> Rotinas do Cuidado (Checklist)
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-2xl">
                 Adicione nas caixas de seleção (check) quais são as tarefas certinhas que o cuidador deve seguir durante o plantão. Você pode optar por tarefas que se repetem todos os dias ou em dias específicos.
              </p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 space-y-4">
                 
                 <div className="flex gap-4 border-b border-gray-200 pb-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={checklistType === 'recurrent'} onChange={() => setChecklistType('recurrent')} className="text-[#13808E] focus:ring-[#13808E]" />
                         <span className="text-sm font-bold text-gray-700">Rotina (Dias da Semana)</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={checklistType === 'specific'} onChange={() => setChecklistType('specific')} className="text-[#13808E] focus:ring-[#13808E]" />
                         <span className="text-sm font-bold text-gray-700">Evento Único (Data Específica)</span>
                     </label>
                 </div>

                 <div className="flex flex-col md:flex-row gap-2">
                     <input 
                         type="text" 
                         className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#13808E]"
                         placeholder={checklistType === 'specific' ? "Ex: Consulta no Neurologista..." : "Ex: Dar banho completo, Medicar Losartana 50mg..."}
                         value={newChecklistItem}
                         onChange={e => setNewChecklistItem(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                     />
                     {checklistType === 'specific' && (
                         <div className="flex gap-2">
                             <input type="date" className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#13808E]" value={specificDate} onChange={e => setSpecificDate(e.target.value)} />
                             <input type="time" className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#13808E]" value={specificTime} onChange={e => setSpecificTime(e.target.value)} />
                         </div>
                     )}
                 </div>
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     {checklistType === 'recurrent' ? (
                         <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-500 font-medium mr-2">Aplicar em:</span>
                             {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayChar, idx) => (
                                 <button 
                                     key={idx}
                                     onClick={() => toggleDay(idx)}
                                     className={`w-8 h-8 rounded-full text-xs font-bold transition-colors flex items-center justify-center ${
                                         selectedDays.includes(idx) ? 'bg-[#13808E] text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                     }`}
                                     title="Clique para marcar dia específico. Se nenhum estiver marcado, vale para Todos os Dias."
                                 >
                                     {dayChar}
                                 </button>
                             ))}
                         </div>
                     ) : (
                         <div className="text-sm text-gray-500 italic">
                             Esta tarefa aparecerá na escala do cuidador somente na data selecionada acima.
                         </div>
                     )}
                     <Button onClick={handleAddChecklist} className="bg-[#13808E] hover:bg-[#0f6b78] flex items-center gap-2 whitespace-nowrap">
                         <Plus size={20} /> {checklistType === 'specific' ? 'Agendar Evento' : 'Adicionar Rotina'}
                     </Button>
                 </div>
              </div>

              <div className="space-y-3">
                  {(!currentUser?.customChecklist || currentUser.customChecklist.length === 0) ? (
                      <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-500 border border-dashed border-gray-300">
                          Nenhuma tarefa configurada. Adicione tarefas acima para montar o plano de cuidado da sua família.
                      </div>
                  ) : (
                      currentUser.customChecklist.map(item => (
                          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 group">
                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-5 h-5 rounded border-2 border-[#13808E]/30 bg-white"></div>
                                      <span className="font-medium text-gray-800">{item.label}</span>
                                  </div>
                                  {item.specificDate ? (
                                      <div className="ml-8 md:ml-4 text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center">
                                          <CalendarIcon size={12} className="mr-1" />
                                          {format(new Date(item.specificDate + 'T00:00:00'), 'dd/MM/yyyy')}
                                      </div>
                                  ) : (
                                      item.daysOfWeek && item.daysOfWeek.length > 0 && (
                                         <div className="flex gap-1 ml-8 md:ml-4">
                                             {item.daysOfWeek.map(d => (
                                                 <span key={d} className="text-[10px] font-bold bg-[#13808E]/10 text-[#13808E] px-2 py-0.5 rounded-full">
                                                     {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]}
                                                 </span>
                                             ))}
                                         </div>
                                      )
                                  )}
                              </div>
                              <button 
                                  onClick={() => handleRemoveChecklist(item.id)}
                                  className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Remover Tarefa"
                              >
                                  <Trash2 size={20} />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {activeTab === 'prontuario' && (
      /* PRONTUÁRIO CLÍNICO (Acesso Família/Cliente) */
      <div className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-[#13808E]">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                  <h3 className="text-xl font-bold text-[#141C4D] flex items-center">
                    <HeartPulse className="mr-2 text-[#13808E]" /> Prontuário Compartilhado
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                      <strong>INSTRUÇÕES:</strong> Utilize este espaço para registrar e atualizar livremente o quadro de saúde, alergias, medicações de rotina e observações importantes. Este prontuário é exibido no celular do cuidador antes do plantão iniciar. 
                  </p>
              </div>
              <Button variant="secondary" className="text-xs whitespace-nowrap" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? "Ocultar Histórico" : "Ver Versões Anteriores"}
              </Button>
          </div>

          {!showHistory ? (
              <div className="space-y-4">
                  <textarea 
                      className="w-full border rounded-xl p-4 bg-gray-50 min-h-[150px] outline-none focus:border-[#13808E] resize-y"
                      placeholder="Ex: Alérgico a Dipirona. Diagnóstico de Alzheimer grau leve. Medicações diárias: Losartana 50mg (08:00)..."
                      value={prontuarioText}
                      onChange={(e) => setProntuarioText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end">
                      <Button onClick={handleSaveProntuario} disabled={prontuarioText === currentUser?.prontuario}>Salvar Novo Prontuário</Button>
                  </div>
              </div>
          ) : (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4 max-h-[300px] overflow-y-auto">
                  <h4 className="font-bold text-[#141C4D] mb-4">Histórico de Alterações</h4>
                  {(!currentUser?.prontuarioHistory || currentUser.prontuarioHistory.length === 0) ? (
                      <p className="text-gray-500 text-sm">Nenhuma alteração anterior registrada no sistema.</p>
                  ) : (
                      <div className="space-y-4">
                          {[...(currentUser.prontuarioHistory || [])].reverse().map((h, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                  <div className="flex justify-between text-xs text-gray-400 mb-2 font-semibold">
                                      <span>Data: {format(new Date(h.date), "dd/MM/yyyy 'às' HH:mm")}</span>
                                      <span>Por: {h.author}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{h.text}</p>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </div>
      )}
    </div>
  );
};