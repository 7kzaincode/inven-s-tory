
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Profile, Friend, Trade, Item } from '../types';

interface InboxProps {
  profile: Profile;
}

const Inbox: React.FC<InboxProps> = ({ profile }) => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [tradeRequests, setTradeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [profile.id]);

  const fetchRequests = async () => {
    setLoading(true);
    // Fetch Friend Requests
    const { data: fData } = await supabase
      .from('friends')
      .select(`id, status, requester:profiles!friends_requester_id_fkey(id, username)`)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending');

    // Fetch Trade Requests
    const { data: tData } = await supabase
      .from('trades')
      .select(`id, status, sender:profiles!trades_sender_id_fkey(id, username), sender_items, receiver_items`)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending');

    if (fData) setFriendRequests(fData);
    if (tData) setTradeRequests(tData);
    setLoading(false);
  };

  const handleFriend = async (id: string, accept: boolean) => {
    await supabase.from('friends').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', id);
    fetchRequests();
  };

  const handleTrade = async (id: string, accept: boolean) => {
    await supabase.from('trades').update({ status: accept ? 'accepted' : 'declined' }).eq('id', id);
    fetchRequests();
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Checking Notifications...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-24">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-12">CONNECTION REQUESTS</h2>
        {friendRequests.length === 0 ? (
          <p className="text-[10px] uppercase tracking-widest text-gray-200">No pending connections</p>
        ) : (
          <div className="w-full space-y-4">
            {friendRequests.map(req => (
              <div key={req.id} className="p-8 border border-gray-100 flex justify-between items-center">
                <span className="text-[12px] uppercase tracking-[0.2em]">@{req.requester.username} WANTS TO CONNECT</span>
                <div className="flex gap-4">
                  <button onClick={() => handleFriend(req.id, true)} className="text-[10px] uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-all">Accept</button>
                  <button onClick={() => handleFriend(req.id, false)} className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors px-4 py-2">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col items-center">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-12">TRADE PROPOSALS</h2>
        {tradeRequests.length === 0 ? (
          <p className="text-[10px] uppercase tracking-widest text-gray-200">No pending trades</p>
        ) : (
          <div className="w-full space-y-4">
            {tradeRequests.map(trade => (
              <div key={trade.id} className="p-8 border border-gray-100 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] uppercase tracking-[0.2em]">@{trade.sender.username} PROPOSED A TRADE</span>
                  <div className="flex gap-4">
                    <button onClick={() => handleTrade(trade.id, true)} className="text-[10px] uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-all">Accept Trade</button>
                    <button onClick={() => handleTrade(trade.id, false)} className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors px-4 py-2">Decline</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                  <div className="text-[9px] uppercase tracking-widest text-gray-400">THEIR OFFER: {trade.sender_items.length} UNITS</div>
                  <div className="text-[9px] uppercase tracking-widest text-gray-400">YOUR ASSETS: {trade.receiver_items.length} UNITS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
