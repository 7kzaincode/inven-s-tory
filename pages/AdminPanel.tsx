
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';

const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchIdentities();
  }, []);

  const fetchIdentities = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  };

  const initiateOverride = async (profile: Profile) => {
    setTargetId(profile.id);
    setTargetEmail(profile.email || ''); // Usually empty in profile table
    setOverrideMessage(null);
  };

  const executeSudoLogin = (profile: Profile) => {
    localStorage.setItem('inven_sudo_id', profile.id);
    window.location.href = '#/';
    window.location.reload();
  };

  const executeCredentialReset = async () => {
    if (!targetId || !targetEmail) {
      setOverrideMessage("CRITICAL ERROR: TARGET EMAIL REQUIRED FOR OVERRIDE.");
      return;
    }
    setIsProcessing(true);
    
    try {
      const profile = profiles.find(p => p.id === targetId);
      if (!profile) throw new Error("IDENTITY NOT FOUND");

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/#/recovery`,
      });

      if (error) throw error;
      
      setOverrideMessage(`RECOVERY PROTOCOL TRANSMITTED TO ${targetEmail.toUpperCase()}. ACCESS LINK DISPATCHED.`);
    } catch (err: any) {
      setOverrideMessage(`OVERRIDE FAILURE: ${err.message.toUpperCase()}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] uppercase tracking-[0.5em] font-bold">Accessing Central Node...</span>
    </div>
  );

  return (
    <div className="w-full min-h-[70vh] bg-black text-white p-12 -mt-40 pt-56 animate-in fade-in duration-700">
      <header className="mb-24 flex justify-between items-end border-b border-zinc-800 pb-12">
        <div className="space-y-4">
          <h1 className="text-[24px] font-bold uppercase tracking-[0.6em]">CENTRAL NODE COMMAND</h1>
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">System Override Active</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-bold">INDEXED IDENTITIES: {profiles.length}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-[0.4em] text-zinc-500">
              <th className="py-6 px-4">Registry ID</th>
              <th className="py-6 px-4">Handle</th>
              <th className="py-6 px-4">Archived Since</th>
              <th className="py-6 px-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="text-[12px] font-medium tracking-widest uppercase">
            {profiles.map(p => (
              <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors group">
                <td className="py-6 px-4 font-mono text-zinc-400">{p.id.slice(0, 16)}...</td>
                <td className="py-6 px-4 font-bold">@{p.username}</td>
                <td className="py-6 px-4 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="py-6 px-4 text-right flex gap-2 justify-end">
                  <button 
                    onClick={() => executeSudoLogin(p)}
                    className="text-[9px] font-bold bg-zinc-800 text-white px-6 py-2 hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100"
                  >
                    ACCESS ARCHIVE
                  </button>
                  <button 
                    onClick={() => initiateOverride(p)}
                    className="text-[9px] font-bold bg-white text-black px-6 py-2 hover:bg-zinc-200 transition-all opacity-0 group-hover:opacity-100"
                  >
                    RESET LINK
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {targetId && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="max-w-xl w-full border border-zinc-800 bg-black p-16 space-y-12 shadow-[0_0_100px_rgba(255,0,0,0.1)]">
            <header className="text-center space-y-4">
               <h3 className="text-[16px] font-bold uppercase tracking-[0.4em] text-red-500">CREDENTIAL OVERRIDE PROTOCOL</h3>
               <p className="text-[11px] text-zinc-500 font-bold tracking-widest uppercase">Target Identity: @{profiles.find(p => p.id === targetId)?.username}</p>
            </header>

            {overrideMessage ? (
              <div className="p-8 bg-zinc-900 border border-zinc-800 text-[11px] text-center font-bold tracking-[0.2em] leading-relaxed">
                {overrideMessage}
              </div>
            ) : (
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Target Email Input</label>
                  <input 
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="ENTER REGISTERED EMAIL"
                    className="w-full bg-zinc-900 border border-zinc-800 p-4 text-[13px] font-mono outline-none focus:border-red-500 transition-colors"
                  />
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Verify the email carefully. Signal transmission is immutable.</p>
                </div>
                
                <button 
                  onClick={executeCredentialReset}
                  disabled={isProcessing || !targetEmail}
                  className="w-full py-6 bg-red-600 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-red-700 transition-all shadow-2xl disabled:opacity-20"
                >
                  {isProcessing ? 'SYNCHRONIZING OVERRIDE...' : 'TRANSMIT RESET SIGNAL'}
                </button>
              </div>
            )}

            <button 
              onClick={() => setTargetId(null)} 
              className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white"
            >
              Terminate Protocol
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
