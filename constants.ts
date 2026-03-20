import { ChecklistItem, User } from './types';

export const ADMIN_EMAIL = 'marcelojr010102@gmail.com';

// --- CONFIGURAÇÃO EMAILJS ---
export const EMAILJS_SERVICE_ID = 'service_qppmufa'; 
export const EMAILJS_TEMPLATE_ID = 'template_ekqk5ln'; 
export const EMAILJS_PUBLIC_KEY = 'hi5wyhrtIYxwMTsXV'; 

// --- CONFIGURAÇÃO FIREBASE ---
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- CONFIGURAÇÃO GOOGLE DRIVE / SCRIPT ---
export const GOOGLE_SCRIPT_URL = '';
export const DRIVE_FOLDER_ID = '';

// Base Checklist Template
export const BASE_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', label: 'Banho', category: 'hygiene', completed: false, required: true },
  { id: 'c2', label: 'Medicamento Pressão (08:00)', category: 'medication', completed: false, time: '08:00', required: true },
  { id: 'c3', label: 'Café da Manhã', category: 'food', completed: false, required: true },
  { id: 'c4', label: 'Exercícios Leves', category: 'activity', completed: false, required: false },
  { id: 'c5', label: 'Almoço', category: 'food', completed: false, required: true },
  { id: 'c6', label: 'Medicamento Coração (14:00)', category: 'medication', completed: false, time: '14:00', required: true },
];

export const MOCK_USERS: User[] = [
  {
    id: 'admin_initial',
    name: 'Marcelo Jr.',
    email: 'marcelojr010102@gmail.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Marcelo+Jr&background=141C4D&color=fff'
  }
];