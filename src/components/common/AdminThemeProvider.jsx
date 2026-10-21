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
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME, 'light');
    } catch {}
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <AdminThemeContext.Provider value={{ isDark: true, toggleTheme: () => {} }}>
      {children}
    </AdminThemeContext.Provider>
  );
}
