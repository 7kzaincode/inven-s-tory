
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Profile } from '../types';
import { cleanStrict } from '../services/safetyService';
import HandshakeModal from '../components/HandshakeModal';

const PostBulletin: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/login');
      
      const [pRes, iRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('items').select('*').eq('owner_id', session.user.id).eq('public', true)
      ]);

      if (pRes.data) setProfile(pRes.data as Profile);
      if (iRes.data) setItems(iRes.data as Item[]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const toggleItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !profile) return;
    setSubmitting(true);

    const { error } = await supabase.from('trade_ads').insert({
      owner_id: profile.id,
      text: cleanStrict(text, true),
      looking_for: cleanStrict(lookingFor).toUpperCase(),
      offering_ids: selectedIds
    });

    if (error) {
      setModalConfig({
        isOpen: true,
        title: "BROADCAST_FAILURE",
        message: "THE ARCHIVE NODE REJECTED THE SIGNAL. PLEASE VERIFY DATA COMPLIANCE."
      });
      setSubmitting(false);
    } else {
      navigate('/inbox');
    }
  };

  if (loading) return <div className="py-40 text-center text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse">Initializing Broadcast Node...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      {modalConfig && (
        <HandshakeModal 
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={() => setModalConfig(null)}
          onCancel={() => setModalConfig(null)}
        />
      )}

      <header className="text-center mb-16 space-y-4">
        <h1 className="text-[24px] font-bold uppercase tracking-[0.5em] text-zinc-950">BULLETIN_BROADCAST</h1>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Transmit inquiry to the global directory</p>
      </header>

      <form onSubmit={handleBroadcast} className="space-y-16">
        <div className="space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Signal Content (Broadcast Message)</label>
            <textarea 
              maxLength={280}
              value={text} onChange={e => setText(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 p-8 text-[16px] font-medium tracking-wide outline-none h-40 resize-none focus:border-zinc-950 transition-colors shadow-inner"
              placeholder="e.g. Looking to swap archival hardware for minimalist objects..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">LF (Looking For)</label>
            <input 
              value={lookingFor} onChange={e => setLookingFor(e.target.value)}
              className="w-full border-b-2 border-zinc-950 py-4 text-[16px] uppercase font-bold outline-none bg-transparent"
              placeholder="HARDWARE, MEDIA, ETC"
            />
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex justify-between items-baseline">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Attach Units ({selectedIds.length} Selected)</label>
            <span className="text-[9px] text-zinc-300 font-bold">ONLY PUBLIC UNITS ELIGIBLE</span>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleItem(item.id)}
                className={`aspect-square p-2 border cursor-pointer transition-all relative group ${selectedIds.includes(item.id) ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-100 bg-white hover:border-zinc-400'}`}
              >
                <img src={item.image_url} className={`w-full h-full object-contain mix-blend-multiply transition-opacity ${selectedIds.includes(item.id) ? 'opacity-20 grayscale brightness-200' : 'opacity-100'}`} />
                {selectedIds.includes(item.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full p-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[6px] text-white uppercase font-bold truncate block">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting || !text.trim()}
          className="w-full py-8 bg-zinc-950 text-white text-[13px] font-bold uppercase tracking-[0.8em] hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-20"
        >
          {submitting ? 'TRANSMITTING...' : 'BROADCAST_SIGNAL'}
        </button>
      </form>
    </div>
  );
};

export default PostBulletin;
