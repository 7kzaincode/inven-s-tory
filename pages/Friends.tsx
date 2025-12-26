
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Friend } from '../types';

interface FriendsProps {
  profile: Profile;
}

const Friends: React.FC<FriendsProps> = ({ profile }) => {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          requester_id,
          receiver_id,
          status,
          requester:profiles!friends_requester_id_fkey(id, username),
          receiver:profiles!friends_receiver_id_fkey(id, username)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      if (data) {
        const friendProfiles = data.map(f => 
          f.requester_id === profile.id ? f.receiver : f.requester
        );
        setFriends(friendProfiles as any);
      }
      setLoading(false);
    };

    fetchFriends();
  }, [profile.id]);

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Querying Network...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <h1 className="text-[14px] uppercase tracking-[0.4em] mb-16">ESTABLISHED CONNECTIONS</h1>
      
      {friends.length === 0 ? (
        <p className="text-[11px] uppercase tracking-widest text-gray-300">No active connections</p>
      ) : (
        <div className="w-full space-y-4">
          {friends.map((friend) => (
            <Link 
              key={friend.id} to={`/profile/${friend.username}`}
              className="flex items-center justify-between p-8 border border-gray-50 hover:border-black transition-colors group"
            >
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <span className="text-[9px] text-gray-400">@{friend.username.slice(0, 1)}</span>
                </div>
                <span className="text-[12px] uppercase tracking-[0.2em]">@{friend.username}</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest text-gray-300 group-hover:text-black transition-colors">View Archive →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Friends;
