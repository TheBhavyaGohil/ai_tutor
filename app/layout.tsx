import './globals.css';
import { Inter } from 'next/font/google';
import GlobalNotificationListener from './components/GlobalNotificationListener';
import ThemeInitializer from './components/ThemeInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'EduGenie | AI Learning Platform',
  description: 'Innovation Challenge 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 h-screen overflow-hidden`}>
        <ThemeInitializer />
        <GlobalNotificationListener />
        {children}
      </body>
    </html>
  );
}