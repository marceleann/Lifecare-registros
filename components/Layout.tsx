
import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { LogOut, Menu, X, User as UserIcon, Calendar, Activity, ClipboardList, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Added optional children typing to handle cases where consumers might trigger strict property checks
export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, notifications, refreshData, isLoading } = useLifecare();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col md:flex-row">
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
          <div className="flex items-center space-x-3 mb-8 bg-[#F5F7FA] p-3 rounded-lg">
            <img 
              src={currentUser?.avatar || "https://ui-avatars.com/api/?name=User"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-[#13808E]" 
            />
            <div>
              <p className="text-sm font-bold text-[#141C4D]">{currentUser?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser?.role === 'caregiver' ? 'Cuidador(a)' : currentUser?.role}</p>
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
