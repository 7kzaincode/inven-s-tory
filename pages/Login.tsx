
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { isValidHandle } from '../services/safetyService';

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery' | 'update_password'>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if we arrived here via a recovery link from Supabase
  useEffect(() => {
    const hash = window.location.hash || '';
    const isRecovery = hash.includes('type=recovery') || 
                       hash.includes('recovery_token') || 
                       hash.includes('access_token=') ||
                       location.pathname === '/recovery';

    if (isRecovery) {
      setMode('update_password');
      setMessage("SECURE SESSION ACTIVE. ENTER YOUR NEW CREDENTIALS.");
    }
  }, [location]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const cleanUsername = username.replace('@', '').trim();
        const validation = isValidHandle(cleanUsername);
        
        if (!validation.valid) {
          setError(validation.error);
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/#/login`,
            data: { username: cleanUsername }
          }
        });

        if (signUpError) {
          setError(signUpError.message.toUpperCase());
        } else {
          setMessage("IDENTITY RECORDED. CHECK EMAIL TO VERIFY ARCHIVE ACCESS.");
        }
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            setError("IDENTITY UNVERIFIED. CHECK YOUR INBOX.");
          } else {
            setError("ACCESS DENIED: INVALID CREDENTIALS.");
          }
        }
      } else if (mode === 'recovery') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/recovery`,
        });
        if (resetError) {
          setError(resetError.message.toUpperCase());
        } else {
          setMessage("RECOVERY SIGNAL SENT. CHECK YOUR INBOX.");
        }
      } else if (mode === 'update_password') {
        // Double check session before attempting update to prevent "Auth session missing"
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("AUTH SESSION MISSING! THE LINK MAY BE EXPIRED OR INVALID.");
          setLoading(false);
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          setError(updateError.message.toUpperCase());
        } else {
          setMessage("CREDENTIALS UPDATED. IDENTITY RESTORED.");
          setTimeout(() => {
            navigate('/login');
            window.location.reload();
          }, 2000);
        }
      }
    } catch (err: any) {
      setError("CONNECTION FAILED. ARCHIVE OFFLINE.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-sm mx-auto animate-in fade-in duration-1000">
      <h1 className="text-[14px] uppercase tracking-[0.4em] mb-16 text-center font-bold">
        {mode === 'signup' ? 'REGISTER IDENTITY' : mode === 'recovery' ? 'RECOVER ACCESS' : mode === 'update_password' ? 'UPDATE PASSWORD' : 'ACCESS ARCHIVE'}
      </h1>
      
      <form onSubmit={handleAuth} className="w-full flex flex-col space-y-8">
        {error && (
          <div className="p-5 bg-black text-white text-[9px] uppercase tracking-widest leading-relaxed text-center font-bold border border-red-900/20 shadow-lg">
            {error}
          </div>
        )}
        {message && (
          <div className="p-5 bg-zinc-50 border border-zinc-100 text-zinc-900 text-[9px] uppercase tracking-widest leading-relaxed text-center font-bold shadow-sm">
            {message}
          </div>
        )}
        
        {mode === 'signup' && (
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1 font-bold">Username</label>
            <input 
              type="text" 
              placeholder="@username" 
              className="w-full border-b border-gray-100 py-4 text-[13px] tracking-[0.1em] focus:outline-none focus:border-black transition-colors bg-transparent font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'recovery') && (
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1 font-bold">Email</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              className="w-full border-b border-gray-100 py-4 text-[13px] tracking-[0.1em] focus:outline-none focus:border-black transition-colors bg-transparent font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1 font-bold">Password</label>
              {mode === 'login' && (
                <button type="button" onClick={() => setMode('recovery')} className="text-[8px] uppercase tracking-widest text-zinc-300 hover:text-black font-bold">Forgot?</button>
              )}
            </div>
            <div className="relative w-full">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="w-full border-b border-gray-100 py-4 text-[13px] tracking-[0.1em] focus:outline-none focus:border-black transition-colors bg-transparent font-medium pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-900 transition-colors"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        )}

        {mode === 'update_password' && (
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1 font-bold">New Password</label>
            <div className="relative w-full">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="w-full border-b border-gray-100 py-4 text-[13px] tracking-[0.1em] focus:outline-none focus:border-black transition-colors bg-transparent font-medium pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-900 transition-colors"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-2">Enter a secure, unique sequence.</p>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-6 bg-zinc-900 text-white text-[11px] uppercase tracking-[0.4em] hover:bg-black transition-all duration-300 disabled:opacity-30 font-bold shadow-xl"
        >
          {loading ? 'SYNCING...' : mode === 'signup' ? 'CREATE ARCHIVE' : mode === 'recovery' ? 'SEND LINK' : mode === 'update_password' ? 'UPDATE ARCHIVE' : 'OPEN ARCHIVE'}
        </button>

        <div className="flex flex-col items-center gap-4">
          {(mode === 'login' || mode === 'signup') && (
            <button 
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
              className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors font-bold"
            >
              {mode === 'login' ? 'Need to register? Sign Up' : 'Already registered? Login'}
            </button>
          )}
          {(mode === 'recovery' || mode === 'update_password') && (
            <button type="button" onClick={() => { setMode('login'); setError(null); setMessage(null); navigate('/login'); }} className="text-[10px] uppercase tracking-[0.2em] text-zinc-300 hover:text-black font-bold">Back to Login</button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Login;
