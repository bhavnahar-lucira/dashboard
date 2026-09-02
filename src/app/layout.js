import { Figtree, Abhaya_Libre } from 'next/font/google';
import './globals.css';
import ToastProvider from '../components/common/ToastProvider';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-figtree',
  display: 'swap',
});

const abhaya = Abhaya_Libre({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-abhaya',
  display: 'swap',
});

export const metadata = {
  title: 'Lucira Unified Backend & CMS',
  description: 'Administrative interface for Lucira Jewelry.',
};

/**
 * Applies the saved theme before first paint. Without this the provider
 * only sets data-theme in an effect after mount, so a dark-mode user gets
 * a white flash on every page load.
 */
const THEME_BOOTSTRAP =
  "(function(){try{var t=localStorage.getItem('lucira_admin_sidebar_theme');" +
  "document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light')}catch(e){}})()";

export default function RootLayout({ children }) {
  return (
    <html lang='en' data-theme='light'>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className={figtree.variable + ' ' + abhaya.variable + ' font-figtree antialiased'}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
