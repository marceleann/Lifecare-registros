
import React, { useState, useEffect, useRef } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { LogOut, Menu, X, User as UserIcon, Calendar, Activity, ClipboardList, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Added optional children typing to handle cases where consumers might trigger strict property checks
export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, notifications, refreshData, isLoading, shifts, emergencies } = useLifecare();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // --- AUDIO ALARMS LOGIC (Global for Admin via Web Audio API) ---
  const isAdmin = currentUser?.role === 'admin';
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedLateShiftsRef = useRef<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const [unacknowledgedLates, setUnacknowledgedLates] = useState(false);

  // Web Audio Synth Functions
  const playSirenSweep = () => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          const gain = ctx.createGain();
          
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.8);
          osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.6);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1); // Volume control
          gain.gain.setValueAtTime(0.1, ctx.currentTime + 1.5);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.6);
          
          osc.connect(gain);
          if (panner) {
             gain.connect(panner);
             panner.connect(ctx.destination);
          } else {
             gain.connect(ctx.destination);
          }
          
          osc.start();
          osc.stop(ctx.currentTime + 1.6);
      } catch (e) {
          console.warn("Audio Context blocked:", e);
      }
  };

  useEffect(() => {
     if (!isAdmin) return;
     const interval = setInterval(() => setNow(Date.now()), 60000);
     return () => clearInterval(interval);
  }, [isAdmin]);

  // Late detection
  // We use shifts directly since emergencies are deprecated
  const todayShifts = (shifts || []).filter(s => s.startScheduled && new Date(s.startScheduled).toDateString() === new Date().toDateString());
  const lateShifts = todayShifts.filter(s => {
      if (s.status === 'completed' || s.checkIn || s.acknowledgedLate) return false;
      const scheduledTime = new Date(s.startScheduled).getTime();
      return (now - scheduledTime) > 15 * 60 * 1000;
  });

  useEffect(() => {
      if (!isAdmin) return;
      
      // Request Web Push Notification Permission
      if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
      }

      let hasNew = false;
      lateShifts.forEach(shift => {
          if (!notifiedLateShiftsRef.current.has(shift.id)) {
              hasNew = true;
          }
      });
      
      if (hasNew && !unacknowledgedLates) {
          // Trigger system push notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
              new Notification("🚨 ALERTA LIFECARE: Atraso Grave", {
                  body: "Um ou mais cuidadores ultrapassaram a tolerância de 15 minutos do plantão. Verifique o painel imediatamente.",
                  icon: "/vite.svg"
              });
          }
      }
      
      setUnacknowledgedLates(hasNew);
  }, [lateShifts, isAdmin]);

  useEffect(() => {
      if (!isAdmin) return;
      
      if (unacknowledgedLates) {
          if (!sirenIntervalRef.current) {
              playSirenSweep();
              sirenIntervalRef.current = setInterval(playSirenSweep, 1600);
          }
      } else {
          if (sirenIntervalRef.current) {
              clearInterval(sirenIntervalRef.current);
              sirenIntervalRef.current = null;
          }
      }
      
      return () => {
          if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      }
  }, [unacknowledgedLates, isAdmin]);

  const muteLateAlarms = () => {
      lateShifts.forEach(s => notifiedLateShiftsRef.current.add(s.id));
      setUnacknowledgedLates(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRefresh = async () => {
      await refreshData();
      setIsSidebarOpen(false); // Close mobile menu if open
  };



  const NavItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => (
    <button 
      onClick={() => { navigate(path); setIsSidebarOpen(false); }}
      className="flex items-center space-x-3 w-full p-4 rounded-xl transition-all hover:bg-[#13808E] hover:bg-opacity-20 text-[#141C4D] font-medium"
    >
      <Icon size={20} className="text-[#13808E]" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col md:flex-row relative">
      {unacknowledgedLates && (
         <div className="bg-[#141C4D] text-white p-4 flex flex-col sm:flex-row justify-between items-center fixed top-0 left-0 right-0 z-[100] shadow-xl animate-pulse border-b-4 border-[#13808E]">
             <span className="font-bold flex items-center mb-2 sm:mb-0">
                 🚨 ALERTA GERAL: Cuidadores com atraso prolongado! Vá ao Painel de Monitoramento.
             </span>
             <button onClick={muteLateAlarms} className="bg-[#13808E] text-white px-6 py-2 rounded-xl font-black shadow-lg hover:bg-[#0f606b] hover:scale-105 transition-all whitespace-nowrap">
                 SILENCIAR SIRENE
             </button>
         </div>
      )}
      {/* Notifications Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((msg, i) => (
          <div key={i} className="bg-[#99FFB6] text-[#141C4D] p-4 rounded-lg shadow-lg border-l-4 border-[#13808E] animate-bounce-in">
            {msg}
          </div>
        ))}
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-[#141C4D] p-4 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-2">
           <span className="font-bold text-xl tracking-wider">LIFECARE</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 bg-[#141C4D] text-white flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-wider mt-2">LIFECARE</h1>
            <p className="text-[#99FFB6] text-xs uppercase tracking-widest mt-1">Serviços em Saúde</p>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8 bg-[#F5F7FA] p-3 rounded-xl border border-gray-100">
            <div className="w-12 h-12 rounded-full border-2 border-[#13808E] overflow-hidden bg-white shadow-sm flex-shrink-0">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=13808E&color=fff&bold=true`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[#141C4D] truncate" title={currentUser?.name}>{currentUser?.name}</p>
              <p className="text-xs text-gray-500 capitalize truncate">{currentUser?.role === 'caregiver' ? 'Cuidador(a)' : currentUser?.role}</p>
            </div>
          </div>

          <nav className="space-y-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
            <NavItem icon={ClipboardList} label="Relatórios" path="/reports" />
            <NavItem icon={Calendar} label="Agenda" path="/schedule" />
            {currentUser?.role === 'admin' && (
              <NavItem icon={UserIcon} label="Equipe" path="/team" />
            )}
            
            {/* Sync Button */}
            <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-3 w-full p-4 rounded-xl transition-all text-gray-600 hover:bg-gray-100 font-medium disabled:opacity-50"
            >
                <RefreshCw size={20} className={isLoading ? "animate-spin text-[#13808E]" : "text-gray-500"} />
                <span>{isLoading ? 'Sincronizando...' : 'Sincronizar Dados'}</span>
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
