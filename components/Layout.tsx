
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Profile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: Profile | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md px-8 py-7 flex justify-between items-baseline max-w-[1600px] mx-auto border-b border-zinc-100 shadow-sm transition-all duration-300">
        <div className="flex gap-16 items-baseline">
          <Link to="/about" className="text-[16px] font-bold tracking-[0.3em] uppercase text-zinc-950 hover:opacity-50 transition-opacity">
            INVEN[S]TORY
          </Link>
          <div className="flex gap-10">
            <Link 
              to="/" 
              className={`text-[12px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${location.pathname === '/' ? 'text-zinc-950 scale-105' : 'text-zinc-400 hover:text-zinc-950'}`}
            >
              EXPLORE
            </Link>
            {user && (
              <>
                <Link 
                  to="/atlas" 
                  className={`text-[12px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${location.pathname === '/atlas' ? 'text-zinc-950 scale-110' : 'text-zinc-400 hover:text-zinc-950 underline decoration-zinc-100 underline-offset-8'}`}
                >
                  ATLAS
                </Link>
                <Link 
                  to={`/profile/${user.username}`} 
                  className={`text-[12px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${location.pathname.startsWith('/profile') && location.pathname.includes(user.username) ? 'text-zinc-950 scale-105' : 'text-zinc-400 hover:text-zinc-950'}`}
                >
                  ARCHIVE
                </Link>
                <Link 
                  to="/inbox" 
                  className={`text-[12px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${location.pathname === '/inbox' || location.pathname.startsWith('/messages') ? 'text-zinc-950 scale-105' : 'text-zinc-400 hover:text-zinc-950'}`}
                >
                  INBOX
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-10 items-center">
          {user && (
            <Link 
              to="/add" 
              className="text-[28px] leading-none text-zinc-950 hover:opacity-70 transition-opacity font-light"
            >
              +
            </Link>
          )}
          {user ? (
            <button 
              onClick={onLogout}
              className="text-[11px] uppercase tracking-[0.35em] text-zinc-950 font-bold hover:opacity-60 transition-opacity focus:outline-none"
            >
              LOGOUT
            </button>
          ) : (
            <Link 
              to="/login" 
              className="text-[11px] uppercase tracking-[0.35em] text-zinc-950 font-bold hover:opacity-60 transition-opacity"
            >
              ACCESS
            </Link>
          )}
        </div>
      </nav>

      <main className="w-full pt-40 pb-32 px-10 flex-1 flex flex-col items-center text-zinc-950 transition-all duration-300">
        <div className="w-full max-w-[1500px]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
