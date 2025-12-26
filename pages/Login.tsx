
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { id: data.user.id, username: username || email.split('@')[0], email: email }
          ]);
        if (profileError) setError(profileError.message);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) setError(signInError.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-sm mx-auto">
      <h1 className="text-[14px] uppercase tracking-[0.4em] mb-16 text-center">
        {isSignUp ? 'CREATE ARCHIVE' : 'ACCESS ARCHIVE'}
      </h1>
      
      <form onSubmit={handleAuth} className="w-full flex flex-col space-y-8">
        {error && (
          <p className="text-[10px] text-red-500 uppercase tracking-widest text-center">{error}</p>
        )}
        
        {isSignUp && (
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1">Username</label>
            <input 
              type="text" 
              placeholder="@USERNAME" 
              className="w-full border-b border-gray-200 py-4 text-[13px] uppercase tracking-[0.2em] focus:outline-none focus:border-black transition-colors bg-transparent"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1">Email</label>
          <input 
            type="email" 
            placeholder="EMAIL@EXAMPLE.COM" 
            className="w-full border-b border-gray-200 py-4 text-[13px] uppercase tracking-[0.2em] focus:outline-none focus:border-black transition-colors bg-transparent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="w-full border-b border-gray-200 py-4 text-[13px] uppercase tracking-[0.2em] focus:outline-none focus:border-black transition-colors bg-transparent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-6 border border-black text-[11px] uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-30"
        >
          {loading ? 'PROCESSING...' : isSignUp ? 'CREATE' : 'ENTER'}
        </button>

        <button 
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
        >
          {isSignUp ? 'Already have an archive? Login' : 'Need an archive? Sign Up'}
        </button>
      </form>
    </div>
  );
};

export default Login;
