
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import InventoryGrid from '../components/InventoryGrid';
import { supabase } from '../services/supabase';
import { Item, Profile, Friend } from '../types';

interface ProfilePageProps {
  currentUser: Profile | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser }) => {
  const { username } = useParams<{ username: string }>();
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [friendship, setFriendship] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfileAndItems();
  }, [username, currentUser]);

  const fetchProfileAndItems = async () => {
    setLoading(true);
    // STRICT USERNAME LOOKUP
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (pError || !profile) {
      setLoading(false);
      return;
    }

    setTargetProfile(profile as Profile);
    
    // Select items - Supabase RLS policy handles visibility based on friendship
    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });

    if (itemsData) setItems(itemsData as Item[]);

    if (currentUser) {
      // Look for any friendship record between current user and target user
      const { data: friendData } = await supabase
        .from('friends')
        .select('*')
        .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();
      setFriendship(friendData as Friend);
    }
    setLoading(false);
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !targetProfile) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('friends')
      .insert({ 
        requester_id: currentUser.id, 
        receiver_id: targetProfile.id, 
        status: 'pending' 
      });
    
    if (!error) fetchProfileAndItems();
    setActionLoading(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Retrieving Archive...</div>;
  if (!targetProfile) return <div className="py-32 text-center text-[11px] uppercase tracking-widest text-gray-300">Archive @{username} Not Found</div>;

  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';
  const isSelf = currentUser?.id === targetProfile.id;

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full mb-24 flex flex-col items-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full mb-10 flex items-center justify-center border border-gray-100">
          <span className="text-[18px] text-gray-300 uppercase tracking-widest">@{targetProfile.username.slice(0, 1)}</span>
        </div>
        <h1 className="text-[22px] uppercase tracking-[0.4em] font-light mb-4">@{targetProfile.username}</h1>
        
        {currentUser && !isSelf && (
          <div className="flex gap-6 mt-6">
            {!friendship ? (
              <button 
                onClick={sendFriendRequest} disabled={actionLoading}
                className="text-[11px] uppercase tracking-[0.2em] border border-black px-10 py-4 hover:bg-black hover:text-white transition-all duration-500"
              >
                {actionLoading ? 'CONNECTING...' : 'REQUEST CONNECTION'}
              </button>
            ) : (
              <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400 py-4 border border-transparent px-10">
                {isPending ? 'CONNECTION PENDING' : 'ARCHIVE LINKED'}
              </span>
            )}
            
            <Link 
              to={`/trade/${targetProfile.username}`}
              className="text-[11px] uppercase tracking-[0.2em] bg-black text-white px-10 py-4 hover:bg-gray-800 transition-all duration-500"
            >
              PROPOSE TRADE
            </Link>
          </div>
        )}

        {isSelf && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 mt-6">This is your public archive identity</p>
        )}
      </header>

      <div className="w-full mb-32">
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-2">
            {isFriend || isSelf ? 'FULL INVENTORY' : 'PUBLIC SELECTION'}
          </h2>
          {!isFriend && !isSelf && (
            <span className="text-[8px] uppercase tracking-[0.2em] text-gray-300 italic">Connected users see private units</span>
          )}
        </div>

        <InventoryGrid items={items} />
        
        {!isFriend && !isSelf && items.some(i => !i.public) && (
          <p className="mt-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic border-t border-gray-50 pt-10 max-w-sm mx-auto">
            Archive connection required to view non-public archival units
          </p>
        )}
      </div>

      <footer className="py-16 text-center border-t border-gray-50 w-full max-w-md opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[9px] uppercase tracking-[0.4em] text-gray-400">Archival Verification v1.0.2</p>
      </footer>
    </div>
  );
};

export default ProfilePage;
