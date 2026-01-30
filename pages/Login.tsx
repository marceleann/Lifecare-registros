import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { User, ShieldCheck, Activity, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export const Login = () => {
  const { login, resetPassword } = useLifecare();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot'>('login');
  
  const [selectedRole, setSelectedRole] = useState<'client' | 'caregiver' | 'admin'>('caregiver');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => { // <--- Adicione 'async' aqui
    e.preventDefault();
    const success = await login(email, selectedRole, password); // <--- Adicione 'await' aqui também!
    if (success) { // <-- Agora 'success' já é o valor resolvido da Promise
        navigate('/dashboard');
    }
};

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    
    // Chama o serviço real de EmailJS
    const success = await resetPassword(resetEmail);
    
    setIsResetting(false);
    if (success) {
        setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#141C4D] to-[#13808E]">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Left Side: Brand */}
        <div className="md:w-1/2 p-10 bg-[#141C4D] text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] opacity-10 bg-cover bg-center" />
          
          <div className="relative z-10">
             <h1 className="text-4xl font-bold mb-2 tracking-tight">LIFECARE</h1>
             <p className="text-[#99FFB6] tracking-widest text-sm uppercase mb-8">Serviços em Saúde</p>
             <p className="text-gray-300 text-lg font-light italic">"Tranquilidade para você. Cuidado para quem você ama."</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white relative">
          
          {view === 'login' ? (
            <>
              <h2 className="text-2xl font-bold text-[#141C4D] mb-6">Bem-vindo(a)</h2>
              
              {/* Role Selectors */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <button
                  onClick={() => setSelectedRole('client')}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${selectedRole === 'client' ? 'bg-[#13808E] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <User size={24} className="mb-1" />
                  <span className="text-xs font-medium">Cliente</span>
                </button>
                <button
                  onClick={() => setSelectedRole('caregiver')}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${selectedRole === 'caregiver' ? 'bg-[#13808E] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <Activity size={24} className="mb-1" />
                  <span className="text-xs font-medium">Cuidador</span>
                </button>
                <button
                  onClick={() => setSelectedRole('admin')}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${selectedRole === 'admin' ? 'bg-[#13808E] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <ShieldCheck size={24} className="mb-1" />
                  <span className="text-xs font-medium">Admin</span>
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs text-[#13808E] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </div>

                <Button type="submit" fullWidth>
                  Entrar
                </Button>
              </form>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setView('login'); setResetSent(false); }}
                className="flex items-center text-sm text-gray-500 hover:text-[#13808E] mb-6 transition-colors"
              >
                <ArrowLeft size={16} className="mr-2" /> Voltar ao Login
              </button>
              
              {resetSent ? (
                  <div className="text-center py-8 animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Email Enviado!</h2>
                    <p className="text-gray-600 mb-8 text-sm">
                        Enviamos um link de redefinição para <strong>{resetEmail}</strong>.<br/>
                        Verifique sua caixa de entrada e spam.
                    </p>
                    <Button fullWidth onClick={() => { setView('login'); setResetSent(false); }}>
                      Voltar para o Login
                    </Button>
                  </div>
              ) : (
                  <>
                    <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Recuperar Senha</h2>
                    <p className="text-gray-500 text-sm mb-6">Digite seu email para receber um link de redefinição de senha real.</p>
                    
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email cadastrado</label>
                        <input 
                            type="email" 
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] focus:border-transparent outline-none transition-all"
                            placeholder="exemplo@email.com"
                            required
                        />
                        </div>

                        <Button type="submit" fullWidth disabled={isResetting}>
                        {isResetting ? 'Enviando...' : 'Enviar Link de Recuperação'}
                        </Button>
                    </form>
                  </>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};