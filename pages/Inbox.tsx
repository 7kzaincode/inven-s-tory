
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
      // Prioritize the atomic RPC for database safety
      const { error: rpcError } = await supabase.rpc('execute_trade_atomic', { trade_id: trade.id });
      
      if (rpcError) {
        console.warn("RPC Handshake failed, executing bilateral client-side swap...", rpcError);
        
        // Manual swap with improved error checking
        const { error: e1 } = await supabase.from('items').update({ owner_id: trade.receiver_id }).in('id', trade.sender_items);
        if (e1) throw new Error("Phase 1 of exchange failed. Transfer aborted for safety.");

        const { error: e2 } = await supabase.from('items').update({ owner_id: trade.sender_id }).in('id', trade.receiver_items);
        if (e2) throw new Error("Phase 2 of exchange failed. ARCHIVE OUT OF SYNC - Manual correction required.");

        await supabase.from('trades').update({ status: 'accepted' }).eq('id', trade.id);
      }

      setViewingTrade(null);
      fetchRequests();
      alert("HANDSHAKE COMPLETE. ARCHIVES HAVE BEEN SYNCHRONIZED.");
    } catch (e: any) {
      alert("CRITICAL TRANSFER ERROR: " + e.message);
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const openTradeDetails = async (trade: any) => {
    const { data: senderItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: receiverItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: senderItems, receiverItemsData: receiverItems });
  };

  if (loading) return <div className="py-40 text-center text-[11px] uppercase tracking-[0.6em] font-bold text-zinc-900 animate-pulse">Scanning Secure Channels...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-40 py-10 animate-in fade-in duration-700">
      <section className="w-full">
        <h2 className="text-[13px] uppercase tracking-[0.5em] text-zinc-900 mb-16 text-center font-bold border-b border-zinc-50 pb-8">CONNECTION REQUESTS</h2>
        <div className="space-y-6">
          {friendRequests.map(req => (
            <div key={req.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-[#FAFAFA] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-6">
                <div className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
                <span className="text-[13px] uppercase tracking-[0.2em] font-bold text-zinc-900">@{req.requester.username} REQUESTS ARCHIVE LINK</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => supabase.from('friends').update({ status: 'accepted' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white font-bold px-8 py-3 hover:bg-black transition-all">Accept</button>
                <button onClick={() => supabase.from('friends').update({ status: 'rejected' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-8 py-3 hover:bg-zinc-50 border border-transparent hover:border-zinc-100">Decline</button>
              </div>
            </div>
          ))}
          {friendRequests.length === 0 && <p className="text-center text-[10px] text-zinc-200 uppercase tracking-[0.4em] py-16 font-bold">No pending connections</p>}
        </div>
      </section>

      <section className="w-full">
        <h2 className="text-[13px] uppercase tracking-[0.5em] text-zinc-900 mb-16 text-center font-bold border-b border-zinc-50 pb-8">TRADE PROPOSALS</h2>
        <div className="space-y-6">
          {tradeRequests.map(trade => (
            <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center group bg-white shadow-sm hover:border-zinc-900 transition-all cursor-pointer" onClick={() => openTradeDetails(trade)}>
              <div className="flex flex-col space-y-2">
                <span className="text-[14px] uppercase tracking-[0.2em] font-bold text-zinc-900 group-hover:underline">OFFER FROM @{trade.sender.username}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{trade.sender_items.length} UNITS OFFERED ⇅ {trade.receiver_items.length} UNITS REQUESTED</span>
              </div>
              <button className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white px-10 py-4 font-bold hover:bg-black group-hover:scale-105 transition-all shadow-xl">INSPECT PROPOSAL</button>
            </div>
          ))}
          {tradeRequests.length === 0 && <p className="text-center text-[10px] text-zinc-200 uppercase tracking-[0.4em] py-16 font-bold">No active proposals</p>}
        </div>
      </section>

      {viewingTrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/98 backdrop-blur-xl p-8 overflow-y-auto animate-in zoom-in-95 duration-500">
          <div className="w-full max-w-6xl flex flex-col items-center space-y-20 p-12">
            <header className="text-center space-y-4">
              <h3 className="text-[28px] uppercase tracking-[0.6em] font-bold text-zinc-900 leading-none">ARCHIVAL SWAP</h3>
              <p className="text-[11px] text-zinc-400 uppercase tracking-[0.3em] font-bold">MUTUAL Handshake required with @{viewingTrade.sender.username}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 w-full items-start">
              <div className="space-y-10">
                <div className="flex justify-between items-baseline border-b border-zinc-100 pb-4">
                  <h4 className="text-[12px] uppercase tracking-widest text-zinc-900 font-bold">THEIR COMMITMENT</h4>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase">{viewingTrade.senderItemsData?.length} UNITS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {viewingTrade.senderItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white border border-zinc-100 p-6 shadow-sm hover:shadow-xl transition-shadow relative group">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-900">{it.name}</p>
                        <p className="text-[7px] uppercase font-bold tracking-widest text-zinc-400 mt-2">{it.condition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-10">
                <div className="flex justify-between items-baseline border-b border-zinc-100 pb-4">
                  <h4 className="text-[12px] uppercase tracking-widest text-zinc-900 font-bold">YOUR COMMITMENT</h4>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase">{viewingTrade.receiverItemsData?.length} UNITS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {viewingTrade.receiverItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white border border-zinc-100 p-6 shadow-sm hover:shadow-xl transition-shadow relative group">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-900">{it.name}</p>
                        <p className="text-[7px] uppercase font-bold tracking-widest text-zinc-400 mt-2">{it.condition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8 w-full max-w-xl">
              <button 
                onClick={() => executeTrade(viewingTrade)} 
                disabled={executing} 
                className="w-full py-8 bg-zinc-900 text-white text-[13px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all shadow-2xl hover:-translate-y-1 disabled:opacity-30"
              >
                {executing ? 'EXECUTING ATOMIC SWAP...' : 'FINALIZE BILATERAL EXCHANGE'}
              </button>
              <div className="flex gap-4">
                <button onClick={() => setViewingTrade(null)} className="flex-1 py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">DISMISS</button>
                <button className="flex-1 py-5 border border-zinc-100 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-all">DECLINE PROPOSAL</button>
              </div>
              <p className="text-center text-[9px] text-zinc-300 uppercase tracking-[0.3em] font-bold">Warning: This action is permanent. Archives will sync instantly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
