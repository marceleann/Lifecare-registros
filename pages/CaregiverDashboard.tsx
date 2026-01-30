import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { format, isSameDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { Clock, MapPin, CheckSquare, Square, Send, AlertTriangle, FileText, Clipboard, Megaphone } from 'lucide-react';

export const CaregiverDashboard = () => {
  const { currentUser, shifts, reports, checkIn, checkOut, toggleChecklistItem, submitReport, forms, submitFormResponse, announcements } = useLifecare();
  const [activeTab, setActiveTab] = useState<'shift' | 'reports'>('shift');
  
  // Find today's active or scheduled shift for this caregiver
  const todayShift = shifts.find(s => 
    s.caregiverId === currentUser?.id && 
    isSameDay(new Date(s.startScheduled), new Date())
  );

  const pendingForms = forms.filter(f => 
    (f.targetRole === 'caregiver' || f.targetRole === 'all') && 
    f.active &&
    !f.responses.some(r => r.userId === currentUser?.id)
  );

  // Filter announcements
  const visibleAnnouncements = announcements.filter(a => a.targetRole === 'caregiver' || a.targetRole === 'all');

  const [reportForm, setReportForm] = useState({
    generalState: '',
    activities: '',
    food: '',
    meds: '',
    notes: '',
    incidents: ''
  });

  const [responseForm, setResponseForm] = useState<{ [key: string]: string }>({});
  const [showReportModal, setShowReportModal] = useState(false);

  const isCheckedIn = todayShift ? !!todayShift.checkIn : false;
  const isCheckedOut = todayShift ? !!todayShift.checkOut : false;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReport({
      ...reportForm,
      shiftId: todayShift?.id || 'manual'
    });
    setShowReportModal(false);
    // Reset form
    setReportForm({ generalState: '', activities: '', food: '', meds: '', notes: '', incidents: '' });
  };

  const handleFormSubmit = (formId: string) => {
    if (responseForm[formId]) {
      submitFormResponse(formId, responseForm[formId]);
      setResponseForm(prev => ({...prev, [formId]: ''}));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#141C4D]">Olá, {currentUser?.name} 👋</h1>
          <p className="text-gray-500">Plantão de hoje: {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant={activeTab === 'shift' ? 'primary' : 'secondary'} onClick={() => setActiveTab('shift')} className="py-2 px-4 text-sm">
                Meu Plantão
            </Button>
             <Button variant={activeTab === 'reports' ? 'primary' : 'secondary'} onClick={() => setActiveTab('reports')} className="py-2 px-4 text-sm">
                Meus Relatórios
            </Button>
        </div>
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

      {/* Pending Forms Alert */}
      {pendingForms.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
              <h3 className="font-bold text-orange-800 flex items-center mb-3">
                  <Clipboard className="mr-2" size={18} /> Formulários Pendentes
              </h3>
              <div className="space-y-3">
                  {pendingForms.map(form => (
                      <div key={form.id} className="bg-white p-3 rounded-lg border border-orange-100">
                          <p className="font-semibold text-gray-800 text-sm mb-1">{form.title}</p>
                          <p className="text-gray-600 text-sm mb-2">{form.question}</p>
                          <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Sua resposta..." 
                                className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                                value={responseForm[form.id] || ''}
                                onChange={e => setResponseForm({...responseForm, [form.id]: e.target.value})}
                              />
                              <Button onClick={() => handleFormSubmit(form.id)} className="py-1 px-3 text-sm h-8">Enviar</Button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'shift' && (
        <>
            {!todayShift ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-3xl">
                <Clock size={64} className="mb-4 text-[#9ED0AF]" />
                <h2 className="text-2xl font-bold text-[#141C4D]">Sem plantões para hoje</h2>
                <p className="mb-4">Aproveite seu dia de descanso!</p>
                <Button onClick={() => setShowReportModal(true)} variant="secondary">
                    Escrever Relatório Avulso
                </Button>
              </div>
            ) : (
                <>
                {/* Main Shift Action Card */}
                <div className="bg-[#141C4D] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-[#13808E] rounded-full filter blur-3xl opacity-20 transform translate-x-1/3 -translate-y-1/3"></div>
                    
                    <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                        <h2 className="text-3xl font-bold mb-2">{todayShift.clientName}</h2>
                        <div className="flex items-center text-[#99FFB6]">
                            <MapPin size={18} className="mr-2" />
                            <span>Rua das Flores, 123 - Apt 401</span>
                        </div>
                        </div>
                        <div className="text-right">
                        <p className="text-sm opacity-70">Horário Previsto</p>
                        <p className="text-xl font-semibold">
                            {format(new Date(todayShift.startScheduled), 'HH:mm')} - {format(new Date(todayShift.endScheduled), 'HH:mm')}
                        </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isCheckedIn && !isCheckedOut && (
                        <Button onClick={() => checkIn(todayShift.id)} className="w-full md:w-auto py-4 text-lg">
                            Confirmar Chegada 📍
                        </Button>
                        )}
                        
                        {(isCheckedIn || isCheckedOut) && (
                        <div className="flex gap-4 flex-wrap">
                            {!isCheckedOut && (
                                <Button onClick={() => checkOut(todayShift.id)} className="flex-1 bg-red-400 hover:bg-red-500 text-white shadow-none">
                                Registrar Saída 🚪
                                </Button>
                            )}
                            <Button onClick={() => setShowReportModal(true)} variant="secondary" className="border-[#99FFB6] text-[#99FFB6] hover:bg-[#99FFB6] hover:text-[#141C4D] flex-1">
                                {isCheckedOut ? 'Complementar Relatório 📝' : 'Escrever Relatório 📝'}
                            </Button>
                        </div>
                        )}
                        
                        {isCheckedOut && (
                            <div className="p-4 bg-white/10 rounded-xl text-center md:col-span-2">
                                Plantão finalizado às {format(new Date(todayShift.checkOut!), 'HH:mm')}
                            </div>
                        )}
                    </div>
                    </div>
                </div>

                {/* Checklist Section */}
                {isCheckedIn && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                    <h3 className="text-xl font-bold text-[#141C4D] mb-6 flex items-center">
                        <CheckSquare className="mr-2 text-[#13808E]" />
                        Checklist de Atividades
                    </h3>
                    
                    <div className="space-y-3">
                        {todayShift.checklist.map((item) => (
                        <div 
                            key={item.id}
                            onClick={() => !isCheckedOut && toggleChecklistItem(todayShift.id, item.id)}
                            className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                            item.completed 
                                ? 'bg-[#F0FFF4] border-[#99FFB6]' 
                                : 'bg-white border-gray-100 hover:border-[#13808E]'
                            } ${isCheckedOut ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-4 transition-colors ${
                            item.completed ? 'bg-[#13808E] text-white' : 'border-2 border-gray-300'
                            }`}>
                            {item.completed && <CheckSquare size={16} />}
                            </div>
                            
                            <div className="flex-1">
                            <p className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                {item.label}
                            </p>
                            {item.time && (
                                <span className="text-xs font-semibold text-[#13808E] bg-[#E0F2F1] px-2 py-0.5 rounded">
                                {item.time}
                                </span>
                            )}
                            </div>
                            
                            {item.required && <span className="text-xs text-red-400 font-medium">Obrigatório</span>}
                        </div>
                        ))}
                    </div>
                    </div>
                )}
                </>
            )}
        </>
      )}

      {activeTab === 'reports' && (
          <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-[#141C4D] mb-6 flex items-center">
                  <FileText className="mr-2 text-[#13808E]" />
                  Meus Relatórios Enviados
              </h3>
              <div className="space-y-4">
                  {reports.filter(r => r.caregiverName === currentUser?.name).length === 0 ? (
                      <p className="text-gray-500">Nenhum relatório encontrado.</p>
                  ) : (
                      reports.filter(r => r.caregiverName === currentUser?.name).map(report => (
                          <div key={report.id} className="border p-4 rounded-xl border-gray-100 hover:border-[#13808E] transition-colors">
                              <div className="flex justify-between mb-2">
                                  <span className="font-bold text-[#141C4D]">{report.clientName}</span>
                                  <span className="text-sm text-gray-500">{format(new Date(report.date), "dd/MM/yyyy HH:mm")}</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2"><strong>Geral:</strong> {report.generalState}</p>
                              {report.incidents && (
                                  <div className="text-xs bg-red-50 text-red-600 p-2 rounded">
                                      🚨 {report.incidents}
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#141C4D]">Relatório do Plantão</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <Square size={24} className="rotate-45" /> {/* Close icon hack */}
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Geral</label>
                <textarea 
                  required
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-[#13808E] outline-none h-24"
                  placeholder="Como o paciente estava hoje?"
                  value={reportForm.generalState}
                  onChange={e => setReportForm({...reportForm, generalState: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alimentação</label>
                  <input 
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-[#13808E] outline-none"
                    placeholder="O que comeu?"
                    value={reportForm.food}
                    onChange={e => setReportForm({...reportForm, food: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicamentos</label>
                  <input 
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-[#13808E] outline-none"
                    placeholder="Algum problema na administração?"
                    value={reportForm.meds}
                    onChange={e => setReportForm({...reportForm, meds: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atividades Realizadas</label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-[#13808E] outline-none h-20"
                  placeholder="Exercícios, banho, lazer..."
                  value={reportForm.activities}
                  onChange={e => setReportForm({...reportForm, activities: e.target.value})}
                />
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <label className="block text-sm font-bold text-red-700 mb-1 flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  Intercorrências (Se houver)
                </label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-red-200 focus:border-red-400 outline-none bg-white"
                  placeholder="Descreva qualquer problema ou acidente..."
                  value={reportForm.incidents}
                  onChange={e => setReportForm({...reportForm, incidents: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowReportModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex items-center">
                  <Send size={18} className="mr-2" /> Enviar Relatório
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};