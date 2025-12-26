
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
  
  const [offering, setOffering] = useState<Item[]>([]);
  const [requesting, setRequesting] = useState<Item[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load target profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!profile) return navigate('/');
      setTargetProfile(profile as Profile);

      // Load my tradable items
      const { data: myData } = await supabase.from('items').select('*').eq('owner_id', currentUser.id).eq('for_trade', true);
      if (myData) setMyItems(myData as Item[]);

      // Load their tradable items
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

  const removeItem = (id: string, zone: 'offering' | 'requesting') => {
    if (zone === 'offering') setOffering(offering.filter(i => i.id !== id));
    else setRequesting(requesting.filter(i => i.id !== id));
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
        <h1 className="text-[14px] uppercase tracking-[0.4em] mb-2">TRADE BUILDER</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">PROPOSING TO @{username}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 w-full gap-8 items-start">
        {/* Left Side: My Tradable Items */}
        <div className="col-span-1 border border-gray-100 p-6 bg-white min-h-[400px]">
          <h3 className="text-[9px] uppercase tracking-widest text-gray-400 mb-6 text-center">MY ASSETS</h3>
          <div className="grid grid-cols-2 gap-4">
            {myItems.map(item => (
              <div 
                key={item.id} draggable onDragStart={(e) => handleDragStart(e, item, 'my')}
                className="aspect-square bg-gray-50 border border-transparent hover:border-black cursor-grab active:cursor-grabbing transition-colors"
              >
                <img src={item.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply p-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Center: THE BOARD */}
        <div className="col-span-2 space-y-8">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'offering')}
            className="w-full border-2 border-dashed border-gray-100 p-8 min-h-[200px] bg-[#FDFDFD] transition-colors hover:border-black/20"
          >
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-8 text-center text-gray-400">I'M OFFERING</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {offering.map(item => (
                <div key={item.id} className="w-20 h-20 bg-white border border-black relative group">
                  <img src={item.image_url} alt="" className="w-full h-full object-contain p-2" />
                  <button 
                    onClick={() => removeItem(item.id, 'offering')}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {offering.length === 0 && <p className="text-[9px] uppercase tracking-widest text-gray-200 mt-8">Drag assets here</p>}
            </div>
          </div>

          <div className="flex justify-center text-gray-200 text-xl font-light">⇅</div>

          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'requesting')}
            className="w-full border-2 border-dashed border-gray-100 p-8 min-h-[200px] bg-[#FDFDFD] transition-colors hover:border-black/20"
          >
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-8 text-center text-gray-400">I'M REQUESTING</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {requesting.map(item => (
                <div key={item.id} className="w-20 h-20 bg-white border border-black relative group">
                  <img src={item.image_url} alt="" className="w-full h-full object-contain p-2" />
                  <button 
                    onClick={() => removeItem(item.id, 'requesting')}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {requesting.length === 0 && <p className="text-[9px] uppercase tracking-widest text-gray-200 mt-8">Drag target units here</p>}
            </div>
          </div>

          <button 
            onClick={submitTrade} disabled={submitting || (offering.length === 0 && requesting.length === 0)}
            className="w-full py-6 bg-black text-white text-[11px] uppercase tracking-[0.4em] hover:bg-gray-900 transition-all disabled:opacity-20"
          >
            {submitting ? 'SENDING PROPOSAL...' : 'CONFIRM TRADE REQUEST'}
          </button>
        </div>

        {/* Right Side: Their Tradable Items */}
        <div className="col-span-1 border border-gray-100 p-6 bg-white min-h-[400px]">
          <h3 className="text-[9px] uppercase tracking-widest text-gray-400 mb-6 text-center">THEIR ARCHIVE</h3>
          <div className="grid grid-cols-2 gap-4">
            {theirItems.map(item => (
              <div 
                key={item.id} draggable onDragStart={(e) => handleDragStart(e, item, 'their')}
                className="aspect-square bg-gray-50 border border-transparent hover:border-black cursor-grab active:cursor-grabbing transition-colors"
              >
                <img src={item.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply p-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeBuilder;
