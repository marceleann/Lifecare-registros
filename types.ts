export type UserRole = 'admin' | 'caregiver' | 'client';

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'hygiene' | 'medication' | 'food' | 'activity' | 'other';
  completed: boolean;
  time?: string;
  required: boolean;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  specificDate?: string; // YYYY-MM-DD format
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'caregiver' | 'client';
  avatar?: string;
  customChecklist?: ChecklistItem[]; // Apenas para clients
  prontuario?: string;
  prontuarioHistory?: { date: string; text: string; author: string }[];
}

export interface Shift {
  id: string;
  caregiverId: string;
  caregiverName: string;
  clientId: string;
  clientName: string;
  startScheduled: string;
  endScheduled: string;
  checkIn?: string;
  checkOut?: string;
  handoverNote?: string; // Passagem de plantão
  status: 'scheduled' | 'active' | 'completed';
  checklist: ChecklistItem[];
}

export interface Emergency {
  id: string;
  caregiverId: string;
  caregiverName: string;
  clientId: string;
  clientName: string;
  timestamp: string;
  status: 'active' | 'resolved';
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