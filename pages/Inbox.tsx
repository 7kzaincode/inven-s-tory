
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Profile, Trade, Item } from '../types';

interface InboxProps {
  profile: Profile;
}

const Inbox: React.FC<InboxProps> = ({ profile }) => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [tradeRequests, setTradeRequests] = useState<any[]>([]);
  const [viewingTrade, setViewingTrade] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [profile.id]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data: fData } = await supabase
      .from('friends')
      .select(`id, status, requester:profiles!friends_requester_id_fkey(id, username)`)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending');

    const { data: tData } = await supabase
      .from('trades')
      .select(`
        id, status, sender_id, receiver_id, sender_items, receiver_items,
        sender:profiles!trades_sender_id_fkey(id, username)
      `)
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

  const executeTrade = async (trade: any) => {
    setExecuting(true);
    try {
      // 1. Swap sender items to receiver
      await supabase.from('items').update({ owner_id: trade.receiver_id }).in('id', trade.sender_items);
      // 2. Swap receiver items to sender
      await supabase.from('items').update({ owner_id: trade.sender_id }).in('id', trade.receiver_items);
      // 3. Mark trade as accepted
      await supabase.from('trades').update({ status: 'accepted' }).eq('id', trade.id);
      
      setViewingTrade(null);
      fetchRequests();
      alert("TRADE SUCCESSFUL. OWNERSHIP TRANSFERRED.");
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const declineTrade = async (id: string) => {
    await supabase.from('trades').update({ status: 'declined' }).eq('id', id);
    setViewingTrade(null);
    fetchRequests();
  };

  const openTradeDetails = async (trade: any) => {
    const { data: senderItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: receiverItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: senderItems, receiverItemsData: receiverItems });
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">CHECKING ARCHIVE TRAFFIC...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-32">
      {/* Friend Requests Section */}
      <section className="w-full">
        <h2 className="text-[11px] uppercase tracking-[0.4em] text-zinc-400 mb-12 text-center">CONNECTION ARCHIVE</h2>
        <div className="space-y-4">
          {friendRequests.map(req => (
            <div key={req.id} className="p-8 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 flex justify-between items-center group">
              <span className="text-[12px] uppercase tracking-[0.2em] font-medium">@{req.requester.username} IS REQUESTING LINK</span>
              <div className="flex gap-4">
                <button onClick={() => handleFriend(req.id, true)} className="text-[10px] uppercase tracking-widest border border-zinc-900 dark:border-zinc-100 px-6 py-2 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all">Link</button>
                <button onClick={() => handleFriend(req.id, false)} className="text-[10px] uppercase tracking-widest text-zinc-400 px-6 py-2 hover:text-red-500 transition-colors">Discard</button>
              </div>
            </div>
          ))}
          {friendRequests.length === 0 && <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest py-8">No pending connections</p>}
        </div>
      </section>

      {/* Trade Proposals Section */}
      <section className="w-full">
        <h2 className="text-[11px] uppercase tracking-[0.4em] text-zinc-400 mb-12 text-center">PROPOSAL INBOX</h2>
        <div className="space-y-4">
          {tradeRequests.map(trade => (
            <div key={trade.id} className="p-8 border border-zinc-100 dark:border-zinc-900 flex justify-between items-center group">
              <div className="flex flex-col space-y-1">
                <span className="text-[12px] uppercase tracking-[0.2em] font-medium">OFFER FROM @{trade.sender.username}</span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest">{trade.sender_items.length} units ⇅ {trade.receiver_items.length} units</span>
              </div>
              <button 
                onClick={() => openTradeDetails(trade)}
                className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-8 py-3 hover:opacity-80 transition-all"
              >
                Inspect Offer
              </button>
            </div>
          ))}
          {tradeRequests.length === 0 && <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest py-8">No active proposals</p>}
        </div>
      </section>

      {/* Trade Detail Modal */}
      {viewingTrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-8 overflow-y-auto">
          <div className="w-full max-w-5xl flex flex-col items-center space-y-16">
            <header className="text-center">
              <h3 className="text-[16px] uppercase tracking-[0.4em] mb-4">TRADE ANALYSIS</h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">PROPOSAL FROM @{viewingTrade.sender.username}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full">
              <div className="space-y-8">
                <h4 className="text-[10px] uppercase tracking-widest text-center text-zinc-400">THEY ARE OFFERING</h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingTrade.senderItemsData?.map((it: Item) => (
                    <div key={it.id} className="aspect-square bg-zinc-50 dark:bg-zinc-900 p-4 border border-zinc-100 dark:border-zinc-800">
                      <img src={it.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      <p className="text-[8px] uppercase tracking-widest text-center mt-2 text-zinc-400 truncate">{it.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-[10px] uppercase tracking-widest text-center text-zinc-400">FOR YOUR ASSETS</h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingTrade.receiverItemsData?.map((it: Item) => (
                    <div key={it.id} className="aspect-square bg-zinc-50 dark:bg-zinc-900 p-4 border border-zinc-100 dark:border-zinc-800">
                      <img src={it.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      <p className="text-[8px] uppercase tracking-widest text-center mt-2 text-zinc-400 truncate">{it.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-8 w-full max-w-sm">
              <button 
                onClick={() => executeTrade(viewingTrade)} disabled={executing}
                className="flex-1 py-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] uppercase tracking-[0.3em] hover:opacity-90 transition-all disabled:opacity-30"
              >
                {executing ? 'TRANSFERRING...' : 'ACCEPT'}
              </button>
              <button 
                onClick={() => declineTrade(viewingTrade.id)} disabled={executing}
                className="flex-1 py-4 border border-zinc-900 dark:border-zinc-100 text-[11px] uppercase tracking-[0.3em] hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all disabled:opacity-30"
              >
                DECLINE
              </button>
            </div>
            
            <button 
              onClick={() => setViewingTrade(null)}
              className="text-[9px] uppercase tracking-[0.3em] text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
