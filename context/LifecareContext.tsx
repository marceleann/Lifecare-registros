import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shift, Report, ChecklistItem, Form, Announcement, Emergency } from '../types';
import { BASE_CHECKLIST } from '../constants';
import { sendEmail, generateCheckInEmail, generateCheckOutEmail, generateReportEmail } from '../services/emailService';
import { 
  auth, 
  db, 
  saveDoc, 
  addDocument, 
  updateDocument,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from '../services/firebaseService';
import { collection, onSnapshot, doc, deleteDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface LifecareContextType {
  currentUser: User | null;
  users: User[];
  shifts: Shift[];
  reports: Report[];
  forms: Form[];
  announcements: Announcement[];
  emergencies: Emergency[];
  isLoading: boolean;
  login: (email: string, role: string, password?: string) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;

  checkIn: (shiftId: string) => Promise<void>;
  checkOut: (shiftId: string, handoverNote?: string) => Promise<void>;
  toggleChecklistItem: (shiftId: string, itemId: string) => void;
  submitReport: (report: Omit<Report, 'id' | 'caregiverName' | 'clientName' | 'date'>) => Promise<void>;
  createForm: (form: Omit<Form, 'id' | 'createdAt' | 'responses'>) => void;
  submitFormResponse: (formId: string, response: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateClientChecklist: (userId: string, checklist: ChecklistItem[]) => void;
  updateAvatar: (base64String: string) => Promise<void>;
  updateProntuario: (userId: string, newText: string) => Promise<void>;
  triggerSOS: (clientId: string, clientName: string) => Promise<void>;
  resolveEmergency: (emergencyId: string) => Promise<void>;
  addShift: (shiftData: { caregiverId: string; clientId: string; start: string; end: string }) => void;
  deleteShift: (shiftId: string) => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date' | 'author'>) => void;
  exportToGoogleSheets: (data: any[], filename: string) => void;
  exportToGoogleDocs: (content: string, filename: string) => void;
  notifications: string[];
  resetSystemData: () => void;
  refreshData: () => Promise<void>;
  acknowledgeLate: (shiftId: string) => Promise<void>;
}

const LifecareContext = createContext<LifecareContextType | undefined>(undefined);

export const LifecareProvider = ({ children }: { children?: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      const usersData = s.docs.map(d => ({id: d.id, ...d.data()})) as User[];
      setUsers(usersData);
      
      if (auth.currentUser) {
        const profile = usersData.find(u => u.email.trim().toLowerCase() === auth.currentUser?.email?.trim().toLowerCase());
        if (profile) setCurrentUser(profile);
      }
      setIsLoading(false);
      clearTimeout(safetyTimer);
    }, (error) => {
      console.error("Erro Firestore:", error);
      setIsLoading(false);
      clearTimeout(safetyTimer);
    });

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (s) => setShifts(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubReports = onSnapshot(collection(db, 'reports'), (s) => setReports(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubForms = onSnapshot(collection(db, 'forms'), (s) => setForms(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (s) => {
        const sorted = s.docs.map(d => ({id: d.id, ...d.data()})).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAnnouncements(sorted as any);
    });
    const unsubSOS = onSnapshot(collection(db, 'emergencies'), (s) => setEmergencies(s.docs.map(d => ({id: d.id, ...d.data()})) as any));

    return () => { 
      unsubscribeAuth(); 
      unsubUsers(); 
      unsubShifts(); 
      unsubReports(); 
      unsubForms(); 
      unsubAnn();
      unsubSOS();
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (email: string, role: string, password?: string) => {
    try {
      setIsLoading(true);
      if (!password) {
        throw new Error("Senha é obrigatória");
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      
      const userEmailFormatado = email.trim().toLowerCase();
      
      // OPTIMIZATION: Check the already-synced users array instead of making a new getDocs network call
      // which eliminates 50% of the login delay!
      let profile = users.find(u => u.email.trim().toLowerCase() === userEmailFormatado);

      if (!profile) {
        console.log("Criando perfil no Firestore automaticamente...");
        let assumedRole = 'client';
        if (userEmailFormatado === 'marcelojr010102@gmail.com') assumedRole = 'admin';
        else if (userEmailFormatado.includes('cuidador')) assumedRole = 'caregiver';

        const newProfileData = {
          name: userEmailFormatado.split('@')[0],
          email: userEmailFormatado,
          role: assumedRole,
          avatar: `https://ui-avatars.com/api/?name=${userEmailFormatado.split('@')[0]}&background=random`
        };

        const docRef = await addDoc(collection(db, 'users'), newProfileData);
        profile = { id: docRef.id, ...newProfileData } as User;
      }
      
      setCurrentUser(profile); 
      return true;
    } catch (error: any) {
      console.error("Erro no Login:", error);
      
      let errorMessage = "Erro ao fazer login. Verifique suas credenciais.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "Email ou senha incorretos.";
      } else if (error.message === "Senha é obrigatória") {
        errorMessage = "Por favor, digite sua senha.";
      }
      
      alert(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => signOut(auth);

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification("Link enviado com sucesso.");
      return true;
    } catch (e: any) {
      console.error("Erro resetPassword:", e);
      let msg = "Erro ao solicitar redefinição de senha.";
      if (e.code === 'auth/user-not-found') {
        msg = "Nenhuma conta encontrada com este email.";
      } else if (e.code === 'auth/invalid-email') {
        msg = "Email inválido. Verifique o formato.";
      } else if (e.code === 'auth/too-many-requests') {
        msg = "Muitas tentativas. Aguarde alguns minutos.";
      } else if (e.code === 'auth/invalid-api-key') {
        msg = "Erro de configuração: API Key do Firebase inválida. Verifique as variáveis de ambiente.";
      } else if (e.code === 'auth/unauthorized-continue-uri') {
        msg = "Domínio não autorizado no Firebase. Adicione o domínio nas configurações do Firebase Auth.";
      } else if (e.message) {
        msg = `Erro: ${e.message}`;
      }
      alert(msg);
      return false;
    }
  };

  const checkIn = async (shiftId: string) => {
    const now = new Date().toISOString();
    await updateDocument('shifts', shiftId, { status: 'active', checkIn: now });
    addNotification("Check-in confirmado.");
  };

  const checkOut = async (shiftId: string, handoverNote: string = "") => {
    const now = new Date().toISOString();
    await updateDocument('shifts', shiftId, { status: 'completed', checkOut: now, handoverNote });
    addNotification(handoverNote ? "Plantão finalizado com passagem de plantão." : "Plantão finalizado.");
  };

  const toggleChecklistItem = async (shiftId: string, itemId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    const newChecklist = shift.checklist.map(i => i.id === itemId ? {...i, completed: !i.completed} : i);
    await updateDocument('shifts', shiftId, { checklist: newChecklist });
  };

  const acknowledgeLate = async (shiftId: string) => {
    await updateDocument('shifts', shiftId, { acknowledgedLate: true });
    addNotification("Atraso marcado como visto.");
  };

  const submitReport = async (reportData: any) => {
    if (!currentUser) return;
    // Resolve clientName and clientId from the associated shift
    const shift = shifts.find(s => s.id === reportData.shiftId);
    const newReport = {
      ...reportData,
      caregiverName: currentUser.name,
      clientName: shift?.clientName || 'Não identificado',
      clientId: shift?.clientId || '',
      date: new Date().toISOString()
    };
    await addDocument('reports', newReport);
    addNotification("Relatório salvo.");
    sendEmail(generateReportEmail(currentUser.name, newReport.clientName, reportData.generalState));
  };

  const addUser = async (userData: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newUser = {
      ...userData,
      id,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
      customChecklist: userData.role === 'client' ? BASE_CHECKLIST : null
    };
    await saveDoc('users', id, newUser);
    addNotification("Usuário cadastrado.");
  };

  const updateClientChecklist = async (userId: string, checklist: ChecklistItem[]) => {
    await updateDocument('users', userId, { customChecklist: checklist });
    addNotification("Plano de cuidado atualizado.");
  };

  const updateAvatar = async (base64String: string) => {
    if (!currentUser) return;
    await updateDocument('users', currentUser.id, { avatar: base64String });
    addNotification("Foto de perfil atualizada com sucesso!");
  };

  const updateProntuario = async (userId: string, newText: string) => {
      const client = users.find(u => u.id === userId);
      if (!client || !currentUser) return;
      
      const newHistoryItem = {
          date: new Date().toISOString(),
          text: newText,
          author: currentUser.name
      };

      const history = client.prontuarioHistory ? [...client.prontuarioHistory, newHistoryItem] : [newHistoryItem];
      await updateDocument('users', userId, { prontuario: newText, prontuarioHistory: history });
      addNotification("Prontuário salvo com sucesso!");
  };

  const triggerSOS = async (clientId: string, clientName: string) => {
      if (!currentUser) return;
      await addDocument('emergencies', {
          caregiverId: currentUser.id,
          caregiverName: currentUser.name,
          clientId,
          clientName,
          status: 'active',
          timestamp: new Date().toISOString()
      });
  };

  const resolveEmergency = async (emergencyId: string) => {
      await updateDocument('emergencies', emergencyId, { status: 'resolved' });
  };

  const addShift = async (shiftData: any) => {
    const caregiver = users.find(u => u.id === shiftData.caregiverId);
    const client = users.find(u => u.id === shiftData.clientId);
    if (!caregiver || !client) return;

    const shiftDateObj = new Date(shiftData.start);
    const shiftDay = shiftDateObj.getDay();
    const shiftDateStr = format(shiftDateObj, 'yyyy-MM-dd');
    let shiftChecklist = BASE_CHECKLIST;
    if (client.customChecklist && client.customChecklist.length > 0) {
        shiftChecklist = client.customChecklist.filter(item => {
            if (item.specificDate) {
                return item.specificDate === shiftDateStr;
            }
            if (item.daysOfWeek && item.daysOfWeek.length > 0) {
                return item.daysOfWeek.includes(shiftDay);
            }
            return true; // Aplica todo dia se não tiver specificDate nem daysOfWeek
        });
    }

    const newShift = {
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      clientId: client.id,
      clientName: client.name,
      startScheduled: shiftData.start,
      endScheduled: shiftData.end,
      status: 'scheduled',
      checklist: shiftChecklist
    };
    await addDocument('shifts', newShift);
    addNotification("Plantão agendado.");
  };

  const deleteShift = async (id: string) => {
      await deleteDoc(doc(db, 'shifts', id));
      addNotification("Plantão removido.");
  };

  const addAnnouncement = async (annData: any) => {
      await addDocument('announcements', {
          ...annData,
          author: currentUser?.name || 'Admin',
          date: new Date().toISOString()
      });
      addNotification("Comunicado publicado.");
  };

  const createForm = async (formData: any) => {
      await addDocument('forms', {
          ...formData,
          createdAt: new Date().toISOString(),
          responses: []
      });
      addNotification("Formulário enviado.");
  };

  const submitFormResponse = async (formId: string, responseText: string) => {
      if (!currentUser) return;
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      
      const newResponse = {
          userId: currentUser.id,
          userName: currentUser.name,
          date: new Date().toISOString(),
          response: responseText
      };
      
      await updateDocument('forms', formId, {
          responses: [...form.responses, newResponse]
      });
      addNotification("Resposta enviada.");
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
    setTimeout(() => setNotifications(prev => prev.slice(0, prev.length - 1)), 5000);
  };

  const refreshData = async () => { };
  const resetSystemData = () => {  };


  const exportToGoogleSheets = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToGoogleDocs = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Evita o "piscar" (flash) da tela de login durante os milissegundos do cold start do Firebase Auth
  if (isLoading && !currentUser) return null;
  
  return (
    <LifecareContext.Provider value={{
      currentUser, users, shifts, reports, forms, announcements, isLoading,
      login, logout, resetPassword,
      checkIn, checkOut, toggleChecklistItem, submitReport,
      createForm, submitFormResponse, addUser, updateClientChecklist,
      updateAvatar, updateProntuario, triggerSOS, resolveEmergency,
      addShift, deleteShift, addAnnouncement,
      exportToGoogleSheets,        exportToGoogleDocs,
        notifications,
        resetSystemData,
        refreshData,
        acknowledgeLate, emergencies
      }}>
      {children}
    </LifecareContext.Provider>
  );
};

export const useLifecare = () => {
  const context = useContext(LifecareContext);
  if (!context) throw new Error("useLifecare must be used within a LifecareProvider");
  return context;
};