
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

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Retrieving Archive...</div>;

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full mb-32 flex flex-col items-center">
        <h1 className="text-[18px] uppercase tracking-[0.4em] font-light mb-2">@{profile.username}</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">{items.length} ARCHIVED ITEMS</p>
      </header>

      <div className="w-full mb-32">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-12 text-center">CURRENT INVENTORY</h2>
        <InventoryGrid items={items} isOwner={true} />
      </div>

      <div className="w-full max-w-md pt-16 border-t border-gray-50 flex flex-col items-center">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-8">WANT LIST</h2>
        <ul className="space-y-4 w-full text-center">
          {wants.map((want, i) => (
            <li key={i} className="text-[12px] uppercase tracking-[0.15em] text-gray-600">{want}</li>
          ))}
          {wants.length === 0 && <li className="text-[10px] uppercase tracking-[0.15em] text-gray-300 italic">No current wants</li>}
        </ul>
      </div>
    </div>
  );
};

export default MySpace;
