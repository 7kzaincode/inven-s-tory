
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

  const executeTrade = async (trade: any) => {
    setExecuting(true);
    try {
      // Use the RPC for atomic swap to prevent one-sided transfers
      const { error } = await supabase.rpc('execute_trade_atomic', { trade_id: trade.id });
      
      if (error) {
        // Fallback for demo if RPC isn't defined yet
        console.warn("RPC missing, falling back to client-side swap...");
        const { error: e1 } = await supabase.from('items').update({ owner_id: trade.receiver_id }).in('id', trade.sender_items);
        const { error: e2 } = await supabase.from('items').update({ owner_id: trade.sender_id }).in('id', trade.receiver_items);
        if (e1 || e2) throw new Error("Atomic handshake failed.");
        await supabase.from('trades').update({ status: 'accepted' }).eq('id', trade.id);
      }

      setViewingTrade(null);
      fetchRequests();
      alert("ARCHIVAL SYNCHRONIZATION COMPLETE.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const openTradeDetails = async (trade: any) => {
    const { data: senderItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: receiverItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: senderItems, receiverItemsData: receiverItems });
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-900">Scanning Signals...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-32">
      <section className="w-full">
        <h2 className="text-[11px] uppercase tracking-[0.4em] text-zinc-900 mb-12 text-center font-bold">CONNECTION REQUESTS</h2>
        <div className="space-y-4">
          {friendRequests.map(req => (
            <div key={req.id} className="p-8 border border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <span className="text-[12px] uppercase tracking-[0.2em] font-bold text-zinc-900">@{req.requester.username} REQUESTS ARCHIVE LINK</span>
              <div className="flex gap-4">
                <button onClick={() => supabase.from('friends').update({ status: 'accepted' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest border border-zinc-900 font-bold px-6 py-2 hover:bg-zinc-900 hover:text-white transition-all">Accept</button>
                <button onClick={() => supabase.from('friends').update({ status: 'rejected' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-6 py-2">Decline</button>
              </div>
            </div>
          ))}
          {friendRequests.length === 0 && <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest py-8 font-bold">No pending connections</p>}
        </div>
      </section>

      <section className="w-full">
        <h2 className="text-[11px] uppercase tracking-[0.4em] text-zinc-900 mb-12 text-center font-bold">TRADE PROPOSALS</h2>
        <div className="space-y-4">
          {tradeRequests.map(trade => (
            <div key={trade.id} className="p-8 border border-zinc-100 flex justify-between items-center group bg-white shadow-sm hover:border-zinc-900 transition-all">
              <div className="flex flex-col space-y-1">
                <span className="text-[12px] uppercase tracking-[0.2em] font-bold text-zinc-900">OFFER FROM @{trade.sender.username}</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{trade.sender_items.length} UNITS OFFERED ⇅ {trade.receiver_items.length} UNITS REQUESTED</span>
              </div>
              <button onClick={() => openTradeDetails(trade)} className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white px-8 py-3 font-bold hover:bg-black">INSPECT</button>
            </div>
          ))}
          {tradeRequests.length === 0 && <p className="text-center text-[10px] text-zinc-300 uppercase tracking-widest py-8 font-bold">No active proposals</p>}
        </div>
      </section>

      {viewingTrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/98 backdrop-blur-md p-8 overflow-y-auto">
          <div className="w-full max-w-5xl flex flex-col items-center space-y-16">
            <header className="text-center">
              <h3 className="text-[20px] uppercase tracking-[0.4em] font-bold mb-4 text-zinc-900">SWAP PROPOSAL</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">FROM @{viewingTrade.sender.username}</p>
            </header>
            <div className="grid grid-cols-2 gap-16 w-full">
              <div className="space-y-8">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold border-b border-zinc-50 pb-2">THEIR OFFER</h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingTrade.senderItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white border border-zinc-100 p-4">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <p className="text-[8px] uppercase tracking-widest font-bold mt-2 text-center">{it.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold border-b border-zinc-50 pb-2">YOUR ASSETS</h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingTrade.receiverItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white border border-zinc-100 p-4">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <p className="text-[8px] uppercase tracking-widest font-bold mt-2 text-center">{it.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 w-full max-w-md">
              <button onClick={() => executeTrade(viewingTrade)} disabled={executing} className="flex-1 py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all">
                {executing ? 'EXECUTING...' : 'EXECUTE SWAP'}
              </button>
              <button onClick={() => setViewingTrade(null)} className="flex-1 py-6 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest">DISMISS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
