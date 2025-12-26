
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Profile } from '../types';

interface TradeBuilderProps {
  currentUser: Profile;
}

const TradeBuilder: React.FC<TradeBuilderProps> = ({ currentUser }) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [theirItems, setTheirItems] = useState<Item[]>([]);
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  
  const [offering, setOffering] = useState<Item[]>([]);
  const [requesting, setRequesting] = useState<Item[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!profile) return navigate('/');
      setTargetProfile(profile as Profile);

      const { data: myData } = await supabase.from('items').select('*').eq('owner_id', currentUser.id).eq('for_trade', true);
      if (myData) setMyItems(myData as Item[]);

      const { data: theirData } = await supabase.from('items').select('*').eq('owner_id', profile.id).eq('for_trade', true).eq('public', true);
      if (theirData) setTheirItems(theirData as Item[]);

      setLoading(false);
    };
    loadData();
  }, [username, currentUser.id]);

  const handleDragStart = (e: React.DragEvent, item: Item, side: 'my' | 'their') => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('source', side);
  };

  const handleDrop = (e: React.DragEvent, zone: 'offering' | 'requesting') => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const source = e.dataTransfer.getData('source');

    if (zone === 'offering' && source === 'my') {
      const item = myItems.find(i => i.id === itemId);
      if (item && !offering.find(i => i.id === itemId)) setOffering([...offering, item]);
    } else if (zone === 'requesting' && source === 'their') {
      const item = theirItems.find(i => i.id === itemId);
      if (item && !requesting.find(i => i.id === itemId)) setRequesting([...requesting, item]);
    }
  };

  const submitTrade = async () => {
    if (offering.length === 0 && requesting.length === 0) return;
    setSubmitting(true);
    
    const { error } = await supabase.from('trades').insert({
      sender_id: currentUser.id,
      receiver_id: targetProfile?.id,
      sender_items: offering.map(i => i.id),
      receiver_items: requesting.map(i => i.id),
      status: 'pending'
    });

    if (!error) navigate('/inbox');
    setSubmitting(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Initializing Trade Interface...</div>;

  return (
    <div className="w-full flex flex-col items-center">
      <header className="mb-16 text-center">
        <h1 className="text-[14px] uppercase tracking-[0.4em] mb-2 font-bold">TRADE BUILDER</h1>
        <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold">PROPOSING TO @{username}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 w-full gap-8 items-start">
        {/* Left Side: My Assets */}
        <div className="col-span-1 border border-zinc-100 p-6 bg-white min-h-[400px] shadow-sm">
          <h3 className="text-[9px] uppercase tracking-widest text-zinc-400 mb-6 text-center font-bold">MY ASSETS</h3>
          <div className="grid grid-cols-2 gap-4">
            {myItems.map(item => (
              <div 
                key={item.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, item, 'my')}
                onClick={() => setPreviewItem(item)}
                className="aspect-square bg-zinc-50 border border-transparent hover:border-zinc-900 cursor-grab transition-all p-2"
              >
                <img src={item.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              </div>
            ))}
          </div>
        </div>

        {/* Center: THE BOARD */}
        <div className="col-span-2 space-y-8">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'offering')}
            className="w-full border-2 border-dashed border-zinc-100 p-8 min-h-[200px] bg-[#FDFDFD] transition-colors hover:border-zinc-900/30"
          >
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-8 text-center text-zinc-400 font-bold">I'M OFFERING</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {offering.map(item => (
                <div key={item.id} className="w-20 h-20 bg-white border border-zinc-900 relative group p-1">
                  <img src={item.image_url} alt="" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setOffering(offering.filter(i => i.id !== item.id))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white text-[10px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
              {offering.length === 0 && <p className="text-[9px] uppercase tracking-widest text-zinc-200 mt-8 font-bold">Drag assets here</p>}
            </div>
          </div>

          <div className="flex justify-center text-zinc-200 text-xl font-light">⇅</div>

          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'requesting')}
            className="w-full border-2 border-dashed border-zinc-100 p-8 min-h-[200px] bg-[#FDFDFD] transition-colors hover:border-zinc-900/30"
          >
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-8 text-center text-zinc-400 font-bold">I'M REQUESTING</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {requesting.map(item => (
                <div key={item.id} className="w-20 h-20 bg-white border border-zinc-900 relative group p-1">
                  <img src={item.image_url} alt="" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setRequesting(requesting.filter(i => i.id !== item.id))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white text-[10px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
              {requesting.length === 0 && <p className="text-[9px] uppercase tracking-widest text-zinc-200 mt-8 font-bold">Drag target units here</p>}
            </div>
          </div>

          <button 
            onClick={submitTrade} disabled={submitting || (offering.length === 0 && requesting.length === 0)}
            className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all disabled:opacity-20"
          >
            {submitting ? 'SENDING PROPOSAL...' : 'CONFIRM TRADE REQUEST'}
          </button>
        </div>

        {/* Right Side: Their Assets */}
        <div className="col-span-1 border border-zinc-100 p-6 bg-white min-h-[400px] shadow-sm">
          <h3 className="text-[9px] uppercase tracking-widest text-zinc-400 mb-6 text-center font-bold">THEIR ARCHIVE</h3>
          <div className="grid grid-cols-2 gap-4">
            {theirItems.map(item => (
              <div 
                key={item.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, item, 'their')}
                onClick={() => setPreviewItem(item)}
                className="aspect-square bg-zinc-50 border border-transparent hover:border-zinc-900 cursor-grab transition-all p-2"
              >
                <img src={item.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Item Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/95 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
          <div className="max-w-md w-full p-12 bg-white border border-zinc-100 shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="aspect-square mb-8">
              <img src={previewItem.image_url} className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-[20px] font-bold uppercase tracking-widest text-zinc-900">{previewItem.name}</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{previewItem.category} / {previewItem.condition}</p>
              <button onClick={() => setPreviewItem(null)} className="w-full py-4 mt-8 bg-zinc-900 text-white text-[10px] uppercase font-bold tracking-widest">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeBuilder;
