
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Profile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: Profile | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setIsDark(saved);
    if (saved) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center transition-colors duration-300">
      <nav className="fixed top-0 w-full z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm px-8 py-6 flex justify-between items-baseline max-w-[1600px] mx-auto border-b border-transparent dark:border-zinc-900">
        <div className="flex gap-16 items-baseline">
          <Link to="/" className="text-[13px] font-medium tracking-[0.2em] uppercase dark:text-zinc-100">
            INVEN[S]TORY
          </Link>
          <div className="flex gap-8">
            <Link 
              to="/" 
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              EXPLORE
            </Link>
            {user && (
              <>
                <Link 
                  to="/my-space" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/my-space' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                  MY SPACE
                </Link>
                <Link 
                  to="/friends" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/friends' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                  FRIENDS
                </Link>
                <Link 
                  to="/inbox" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/inbox' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                  INBOX
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8 items-center">
          <button 
            onClick={toggleTheme}
            className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {isDark ? 'LIGHT' : 'DARK'}
          </button>
          <Link 
            to="/add" 
            className="text-[18px] leading-none text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            +
          </Link>
          {user ? (
            <button 
              onClick={onLogout}
              className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none"
            >
              LOGOUT
            </button>
          ) : (
            <Link 
              to="/login" 
              className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              LOGIN
            </Link>
          )}
        </div>
      </nav>

      <main className="w-full pt-32 pb-24 px-8 flex-1 flex flex-col items-center dark:text-zinc-100">
        <div className="w-full max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
