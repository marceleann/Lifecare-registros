import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LifecareProvider, useLifecare } from './context/LifecareContext';
import { Login } from './pages/Login';
import { CaregiverDashboard } from './pages/CaregiverDashboard';
import { ClientDashboard } from './pages/ClientDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Reports } from './pages/Reports';
import { Team } from './pages/Team';
import { Schedule } from './pages/Schedule';
import { ResetPassword } from './pages/ResetPassword';
import { Layout } from './components/Layout';

// Protected Route Wrapper - explicitly type children as optional to resolve 'property missing' errors in strict JSX environments
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles: string[] }) => {
  const { currentUser } = useLifecare();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    const dashboardMap: Record<string, string> = {
      'admin': '/admin',
      'client': '/client',
      'caregiver': '/caregiver'
    };
    return <Navigate to={dashboardMap[currentUser.role]} replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route director
const DashboardDirector = () => {
  const { currentUser } = useLifecare();
  if (!currentUser) return <Navigate to="/" />;
  
  if (currentUser.role === 'admin') return <Navigate to="/admin" />;
  if (currentUser.role === 'client') return <Navigate to="/client" />;
  return <Navigate to="/caregiver" />;
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/dashboard" element={<DashboardDirector />} />

      <Route 
        path="/caregiver" 
        element={
          <ProtectedRoute allowedRoles={['caregiver']}>
            <CaregiverDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/client" 
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/reports" 
        element={
          <ProtectedRoute allowedRoles={['caregiver', 'client', 'admin']}>
            <Reports />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/schedule" 
        element={
          <ProtectedRoute allowedRoles={['caregiver', 'admin', 'client']}>
            <Schedule />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/team" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Team />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

// Removed explicit React.FC typing to resolve 'children' property requirement errors in strict environments
const App = () => {
  return (
    <LifecareProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </LifecareProvider>
  );
};

export default App;