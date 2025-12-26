
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Profile, Trade, Item } from '../types';

interface InboxProps {
  profile: Profile;
}

const Inbox: React.FC<InboxProps> = ({ profile }) => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [tradeRequests, setTradeRequests] = useState<any[]>([]);
  const [sentTrades, setSentTrades] = useState<any[]>([]);
  const [viewingTrade, setViewingTrade] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    fetchRequests();
  }, [profile.id]);

  const fetchRequests = async () => {
    setLoading(true);
    
    // Received Connections
    const { data: fData } = await supabase
      .from('friends')
      .select(`id, status, requester:profiles!friends_requester_id_fkey(id, username)`)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending');

    // Received Trades
    const { data: tData } = await supabase
      .from('trades')
      .select(`
        id, status, sender_id, receiver_id, sender_items, receiver_items, created_at,
        sender:profiles!trades_sender_id_fkey(id, username)
      `)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending');

    // Sent Trades
    const { data: sData } = await supabase
      .from('trades')
      .select(`
        id, status, sender_id, receiver_id, sender_items, receiver_items, created_at,
        receiver:profiles!trades_receiver_id_fkey(id, username)
      `)
      .eq('sender_id', profile.id)
      .eq('status', 'pending');

    if (fData) setFriendRequests(fData);
    if (tData) setTradeRequests(tData);
    if (sData) setSentTrades(sData);
    
    setLoading(false);
  };

  const executeTrade = async (trade: any) => {
    setExecuting(true);
    try {
      const { error: rpcError } = await supabase.rpc('execute_trade_atomic', { trade_id: trade.id });
      
      if (rpcError) {
        throw new Error("ARCHIVAL HANDSHAKE FAILED: " + rpcError.message);
      }

      setViewingTrade(null);
      fetchRequests();
      alert("SWAP COMPLETE. BOTH ARCHIVES HAVE BEEN UPDATED.");
    } catch (e: any) {
      alert("CRITICAL TRANSFER ERROR: " + e.message);
    } finally {
      setExecuting(false);
    }
  };

  const cancelTrade = async (tradeId: string) => {
    if (!window.confirm("CANCEL THIS ARCHIVAL PROPOSAL?")) return;
    const { error } = await supabase.from('trades').delete().eq('id', tradeId);
    if (!error) fetchRequests();
  };

  const openTradeDetails = async (trade: any) => {
    const { data: senderItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: receiverItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: senderItems, receiverItemsData: receiverItems });
  };

  if (loading) return <div className="py-40 text-center text-[11px] uppercase tracking-[0.6em] font-bold text-zinc-900 animate-pulse">Scanning Archive Signals...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-24 py-10 animate-in fade-in duration-700">
      <header className="w-full flex justify-center gap-16 border-b border-zinc-50 pb-8">
        <button 
          onClick={() => setActiveTab('received')}
          className={`text-[12px] uppercase tracking-[0.4em] font-bold transition-all ${activeTab === 'received' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-300'}`}
        >
          Received ({tradeRequests.length + friendRequests.length})
        </button>
        <button 
          onClick={() => setActiveTab('sent')}
          className={`text-[12px] uppercase tracking-[0.4em] font-bold transition-all ${activeTab === 'sent' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-300'}`}
        >
          Sent ({sentTrades.length})
        </button>
      </header>

      {activeTab === 'received' ? (
        <div className="w-full space-y-20">
          <section className="w-full">
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 mb-10 font-bold px-4">CONNECTION REQUESTS</h2>
            <div className="space-y-4">
              {friendRequests.map(req => (
                <div key={req.id} className="p-8 border border-zinc-100 flex justify-between items-center bg-[#FAFAFA] shadow-sm">
                  <span className="text-[13px] uppercase tracking-[0.1em] font-bold text-zinc-900">@{req.requester.username} REQUESTS LINK</span>
                  <div className="flex gap-4">
                    <button onClick={() => supabase.from('friends').update({ status: 'accepted' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white font-bold px-6 py-2 hover:bg-black">Accept</button>
                    <button onClick={() => supabase.from('friends').update({ status: 'rejected' }).eq('id', req.id).then(() => fetchRequests())} className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold px-6 py-2">Decline</button>
                  </div>
                </div>
              ))}
              {friendRequests.length === 0 && <p className="text-center text-[9px] text-zinc-200 uppercase tracking-widest py-10 font-bold italic">No pending links</p>}
            </div>
          </section>

          <section className="w-full">
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 mb-10 font-bold px-4">TRADE PROPOSALS</h2>
            <div className="space-y-4">
              {tradeRequests.map(trade => (
                <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center group bg-white hover:border-zinc-900 transition-all cursor-pointer" onClick={() => openTradeDetails(trade)}>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[14px] uppercase tracking-[0.1em] font-bold text-zinc-900">PROPOSAL FROM @{trade.sender.username}</span>
                    <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Inbound swap request</span>
                  </div>
                  <button className="text-[10px] uppercase tracking-widest bg-zinc-900 text-white px-8 py-3 font-bold hover:bg-black transition-all shadow-lg">INSPECT</button>
                </div>
              ))}
              {tradeRequests.length === 0 && <p className="text-center text-[9px] text-zinc-200 uppercase tracking-widest py-10 font-bold italic">No active proposals</p>}
            </div>
          </section>
        </div>
      ) : (
        <section className="w-full">
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 mb-10 font-bold px-4">OUTBOUND PROPOSALS</h2>
          <div className="space-y-4">
            {sentTrades.map(trade => (
              <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-white group hover:border-zinc-900 transition-all">
                <div className="flex flex-col space-y-1">
                  <span className="text-[14px] uppercase tracking-[0.1em] font-bold text-zinc-900">PROPOSAL TO @{trade.receiver.username}</span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Sent {new Date(trade.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => openTradeDetails(trade)} className="text-[10px] uppercase tracking-widest border border-zinc-900 text-zinc-900 px-6 py-2 font-bold hover:bg-zinc-50 transition-all">Review</button>
                  <button onClick={() => cancelTrade(trade.id)} className="text-[10px] uppercase tracking-widest text-red-400 font-bold px-6 py-2 hover:text-red-600 transition-all">Cancel Request</button>
                </div>
              </div>
            ))}
            {sentTrades.length === 0 && <p className="text-center text-[9px] text-zinc-200 uppercase tracking-widest py-20 font-bold italic">You have no active outbound proposals</p>}
          </div>
        </section>
      )}

      {viewingTrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/98 backdrop-blur-2xl p-8 overflow-y-auto animate-in zoom-in-95 duration-500">
          <div className="w-full max-w-6xl flex flex-col items-center space-y-20 p-12">
            <header className="text-center space-y-4">
              <h3 className="text-[28px] uppercase tracking-[0.6em] font-bold text-zinc-900 leading-none">ARCHIVAL EXCHANGE</h3>
              <p className="text-[11px] text-zinc-400 uppercase tracking-[0.3em] font-bold">
                {activeTab === 'received' ? `Reviewing proposal from @${viewingTrade.sender.username}` : `Awaiting handshake from @${viewingTrade.receiver.username}`}
              </p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 w-full items-start">
              <div className="space-y-10">
                <h4 className="text-[11px] uppercase tracking-widest text-zinc-900 font-bold border-b border-zinc-100 pb-4">
                  {activeTab === 'received' ? `@${viewingTrade.sender.username}'S ASSETS` : 'YOUR OFFERING'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {viewingTrade.senderItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-zinc-50 border border-zinc-100 p-4 relative group">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                        <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-900">{it.name}</p>
                      </div>
                    </div>
                  ))}
                  {viewingTrade.senderItemsData?.length === 0 && <p className="col-span-3 text-center text-[9px] uppercase tracking-widest text-zinc-200 py-10 font-bold">No assets committed</p>}
                </div>
              </div>

              <div className="space-y-10">
                <h4 className="text-[11px] uppercase tracking-widest text-zinc-900 font-bold border-b border-zinc-100 pb-4">
                   {activeTab === 'received' ? 'YOUR ASSETS' : `@${viewingTrade.receiver.username}'S ASSETS`}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {viewingTrade.receiverItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-zinc-50 border border-zinc-100 p-4 relative group">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                        <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-900">{it.name}</p>
                      </div>
                    </div>
                  ))}
                   {viewingTrade.receiverItemsData?.length === 0 && <p className="col-span-3 text-center text-[9px] uppercase tracking-widest text-zinc-200 py-10 font-bold">No assets requested</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8 w-full max-w-xl">
              {activeTab === 'received' ? (
                <button 
                  onClick={() => executeTrade(viewingTrade)} 
                  disabled={executing} 
                  className="w-full py-8 bg-zinc-900 text-white text-[13px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all shadow-2xl disabled:opacity-30"
                >
                  {executing ? 'EXECUTING ATOMIC SWAP...' : 'FINALIZE BILATERAL EXCHANGE'}
                </button>
              ) : (
                <div className="w-full py-8 bg-zinc-50 text-zinc-400 text-[11px] font-bold uppercase tracking-[0.5em] text-center border border-zinc-100">
                  Awaiting Handshake
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => setViewingTrade(null)} className="flex-1 py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">DISMISS</button>
                {activeTab === 'sent' && (
                  <button onClick={() => { cancelTrade(viewingTrade.id); setViewingTrade(null); }} className="flex-1 py-5 border border-red-100 text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all">CANCEL REQUEST</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
