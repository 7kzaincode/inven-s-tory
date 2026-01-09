
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Profile, Trade, Item, PublicTradeAd } from '../types';

interface InboxProps {
  profile: Profile;
}

const Inbox: React.FC<InboxProps> = ({ profile }) => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [tradeRequests, setTradeRequests] = useState<any[]>([]);
  const [sentTrades, setSentTrades] = useState<any[]>([]);
  const [myBulletins, setMyBulletins] = useState<any[]>([]);
  const [viewingTrade, setViewingTrade] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'bulletins'>('received');
  
  // Custom Status UI
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchEverything();
  }, [profile.id]);

  const fetchEverything = async () => {
    setLoading(true);
    const { data: fData } = await supabase.from('friends').select(`id, status, requester:profiles!friends_requester_id_fkey(id, username)`).eq('receiver_id', profile.id).eq('status', 'pending');
    const { data: tData } = await supabase.from('trades').select(`id, status, sender_id, receiver_id, sender_items, receiver_items, created_at, sender:profiles!trades_sender_id_fkey(id, username)`).eq('receiver_id', profile.id).eq('status', 'pending');
    const { data: sData } = await supabase.from('trades').select(`id, status, sender_id, receiver_id, sender_items, receiver_items, created_at, receiver:profiles!trades_receiver_id_fkey(id, username)`).eq('sender_id', profile.id).eq('status', 'pending');
    const { data: bData } = await supabase.from('trade_ads').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false });

    if (fData) setFriendRequests(fData);
    if (tData) setTradeRequests(tData);
    if (sData) setSentTrades(sData);
    if (bData) setMyBulletins(bData);
    setLoading(false);
  };

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const executeTrade = async (trade: any) => {
    setExecuting(true);
    try {
      const { error } = await supabase.rpc('execute_trade_atomic', { trade_id: trade.id });
      if (error) throw error;
      setViewingTrade(null);
      fetchEverything();
      showStatus("TRADE SUCCESSFUL. CONFLICTING PROPOSALS PURGED.");
    } catch (e: any) {
      showStatus("TRANSFER ERROR: " + e.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const declineTrade = async (tradeId: string) => {
    const { error } = await supabase.from('trades').update({ status: 'declined' }).eq('id', tradeId);
    if (error) showStatus("ACTION FAILED.", 'error');
    else {
      setViewingTrade(null);
      fetchEverything();
      showStatus("PROPOSAL DECLINED.");
    }
  };

  const cancelTrade = async (tradeId: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', tradeId);
    if (error) showStatus("ABORT FAILED.", 'error');
    else {
      fetchEverything();
      showStatus("PROPOSAL CANCELLED.");
    }
  };

  const deleteBulletin = async (id: string) => {
    const { error } = await supabase.from('trade_ads').delete().eq('id', id);
    if (error) showStatus("DE-INDEX FAILED.", 'error');
    else {
      fetchEverything();
      showStatus("BULLETIN DE-INDEXED.");
    }
  };

  const openTradeDetails = async (trade: any) => {
    const { data: sItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: rItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: sItems, receiverItemsData: rItems });
  };

  if (loading) return <div className="py-40 text-center text-[11px] uppercase tracking-[0.6em] font-bold text-zinc-900 animate-pulse">Syncing Archive Data...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-16 py-10 animate-in fade-in duration-700">
      
      {/* STATUS OVERLAY */}
      {statusMessage && (
        <div className={`fixed top-32 z-[200] px-12 py-5 shadow-2xl animate-in slide-in-from-top-4 duration-500 font-bold uppercase tracking-[0.4em] text-[10px] ${statusMessage.type === 'error' ? 'bg-red-500 text-white' : 'bg-zinc-950 text-white'}`}>
           {statusMessage.text}
        </div>
      )}

      <header className="w-full flex justify-center gap-12 border-b border-zinc-50 pb-8">
        {[
          { id: 'received', label: 'INBOUND', count: tradeRequests.length + friendRequests.length },
          { id: 'sent', label: 'OUTBOUND', count: sentTrades.length },
          { id: 'bulletins', label: 'MY BULLETINS', count: myBulletins.length }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`text-[11px] uppercase tracking-[0.4em] font-bold transition-all px-4 py-2 ${activeTab === tab.id ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-300 hover:text-zinc-600'}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </header>

      <div className="w-full space-y-8 min-h-[400px]">
        {activeTab === 'received' && (
          <>
            <div className="space-y-4">
              {friendRequests.map(req => (
                <div key={req.id} className="p-8 border border-zinc-100 flex justify-between items-center bg-[#FAFAFA] hover:shadow-md transition-shadow">
                  <span className="text-[12px] uppercase tracking-widest font-bold">LINK REQUEST FROM @{req.requester.username}</span>
                  <div className="flex gap-4">
                    <button onClick={() => supabase.from('friends').update({ status: 'accepted' }).eq('id', req.id).then(() => fetchEverything())} className="text-[10px] uppercase font-bold bg-zinc-900 text-white px-6 py-2 hover:bg-black">Accept</button>
                    <button onClick={() => supabase.from('friends').update({ status: 'rejected' }).eq('id', req.id).then(() => fetchEverything())} className="text-[10px] uppercase font-bold text-zinc-400 px-6 py-2 hover:text-zinc-900">Decline</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {tradeRequests.map(trade => (
                <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-white hover:border-zinc-900 transition-all cursor-pointer shadow-sm group" onClick={() => openTradeDetails(trade)}>
                  <span className="text-[14px] uppercase font-bold tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">PROPOSAL FROM @{trade.sender.username}</span>
                  <button className="text-[10px] uppercase bg-zinc-900 text-white px-8 py-3 font-bold group-hover:bg-black transition-all">INSPECT</button>
                </div>
              ))}
              {tradeRequests.length === 0 && friendRequests.length === 0 && <p className="text-center py-20 text-[9px] uppercase tracking-widest text-zinc-200 font-bold italic">No active inbound signals</p>}
            </div>
          </>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-4">
            {sentTrades.map(trade => (
              <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-white group hover:border-zinc-900 transition-all shadow-sm">
                <span className="text-[14px] uppercase font-bold tracking-widest text-zinc-400 group-hover:text-zinc-900">PROPOSAL TO @{trade.receiver.username}</span>
                <div className="flex gap-4">
                  <button onClick={() => openTradeDetails(trade)} className="text-[10px] uppercase border border-zinc-900 px-6 py-2 font-bold hover:bg-zinc-900 hover:text-white transition-all">Review</button>
                  <button onClick={() => cancelTrade(trade.id)} className="text-[10px] uppercase text-red-500 px-6 py-2 font-bold hover:underline">Abort</button>
                </div>
              </div>
            ))}
            {sentTrades.length === 0 && <p className="text-center py-20 text-[9px] uppercase tracking-widest text-zinc-200 font-bold italic">Archive clear of outbound proposals</p>}
          </div>
        )}

        {activeTab === 'bulletins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myBulletins.map(ad => (
              <div key={ad.id} className="p-8 border border-zinc-100 bg-white space-y-6 flex flex-col justify-between group hover:border-zinc-900 transition-all shadow-sm">
                <div className="space-y-4">
                  <p className="text-[14px] italic leading-relaxed font-medium text-zinc-800">"{ad.text}"</p>
                  <div className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">LF: {ad.looking_for || 'General Inquiry'}</div>
                </div>
                <div className="pt-4 border-t border-zinc-50 flex justify-between items-center">
                  <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-300">Indexed {new Date(ad.created_at).toLocaleDateString()}</span>
                  <button onClick={() => deleteBulletin(ad.id)} className="text-[10px] uppercase font-bold text-red-500 hover:underline">De-index</button>
                </div>
              </div>
            ))}
            {myBulletins.length === 0 && <div className="col-span-full text-center py-20 text-[9px] uppercase tracking-widest text-zinc-200 font-bold italic">No active bulletins posted</div>}
          </div>
        )}
      </div>

      {viewingTrade && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-white/98 backdrop-blur-3xl p-8 overflow-y-auto animate-in zoom-in-95 duration-500">
          <div className="w-full max-w-6xl flex flex-col items-center space-y-16 p-12">
            <header className="text-center">
              <h3 className="text-[28px] uppercase tracking-[0.6em] font-bold text-zinc-900 leading-none">TRADE INSPECTION</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-4 tracking-[0.2em] border-y border-zinc-100 py-2">BILATERAL EXCHANGE PROTOCOL ACTIVE</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 w-full">
              <div className="space-y-8">
                <h4 className="text-[11px] uppercase font-bold tracking-[0.3em] border-b border-zinc-900 pb-4 text-zinc-900">OFFERING</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {viewingTrade.senderItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white p-4 border border-zinc-100 shadow-sm hover:shadow-xl transition-shadow flex flex-col items-center">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-2 truncate w-full text-center">{it.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[11px] uppercase font-bold tracking-[0.3em] border-b border-zinc-900 pb-4 text-zinc-900">REQUESTING</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {viewingTrade.receiverItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white p-4 border border-zinc-100 shadow-sm hover:shadow-xl transition-shadow flex flex-col items-center">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-2 truncate w-full text-center">{it.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-lg pt-12">
              {activeTab === 'received' ? (
                <div className="flex flex-col gap-4 w-full">
                  <button 
                    onClick={() => executeTrade(viewingTrade)} 
                    disabled={executing}
                    className="py-7 bg-zinc-900 text-white text-[13px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all shadow-2xl active:scale-95"
                  >
                    {executing ? 'TRANSFERRING...' : 'CONFIRM TRADE'}
                  </button>
                  <button 
                    onClick={() => declineTrade(viewingTrade.id)}
                    className="py-5 border border-zinc-200 text-zinc-300 text-[11px] font-bold uppercase tracking-[0.4em] hover:text-red-500 hover:border-red-500 transition-all"
                  >
                    DECLINE PROPOSAL
                  </button>
                </div>
              ) : (
                <button onClick={() => setViewingTrade(null)} className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all">BACK TO INDEX</button>
              )}
              {activeTab === 'received' && (
                <button onClick={() => setViewingTrade(null)} className="w-full py-4 text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-zinc-900 transition-colors">Dismiss Review</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
