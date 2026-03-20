import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { Plus, Clock, ArrowRight, ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon, Activity, Download } from 'lucide-react';
import { 
  format, endOfMonth, endOfWeek, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, isToday 
} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

// Helpers
const startOfMonth = (date: Date) => { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }) => {
  const weekStartsOn = options?.weekStartsOn || 0; const d = new Date(date);
  const day = d.getDay(); const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff); d.setHours(0, 0, 0, 0); return d;
};
const subMonths = (date: Date, amount: number) => { const d = new Date(date); d.setDate(1); d.setMonth(d.getMonth() - amount); return d; };

export const Schedule = () => {
  const { shifts, users, addShift, deleteShift, currentUser, exportToGoogleSheets } = useLifecare();
  const isAdmin = currentUser?.role === 'admin';

  const [showModal, setShowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [filterClientId, setFilterClientId] = useState('');
  const [filterCaregiverId, setFilterCaregiverId] = useState('');

  const [newShift, setNewShift] = useState({ clientId: '', caregiverId: '', date: '', startTime: '07:00', endTime: '19:00' });

  // Padrões de Escala
  const [scalePattern, setScalePattern] = useState('none'); 
  const [bulkUntil, setBulkUntil] = useState('');

  const caregivers = users.filter(u => u.role === 'caregiver');
  const clients = users.filter(u => u.role === 'client');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); 
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const isClient = currentUser?.role === 'client';

  // PRIVACIDADE: Filtra plantões de acordo com a role
  const visibleShifts = shifts.filter(s => {
      if (isAdmin) return true;
      if (isClient) return s.clientId === currentUser?.id;
      return s.caregiverId === currentUser?.id;
  }).filter(s => filterClientId ? s.clientId === filterClientId : true)
    .filter(s => filterCaregiverId ? s.caregiverId === filterCaregiverId : true);

  const exportScheduleInfo = () => {
      const monthShifts = visibleShifts.filter(s => s.startScheduled && isSameMonth(new Date(s.startScheduled), monthStart));
      if (monthShifts.length === 0) {
          alert("Não há plantões agendados neste mês com os filtros atuais.");
          return;
      }
      const sorted = [...monthShifts].sort((a, b) => new Date(a.startScheduled).getTime() - new Date(b.startScheduled).getTime());
      const data = sorted.map(s => ({
          "Data": format(new Date(s.startScheduled), "dd/MM/yyyy"),
          "Status": s.status === 'completed' ? "Realizado" : s.status === 'active' ? "Em Andamento" : "Agendado",
          "Cuidador": s.caregiverName,
          "Cliente/Família": s.clientName,
          "Entrada (Agendada)": format(new Date(s.startScheduled), "HH:mm"),
          "Saida (Agendada)": format(new Date(s.endScheduled), "HH:mm")
      }));
      exportToGoogleSheets(data, `Escala_${format(monthStart, "MM_yyyy")}`);
  };

  const selectedDateShifts = visibleShifts.filter(s => {
      if (!s.startScheduled) return false;
      return isSameDay(new Date(s.startScheduled), selectedDate);
  });

  const monthShifts = visibleShifts.filter(s => s.startScheduled && isSameMonth(new Date(s.startScheduled), monthStart))
      .sort((a, b) => new Date(a.startScheduled).getTime() - new Date(b.startScheduled).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.clientId || !newShift.caregiverId || !newShift.date) return;

    let currentStart = new Date(`${newShift.date}T${newShift.startTime}:00`);
    let currentEnd = new Date(`${newShift.date}T${newShift.endTime}:00`);
    
    // Regra da virada do dia (Plantão Noturno/24h)
    if (currentEnd <= currentStart) currentEnd.setDate(currentEnd.getDate() + 1);

    if (scalePattern === 'none') {
        addShift({
          clientId: newShift.clientId, caregiverId: newShift.caregiverId,
          start: currentStart.toISOString(), end: currentEnd.toISOString()
        });
    } else {
        if (!bulkUntil) return alert("Escolha até qual data a escala deve se repetir!");
        const endDateLimit = new Date(`${bulkUntil}T23:59:59`);
        
        // --- Escalas baseadas em HORAS (12x36, 24x48...) ---
        if (['12x36', '24x24', '24x48', '48x48'].includes(scalePattern)) {
            let cycleHours = 0;
            if (scalePattern === '12x36') cycleHours = 48;
            if (scalePattern === '24x24') cycleHours = 48;
            if (scalePattern === '24x48') cycleHours = 72;
            if (scalePattern === '48x48') cycleHours = 96;

            while (currentStart <= endDateLimit) {
                addShift({ clientId: newShift.clientId, caregiverId: newShift.caregiverId, start: currentStart.toISOString(), end: currentEnd.toISOString() });
                currentStart = new Date(currentStart.getTime() + cycleHours * 60 * 60 * 1000);
                currentEnd = new Date(currentEnd.getTime() + cycleHours * 60 * 60 * 1000);
            }
        } 
        // --- Escalas baseadas em DIAS (5x2, 2x5, 4x4...) ---
        else if (['5x2', '2x5', '3x4', '4x4'].includes(scalePattern)) {
            let workDays = 0;
            let cycleDays = 0;
            if (scalePattern === '5x2') { workDays = 5; cycleDays = 7; }
            if (scalePattern === '2x5') { workDays = 2; cycleDays = 7; }
            if (scalePattern === '3x4') { workDays = 3; cycleDays = 7; }
            if (scalePattern === '4x4') { workDays = 4; cycleDays = 8; }

            let dayInCycle = 0; // Contador de onde estamos no ciclo
            while (currentStart <= endDateLimit) {
                if (dayInCycle < workDays) {
                    addShift({ clientId: newShift.clientId, caregiverId: newShift.caregiverId, start: currentStart.toISOString(), end: currentEnd.toISOString() });
                }
                // Avança 1 dia inteiro
                currentStart.setDate(currentStart.getDate() + 1);
                currentEnd.setDate(currentEnd.getDate() + 1);
                // Roda a engrenagem do ciclo
                dayInCycle = (dayInCycle + 1) % cycleDays;
            }
        }
    }

    setShowModal(false);
    setScalePattern('none');
    setBulkUntil('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-[#141C4D] pl-2">{isAdmin ? 'Agenda Geral' : 'Agenda'}</h1>
        <div className="flex flex-wrap gap-2 items-center">
            {!isClient && (
                <select 
                    className="border p-2 rounded-xl text-sm outline-none focus:border-[#13808E] bg-gray-50 flex-1 md:flex-none cursor-pointer"
                    value={filterClientId}
                    onChange={e => setFilterClientId(e.target.value)}
                >
                    <option value="">Famílias (Todas)</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}
            
            {isAdmin && (
                <select 
                    className="border p-2 rounded-xl text-sm outline-none focus:border-[#13808E] bg-gray-50 flex-1 md:flex-none cursor-pointer"
                    value={filterCaregiverId}
                    onChange={e => setFilterCaregiverId(e.target.value)}
                >
                    <option value="">Equipe (Todos)</option>
                    {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}

            {!isClient && (
                <Button variant="secondary" className="text-sm py-2 px-3 shadow-none border-gray-200" onClick={exportScheduleInfo}>
                    <Download size={16} className="mr-2 inline" /> Exportar View
                </Button>
            )}
            
            {isAdmin && (
                <Button className="text-sm py-2 px-3 shadow-none" onClick={() => setShowModal(true)}>
                    <Plus size={16} className="mr-2 inline" /> Novo
                </Button>
            )}
        </div>
      </div>

      {isClient ? (
        <div className="bg-white rounded-3xl shadow-sm p-6 overflow-y-auto max-h-[75vh]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-xl font-bold text-[#141C4D] capitalize px-2">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-[#13808E] hover:underline px-4 border border-gray-200 rounded-full">Ver Mês Atual</button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronRight size={20} /></button>
                </div>
            </div>
            
            <div className="space-y-4">
               {monthShifts.length === 0 ? (
                  <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed focus:outline-none">Nenhum plantão agendado para este mês.</div>
               ) : (
                  monthShifts.map(shift => (
                     <div key={shift.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-[#13808E] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className="bg-white border border-gray-200 rounded-xl w-14 h-14 flex flex-col items-center justify-center shadow-sm shrink-0">
                               <span className="text-[10px] text-gray-400 font-bold uppercase">{format(new Date(shift.startScheduled), 'MMM', { locale: ptBR })}</span>
                               <span className="text-lg font-bold text-[#141C4D] leading-none">{format(new Date(shift.startScheduled), 'dd')}</span>
                           </div>
                           <div>
                               <p className="font-bold text-[#141C4D] flex items-center gap-2">
                                  {shift.caregiverName}
                               </p>
                               <div className="flex items-center text-xs text-gray-500 gap-1.5 mt-1 font-medium bg-white px-2 py-1 rounded w-fit border border-gray-100">
                                  <Clock size={12} className="text-[#13808E]"/> 
                                  {format(new Date(shift.startScheduled), 'HH:mm')} - {format(new Date(shift.endScheduled), 'HH:mm')}
                               </div>
                           </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide self-start md:self-auto shrink-0 ${shift.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : shift.status === 'active' ? 'bg-[#99FFB6] text-[#141C4D] border border-green-300' : 'bg-white text-gray-500 border border-gray-200'}`}>
                           {shift.status === 'completed' ? 'Realizado' : shift.status === 'active' ? 'Em Andamento' : 'Agendado'}
                        </span>
                     </div>
                  ))
               )}
            </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#141C4D] capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-[#13808E] hover:underline px-2">Hoje</button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                    const hasShift = visibleShifts.some(s => s.startScheduled && isSameDay(new Date(s.startScheduled), day));
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div key={idx} onClick={() => setSelectedDate(day)}
                            className={`h-14 md:h-24 rounded-xl flex flex-col items-center justify-start pt-2 cursor-pointer transition-all border
                                ${isSelected ? 'border-[#13808E] bg-blue-50' : 'border-transparent hover:bg-gray-50'}
                                ${!isCurrentMonth ? 'opacity-30' : ''}`}
                        >
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isTodayDate ? 'bg-[#141C4D] text-white' : 'text-gray-700'}`}>
                                {format(day, 'd')}
                            </span>
                            {hasShift && <div className="mt-1 flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#13808E]"></div></div>}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-[#F5F7FA] lg:bg-transparent">
            <h3 className="text-lg font-bold text-[#141C4D] mb-4 flex items-center">
                <CalendarIcon className="mr-2" size={20} />{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {selectedDateShifts.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border border-dashed border-gray-300">
                        <p>Nenhum plantão para este dia.</p>
                        {isAdmin && (
                            <Button variant="secondary" className="mt-4 text-xs py-2" onClick={() => {
                                setNewShift(prev => ({...prev, date: format(selectedDate, 'yyyy-MM-dd')})); setShowModal(true);
                            }}>+ Adicionar</Button>
                        )}
                    </div>
                ) : (
                    selectedDateShifts.map(shift => (
                        <div key={shift.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-[#13808E] transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${shift.status === 'completed' ? 'bg-green-100 text-green-700' : shift.status === 'active' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {shift.status === 'completed' ? 'Realizado' : shift.status === 'active' ? 'Em Andamento' : 'Agendado'}
                                </span>
                                {isAdmin && (
                                    <button onClick={() => { if(confirm("Excluir?")) deleteShift(shift.id); }} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Excluir"><Trash2 size={16} /></button>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 mb-3">
                                <p className="font-bold text-[#141C4D] text-sm">{shift.caregiverName}</p>
                                <div className="flex items-center text-xs text-gray-400"><ArrowRight size={12} className="mx-1" /><span>{shift.clientName}</span></div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Clock size={14} className="text-[#13808E]" />
                                <span>{format(new Date(shift.startScheduled), 'HH:mm')} - {format(new Date(shift.endScheduled), 'HH:mm')}</span>
                            </div>
                          </div>
                    ))
                )}
            </div>
        </div>
      </div>
      )}

      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#141C4D] mb-6">Agendar Plantão</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                   <select required className="w-full border rounded-xl p-3" value={newShift.clientId} onChange={e => setNewShift({...newShift, clientId: e.target.value})}>
                     <option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Cuidador</label>
                   <select required className="w-full border rounded-xl p-3" value={newShift.caregiverId} onChange={e => setNewShift({...newShift, caregiverId: e.target.value})}>
                     <option value="">Selecione...</option>{caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data (1º Plantão)</label>
                  <input required type="date" className="w-full border rounded-xl p-3" value={newShift.date} onChange={e => setNewShift({...newShift, date: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Hora Entrada</label>
                   <input required type="time" className="w-full border rounded-xl p-3" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Hora Saída</label>
                   <input required type="time" className="w-full border rounded-xl p-3" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} />
                 </div>
               </div>

               {/* ESCALA MÉDICA */}
               <div className="mt-6 border-t pt-4">
                   <label className="block text-sm font-bold text-[#141C4D] mb-3 flex items-center gap-2"><Activity size={18}/> Repetição / Escala</label>
                   <select 
                       className="w-full border rounded-xl p-3 mb-4 bg-gray-50"
                       value={scalePattern}
                       onChange={e => setScalePattern(e.target.value)}
                   >
                       <option value="none">Plantão Único (Não repetir)</option>
                       <option value="12x36">Escala 12x36</option>
                       <option value="24x24">Escala 24x24</option>
                       <option value="24x48">Escala 24x48</option>
                       <option value="48x48">Escala 48x48</option>
                       <option value="5x2">Escala 5x2 (5 dias trab / 2 folgas)</option>
                       <option value="2x5">Escala 2x5 (2 dias trab / 5 folgas)</option>
                       <option value="3x4">Escala 3x4 (3 dias trab / 4 folgas)</option>
                       <option value="4x4">Escala 4x4 (4 dias trab / 4 folgas)</option>
                   </select>

                   {scalePattern !== 'none' && (
                       <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                           <label className="block text-sm font-medium text-[#141C4D] mb-1">Gerar escala até o dia:</label>
                           <input
                               required={scalePattern !== 'none'}
                               type="date"
                               className="w-full border rounded-xl p-3"
                               value={bulkUntil}
                               min={newShift.date}
                               onChange={e => setBulkUntil(e.target.value)}
                           />
                       </div>
                   )}
               </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit">Agendar Escala</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};