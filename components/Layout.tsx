
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
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm px-8 py-6 flex justify-between items-baseline max-w-[1600px] mx-auto border-b border-zinc-50">
        <div className="flex gap-16 items-baseline">
          <Link to="/" className="text-[13px] font-semibold tracking-[0.2em] uppercase text-zinc-900">
            INVEN[S]TORY
          </Link>
          <div className="flex gap-8">
            <Link 
              to="/" 
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/' ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-900'}`}
            >
              EXPLORE
            </Link>
            {user && (
              <>
                <Link 
                  to="/my-space" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/my-space' ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-900'}`}
                >
                  MY SPACE
                </Link>
                <Link 
                  to="/friends" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/friends' ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-900'}`}
                >
                  FRIENDS
                </Link>
                <Link 
                  to="/inbox" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/inbox' ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-900'}`}
                >
                  INBOX
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8 items-center">
          <Link 
            to="/add" 
            className="text-[20px] leading-none text-zinc-900 hover:opacity-70 transition-opacity"
          >
            +
          </Link>
          {user ? (
            <button 
              onClick={onLogout}
              className="text-[9px] uppercase tracking-[0.3em] text-zinc-900 font-medium hover:opacity-60 transition-opacity focus:outline-none"
            >
              LOGOUT
            </button>
          ) : (
            <Link 
              to="/login" 
              className="text-[9px] uppercase tracking-[0.3em] text-zinc-900 font-medium hover:opacity-60 transition-opacity"
            >
              LOGIN
            </Link>
          )}
        </div>
      </nav>

      <main className="w-full pt-32 pb-24 px-8 flex-1 flex flex-col items-center text-zinc-900">
        <div className="w-full max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
