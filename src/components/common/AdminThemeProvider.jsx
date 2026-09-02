'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_THEME = 'lucira_admin_sidebar_theme';

const AdminThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

/**
 * Owns the CMS light/dark state.
 *
 * The theme is published as `data-theme` on <html>, which is what the
 * --admin-* custom properties in globals.css key off. Every surface built
 * on those tokens (or on the `panel`/`ink`/`hairline` Tailwind colors that
 * read them) flips without needing its own dark variant.
 */
export default function AdminThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem(STORAGE_THEME) === 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      localStorage.setItem(STORAGE_THEME, prev ? 'light' : 'dark');
      return !prev;
    });
  }, []);

  return (
    <AdminThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}
