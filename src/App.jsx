import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import ClientsList from './components/clients/ClientsList.jsx';
import ClientProfile from './components/clients/ClientProfile.jsx';
import NewClient from './components/clients/NewClient.jsx';
import SessionPage from './components/sessions/SessionPage.jsx';

function Placeholder({ title }) {
  return (
    <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>{title}</h2>
      <p>See vaade on tulemas järgmises faasis.</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--color-text-muted)' }}>Laadimine...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/clients" replace /> : <LoginPage />} />
      <Route path="/set-password" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/clients" replace />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/new" element={<NewClient />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/session" element={<SessionPage />} />
              <Route path="/history" element={<Placeholder title="Sageduste ajalugu" />} />
              <Route path="/reports" element={<Placeholder title="Raportid" />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
