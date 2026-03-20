import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ArrowLeft, Info } from 'lucide-react';

export const ResetPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#141C4D] to-[#13808E] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="text-blue-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#141C4D] mb-2">Redefinição de Senha</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Para redefinir sua senha, volte à tela de login e clique em <strong>"Esqueci minha senha"</strong>. 
          Você receberá um link oficial do Firebase no seu email para criar uma nova senha com segurança.
        </p>
        <Button fullWidth onClick={() => navigate('/')}>
          Voltar ao Login
        </Button>
      </div>
    </div>
  );
};