import { createContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { t as translate } from '../i18n/translations.js';
import { api } from '../api/index.js';

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [language, setLanguageState] = useState('et');

  useEffect(() => {
    if (user?.preferred_language) {
      setLanguageState(user.preferred_language);
    }
  }, [user?.preferred_language]);

  const setLanguage = async (lang) => {
    setLanguageState(lang); // kohene UI uuendus
    try {
      const updated = await api.updateLanguage(lang);
      updateUser(updated);
    } catch (err) {
      console.error('Keele salvestamine ebaõnnestus:', err);
    }
  };

  const t = (key) => translate(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}


