
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import InventoryGrid from '../components/InventoryGrid';
import { supabase } from '../services/supabase';
import { Item } from '../types';

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicItems = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profile) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('*')
          .eq('owner_id', profile.id)
          .eq('public', true);
        if (itemsData) setItems(itemsData as Item[]);
      }
      setLoading(false);
    };

    fetchPublicItems();
  }, [username]);

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Retrieving Archive...</div>;

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full mb-32 flex flex-col items-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full mb-6 flex items-center justify-center">
          <span className="text-[11px] text-gray-300 uppercase tracking-widest">@{username?.slice(0, 1)}</span>
        </div>
        <h1 className="text-[18px] uppercase tracking-[0.4em] font-light mb-2">@{username}</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">PUBLIC ARCHIVE</p>
      </header>

      <div className="w-full mb-32">
        <InventoryGrid items={items} />
      </div>

      <footer className="py-12 text-center border-t border-gray-50 w-full max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300">Identity Inventory — 2024</p>
      </footer>
    </div>
  );
};

export default ProfilePage;
