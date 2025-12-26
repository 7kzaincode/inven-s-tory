
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
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm px-8 py-6 flex justify-between items-baseline max-w-[1600px] mx-auto">
        <div className="flex gap-16 items-baseline">
          <Link to="/" className="text-[13px] font-medium tracking-[0.2em] uppercase">
            INVEN[S]TORY
          </Link>
          <div className="flex gap-8">
            <Link 
              to="/" 
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/' ? 'text-black' : 'text-gray-400 hover:text-black'}`}
            >
              EXPLORE
            </Link>
            {user && (
              <>
                <Link 
                  to="/my-space" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/my-space' ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                >
                  MY SPACE
                </Link>
                <Link 
                  to="/friends" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/friends' ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                >
                  FRIENDS
                </Link>
                <Link 
                  to="/inbox" 
                  className={`text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${location.pathname === '/inbox' ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                >
                  INBOX
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-10 items-center">
          <Link 
            to="/add" 
            className="text-[18px] leading-none text-gray-400 hover:text-black transition-colors"
          >
            +
          </Link>
          {user ? (
            <button 
              onClick={onLogout}
              className="text-[9px] uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors focus:outline-none"
            >
              LOGOUT
            </button>
          ) : (
            <Link 
              to="/login" 
              className="text-[9px] uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors"
            >
              LOGIN
            </Link>
          )}
        </div>
      </nav>

      <main className="w-full pt-32 pb-24 px-8 flex-1 flex flex-col items-center">
        <div className="w-full max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
