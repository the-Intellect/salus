import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ClientsList from './components/clients/ClientsList';
import ClientProfile from './components/clients/ClientProfile';
import NewClient from './components/clients/NewClient';
import SessionPage from './components/sessions/SessionPage';

function Placeholder({ title }) {
  return (
    <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>{title}</h2>
      <p>See vaade on tulemas järgmises faasis.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/clients" replace />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/clients/:id" element={<ClientProfile />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/history" element={<Placeholder title="Sageduste ajalugu" />} />
          <Route path="/reports" element={<Placeholder title="Raportid" />} />
          <Route path="/settings" element={<Placeholder title="Seaded" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
