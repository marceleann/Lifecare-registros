export type UserRole = 'admin' | 'caregiver' | 'client';

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'hygiene' | 'medication' | 'food' | 'activity' | 'other';
  completed: boolean;
  time?: string;
  required: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string; // Campo de senha adicionado para segurança e validação
  customChecklist?: ChecklistItem[]; // New: Custom activities per client
}

export interface Shift {
  id: string;
  caregiverId: string;
  caregiverName: string;
  clientId: string;
  clientName: string;
  startScheduled: string; // ISO String
  endScheduled: string; // ISO String
  checkIn?: string; // ISO String
  checkOut?: string; // ISO String
  status: 'scheduled' | 'active' | 'completed' | 'missed';
  checklist: ChecklistItem[];
}

export interface Report {
  id: string;
  shiftId: string;
  caregiverName: string;
  clientName: string;
  date: string;
  generalState: string;
  activities: string;
  food: string;
  meds: string;
  notes: string;
  incidents: string;
}

export interface FormResponse {
  userId: string;
  userName: string;
  response: string;
  date: string;
}

export interface Form {
  id: string;
  title: string;
  question: string;
  targetRole: 'client' | 'caregiver' | 'all';
  active: boolean;
  responses: FormResponse[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetRole: 'client' | 'caregiver' | 'all';
  date: string;
  author: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  timestamp: Date;
}