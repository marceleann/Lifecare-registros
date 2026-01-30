import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { format, isSameDay, endOfWeek, isWithinInterval } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { ClipboardList, Megaphone, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

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
  const { currentUser, shifts, reports, forms, submitFormResponse, announcements } = useLifecare();
  const [responseForm, setResponseForm] = useState<{ [key: string]: string }>({});

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

  return (
    <div className="space-y-6">
      <header className="bg-white p-6 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-bold text-[#141C4D]">Olá, {currentUser?.name} 👋</h1>
        <p className="text-gray-500">Acompanhe seus cuidados de hoje.</p>
      </header>

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

      {/* Weekly Summary */}
      <div className="bg-white p-6 rounded-3xl shadow-sm">
        <h3 className="text-xl font-bold text-[#141C4D] mb-4">Resumo da Semana</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium">Cuidador</th>
                <th className="pb-3 font-medium">Estado Geral</th>
              </tr>
            </thead>
            <tbody>
              {weeklyReports.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400 text-sm">Nenhum relatório nesta semana.</td>
                </tr>
              ) : (
                weeklyReports.map(report => (
                  <tr key={report.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-sm font-semibold text-[#141C4D]">
                      {format(new Date(report.date), "dd/MM (EEE)", { locale: ptBR })}
                    </td>
                    <td className="py-3 text-sm text-gray-600">{report.caregiverName}</td>
                    <td className="py-3 text-sm text-gray-600 truncate max-w-xs">{report.generalState}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};