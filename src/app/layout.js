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

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body className={figtree.variable + ' ' + abhaya.variable + ' font-figtree antialiased'}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
