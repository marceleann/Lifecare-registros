import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';

export const ResetPassword = () => {
  const { updateUserPassword } = useLifecare();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email'); // Capture email from link

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    
    if (email) {
        updateUserPassword(email, password);
    }
    
    // Simulate API call to update password
    setTimeout(() => {
      setIsSubmitted(true);
    }, 500);
  };

  if (!token) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                  <h2 className="text-xl font-bold text-red-500 mb-2">Link Inválido</h2>
                  <p className="text-gray-600 mb-6">O link de redefinição expirou ou é inválido.</p>
                  <Button onClick={() => navigate('/')}>Voltar ao Login</Button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#141C4D] to-[#13808E] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        
        {isSubmitted ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Senha Alterada!</h2>
            <p className="text-gray-600 mb-8">Sua senha foi atualizada com sucesso.</p>
            <Button fullWidth onClick={() => navigate('/')}>
              Ir para Login
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#141C4D]">Nova Senha</h2>
              <p className="text-gray-500 text-sm">
                 {email ? `Definindo senha para: ${email}` : 'Crie uma nova senha segura.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                <div className="relative">
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    />
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Senha</label>
                <div className="relative">
                    <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#13808E] outline-none"
                    placeholder="••••••••"
                    required
                    />
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <Button type="submit" fullWidth>
                Redefinir Senha
              </Button>
            </form>

            <button 
                onClick={() => navigate('/')}
                className="mt-6 flex items-center justify-center w-full text-sm text-gray-500 hover:text-[#13808E]"
            >
                <ArrowLeft size={16} className="mr-2" /> Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};