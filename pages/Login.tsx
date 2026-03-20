import React, { useState, useEffect } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export const Login = () => {
  // 1. Adicionamos o currentUser aqui para o Login saber quando o utilizador está pronto
  const { login, resetPassword, currentUser, isLoading } = useLifecare();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(''); 

  // 2. O truque da paciência: Se o currentUser existir (carregou do banco), vai para o dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Agora só verificamos se deu erro. O sucesso é tratado pelo useEffect acima!
    const success = await login(email, '', password); 
    
    if (!success) {
        setError('Falha ao entrar. Verifique email e senha.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    const success = await resetPassword(resetEmail);
    setIsResetting(false);
    if (success) {
        setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#141C4D] to-[#13808E]">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Lado Esquerdo: Marca */}
        <div className="md:w-1/2 p-10 bg-[#141C4D] text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] opacity-10 bg-cover bg-center" />
          <div className="relative z-10">
             <h1 className="text-4xl font-bold mb-2 tracking-tight">LIFECARE</h1>
             <p className="text-[#99FFB6] tracking-widest text-sm uppercase mb-8">Serviços em Saúde</p>
             <p className="text-gray-300 text-lg font-light italic">"Tranquilidade para você. Cuidado para quem você ama."</p>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white relative">
          
          {view === 'login' ? (
            <>
              <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Bem-vindo(a)</h2>
              <p className="text-gray-500 mb-8">Insira suas credenciais para acessar.</p>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
                  {error}
                </div>
              )}

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
                    required
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

                <Button type="submit" fullWidth disabled={isLoading}>
                  {isLoading ? 'Processando...' : 'Entrar no Sistema'}
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
                        Verifique sua caixa de entrada.
                    </p>
                    <Button fullWidth onClick={() => { setView('login'); setResetSent(false); }}>
                      Voltar para o Login
                    </Button>
                  </div>
              ) : (
                  <>
                    <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Recuperar Senha</h2>
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email cadastrado</label>
                        <input 
                            type="email" 
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] focus:border-transparent outline-none transition-all"
                            required
                        />
                        </div>
                        <Button type="submit" fullWidth disabled={isResetting}>
                        {isResetting ? 'Enviando...' : 'Enviar Link'}
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