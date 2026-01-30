import emailjs from '@emailjs/browser';
import { 
  ADMIN_EMAIL, 
  EMAILJS_SERVICE_ID, 
  EMAILJS_TEMPLATE_ID, 
  EMAILJS_PUBLIC_KEY 
} from '../constants';

interface EmailPayload {
  subject: string;
  body: string;
}

// Inicializa o EmailJS (se a chave estiver presente)
if (EMAILJS_PUBLIC_KEY && (EMAILJS_PUBLIC_KEY as string) !== 'public_key') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

export const sendEmail = async (payload: EmailPayload, to: string = ADMIN_EMAIL): Promise<boolean> => {
  console.log(`[EmailService] Iniciando envio real via EmailJS para: ${to}`);

  // Verifica se as chaves foram configuradas
  if ((EMAILJS_SERVICE_ID as string) === 'service_id' || (EMAILJS_PUBLIC_KEY as string) === 'public_key') {
      console.warn("[EmailService] CHAVES EMAILJS NÃO CONFIGURADAS em constants.ts");
      alert("ERRO DE CONFIGURAÇÃO: As chaves do EmailJS não foram configuradas no arquivo constants.ts. O email não será enviado.");
      return false;
  }

  try {
      // Parâmetros que correspondem às variáveis no seu Template do EmailJS
      // No painel do EmailJS, crie um template com: {{subject}}, {{message}}, {{to_email}}
      const templateParams = {
          subject: payload.subject,
          message: payload.body,
          to_email: to,
          from_name: "Lifecare App"
      };

      await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
      );

      console.log("[EmailService] Email enviado com sucesso!");
      return true;

  } catch (error) {
      console.error("[EmailService] FALHA AO ENVIAR EMAIL:", error);
      alert(`Falha ao enviar email: ${JSON.stringify(error)}`);
      return false;
  }
};

export const generateCheckInEmail = (caregiverName: string, clientName: string, time: string) => ({
  subject: `[Lifecare] ✅ Plantão Confirmado - ${caregiverName}`,
  body: `O cuidador(a) ${caregiverName} iniciou o plantão com ${clientName} às ${time}.`
});

export const generateCheckOutEmail = (caregiverName: string, clientName: string, time: string) => ({
  subject: `[Lifecare] 🚪 Saída Registrada - ${caregiverName}`,
  body: `O cuidador(a) ${caregiverName} finalizou o plantão com ${clientName} às ${time}.`
});

export const generateReportEmail = (caregiverName: string, clientName: string, reportContent: string) => ({
  subject: `[Lifecare] 📋 Novo Relatório - ${clientName}`,
  body: `Relatório enviado por ${caregiverName}:\n\n${reportContent}`
});

export const generateLateAlertEmail = (caregiverName: string, clientName: string, delay: string) => ({
  subject: `🚨 URGENTE: ATRASO DE ${delay.toUpperCase()} - ${caregiverName.toUpperCase()}`,
  body: `ATENÇÃO ADMINISTRADOR,\n\nO cuidador(a) ${caregiverName} NÃO registrou a entrada para o plantão com ${clientName}.\n\nTempo de atraso estimado: ${delay}.\n\nFavor entrar em contato imediatamente.`
});

export const getResetLink = (email: string) => {
    const baseUrl = window.location.href.split('#')[0]; 
    return `${baseUrl}#/reset-password?token=${Math.random().toString(36).substr(2)}&email=${encodeURIComponent(email)}`;
}

export const generatePasswordResetEmail = (email: string) => {
  const link = getResetLink(email);
  return {
    subject: `[Lifecare] Redefinição de Senha`,
    body: `Olá,\n\nRecebemos uma solicitação para redefinir a senha da conta associada a ${email}.\n\nPara criar uma nova senha, clique no link abaixo:\n\n${link}\n\nSe você não solicitou isso, ignore este e-mail.`
  };
};