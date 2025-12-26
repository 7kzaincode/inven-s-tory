
import React, { useState, useEffect } from 'react';
import { Profile, Item } from '../types';
import InventoryGrid from '../components/InventoryGrid';
import { supabase } from '../services/supabase';

interface MySpaceProps {
  profile: Profile;
}

const MySpace: React.FC<MySpaceProps> = ({ profile }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [wants, setWants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      const { data: wantsData } = await supabase
        .from('wants')
        .select('text')
        .eq('owner_id', profile.id);

      if (itemsData) setItems(itemsData as Item[]);
      if (wantsData) setWants(wantsData.map(w => w.text));
      setLoading(false);
    };

    fetchData();
  }, [profile.id]);

  const copyLink = () => {
    const url = `${window.location.origin}/#/profile/${profile.username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Retrieving Archive...</div>;

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full mb-32 flex flex-col items-center">
        <h1 className="text-[24px] uppercase tracking-[0.4em] font-light mb-4 text-zinc-900">@{profile.username}</h1>
        <div className="flex gap-4 items-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] border-r border-zinc-100 pr-4">{items.length} UNITS INDEXED</p>
          <button 
            onClick={copyLink}
            className="text-[9px] uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors font-medium"
          >
            {copied ? 'LINK COPIED' : 'SHARE ARCHIVE'}
          </button>
        </div>
      </header>

      <div className="w-full mb-32">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 mb-16 text-center font-semibold">CURRENT INVENTORY</h2>
        <InventoryGrid items={items} isOwner={true} />
      </div>

      <div className="w-full max-w-md pt-24 border-t border-zinc-50 flex flex-col items-center">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 mb-12 font-semibold">WANT LIST</h2>
        <ul className="space-y-6 w-full text-center">
          {wants.map((want, i) => (
            <li key={i} className="text-[13px] uppercase tracking-[0.15em] text-zinc-800 font-medium">/ {want}</li>
          ))}
          {wants.length === 0 && <li className="text-[10px] uppercase tracking-[0.15em] text-zinc-300 italic">No current wants listed</li>}
        </ul>
      </div>
    </div>
  );
};

export default MySpace;
