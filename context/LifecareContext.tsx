
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shift, Report, ChecklistItem, Form, FormResponse, Announcement } from '../types';
import { BASE_CHECKLIST } from '../constants';
import { sendEmail, generateCheckInEmail, generateCheckOutEmail, generateReportEmail, generatePasswordResetEmail } from '../services/emailService';
import { auth, db, saveDoc, addDocument, updateDocument } from '../services/firebaseService';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface LifecareContextType {
  currentUser: User | null;
  users: User[];
  shifts: Shift[];
  reports: Report[];
  forms: Form[];
  announcements: Announcement[];
  isLoading: boolean;
  login: (email: string, role: string, password?: string) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  updateUserPassword: (email: string, newPassword: string) => void; 
  checkIn: (shiftId: string) => Promise<void>;
  checkOut: (shiftId: string) => Promise<void>;
  toggleChecklistItem: (shiftId: string, itemId: string) => void;
  submitReport: (report: Omit<Report, 'id' | 'caregiverName' | 'clientName' | 'date'>) => Promise<void>;
  createForm: (form: Omit<Form, 'id' | 'createdAt' | 'responses'>) => void;
  submitFormResponse: (formId: string, response: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateClientChecklist: (userId: string, checklist: ChecklistItem[]) => void;
  addShift: (shiftData: { caregiverId: string; clientId: string; start: string; end: string }) => void;
  deleteShift: (shiftId: string) => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date' | 'author'>) => void;
  exportToGoogleSheets: (data: any[], filename: string) => void;
  exportToGoogleDocs: (content: string, filename: string) => void;
  notifications: string[];
  resetSystemData: () => void;
  refreshData: () => Promise<void>;
}

const LifecareContext = createContext<LifecareContextType | undefined>(undefined);

export const LifecareProvider = ({ children }: { children?: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Perfil completo carregado via onSnapshot
      } else {
        setCurrentUser(null);
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      const usersData = s.docs.map(d => ({id: d.id, ...d.data()})) as User[];
      setUsers(usersData);
      
      if (auth.currentUser) {
        const profile = usersData.find(u => u.email === auth.currentUser?.email);
        if (profile) setCurrentUser(profile);
      }
      setIsLoading(false);
    });

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (s) => setShifts(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubReports = onSnapshot(collection(db, 'reports'), (s) => setReports(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubForms = onSnapshot(collection(db, 'forms'), (s) => setForms(s.docs.map(d => ({id: d.id, ...d.data()})) as any));
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (s) => {
        const sorted = s.docs.map(d => ({id: d.id, ...d.data()})).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAnnouncements(sorted as any);
    });

    return () => { unsubscribeAuth(); unsubUsers(); unsubShifts(); unsubReports(); unsubForms(); unsubAnn(); };
  }, []);

  const login = async (email: string, role: string, password?: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password || '12345678');
      return true;
    } catch (error) {
      console.error("Login error:", error);
      alert("Credenciais inválidas. Verifique seu email e senha.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => signOut(auth);

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification("Link de redefinição enviado com sucesso.");
      return true;
    } catch (e) {
      alert("Erro ao solicitar redefinição.");
      return false;
    }
  };

  const checkIn = async (shiftId: string) => {
    const now = new Date().toISOString();
    await updateDocument('shifts', shiftId, { status: 'active', checkIn: now });
    addNotification("Check-in sincronizado com o servidor.");
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && currentUser) sendEmail(generateCheckInEmail(currentUser.name, shift.clientName, format(new Date(now), "HH:mm")));
  };

  const checkOut = async (shiftId: string) => {
    const now = new Date().toISOString();
    await updateDocument('shifts', shiftId, { status: 'completed', checkOut: now });
    addNotification("Plantão finalizado e salvo no servidor.");
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && currentUser) sendEmail(generateCheckOutEmail(currentUser.name, shift.clientName, format(new Date(now), "HH:mm")));
  };

  const toggleChecklistItem = async (shiftId: string, itemId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    const newChecklist = shift.checklist.map(i => i.id === itemId ? {...i, completed: !i.completed} : i);
    await updateDocument('shifts', shiftId, { checklist: newChecklist });
  };

  const submitReport = async (reportData: any) => {
    if (!currentUser) return;
    const newReport = {
      ...reportData,
      caregiverName: currentUser.name,
      date: new Date().toISOString()
    };
    await addDocument('reports', newReport);
    addNotification("Relatório salvo no servidor.");
    sendEmail(generateReportEmail(currentUser.name, reportData.clientName || "Cliente", reportData.generalState));
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
    addNotification("Usuário cadastrado no servidor.");
  };

  const updateClientChecklist = async (userId: string, checklist: ChecklistItem[]) => {
    await updateDocument('users', userId, { customChecklist: checklist });
    addNotification("Plano de cuidado atualizado.");
  };

  const addShift = async (shiftData: any) => {
    const caregiver = users.find(u => u.id === shiftData.caregiverId);
    const client = users.find(u => u.id === shiftData.clientId);
    if (!caregiver || !client) return;

    const newShift = {
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      clientId: client.id,
      clientName: client.name,
      startScheduled: shiftData.start,
      endScheduled: shiftData.end,
      status: 'scheduled',
      checklist: client.customChecklist || BASE_CHECKLIST
    };
    await addDocument('shifts', newShift);
    addNotification("Plantão agendado no servidor.");
  };

  const deleteShift = async (id: string) => {
      await deleteDoc(doc(db, 'shifts', id));
      addNotification("Plantão removido do servidor.");
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
      addNotification("Resposta enviada com sucesso.");
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
    setTimeout(() => setNotifications(prev => prev.slice(0, prev.length - 1)), 5000);
  };

  const refreshData = async () => { /* Firebase handles real-time sync */ };
  const resetSystemData = () => { /* No manual reset for production */ };
  const updateUserPassword = () => { /* Use Firebase Auth Reset */ };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141C4D] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-[#99FFB6] mb-4" />
        <h2 className="text-xl font-bold">Conectando ao servidor...</h2>
      </div>
    );
  }

  return (
    <LifecareContext.Provider value={{
      currentUser, users, shifts, reports, forms, announcements, isLoading,
      login, logout, resetPassword, updateUserPassword,
      checkIn, checkOut, toggleChecklistItem, submitReport,
      createForm, submitFormResponse, addUser, updateClientChecklist,
      addShift, deleteShift, addAnnouncement,
      exportToGoogleSheets, exportToGoogleDocs, notifications, resetSystemData, refreshData
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
