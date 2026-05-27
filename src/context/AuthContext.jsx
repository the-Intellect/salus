import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('salus_token');
    if (!token) { setLoading(false); return; }
    api.me()
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('salus_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('salus_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('salus_token');
    setUser(null);
  };

  const updateUser = (data) => setUser(u => ({ ...u, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
