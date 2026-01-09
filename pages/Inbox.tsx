
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

  const openTradeDetails = async (trade: any) => {
    const { data: sItems } = await supabase.from('items').select('*').in('id', trade.sender_items);
    const { data: rItems } = await supabase.from('items').select('*').in('id', trade.receiver_items);
    setViewingTrade({ ...trade, senderItemsData: sItems, receiverItemsData: rItems });
  };

  // REUSABLE HOVER STATS COMPONENT
  const ItemStatOverlay = ({ item }: { item: any }) => (
    <div className="absolute inset-0 bg-zinc-950/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4 text-center space-y-2 z-20">
      <span className="text-[10px] text-white font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2 w-full truncate">{item.name}</span>
      <div className="space-y-1">
        <span className="text-[7px] uppercase tracking-[0.3em] text-zinc-500 font-bold block">CATEGORY</span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-300 font-bold">{item.category}</span>
      </div>
      <div className="space-y-1">
        <span className="text-[7px] uppercase tracking-[0.3em] text-zinc-500 font-bold block">CONDITION</span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-300 font-bold">{item.condition}</span>
      </div>
      <div className="pt-2">
        <span className="text-[7px] uppercase tracking-[0.3em] text-zinc-600 font-bold block">REGISTRY</span>
        <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">#{item.id.slice(0, 8)}</span>
      </div>
    </div>
  );

  if (loading) return <div className="py-40 text-center text-[11px] uppercase tracking-[0.6em] font-bold text-zinc-900 animate-pulse">Syncing Archive Data...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-16 py-10 animate-in fade-in duration-700">
      
      {statusMessage && (
        <div className={`fixed top-32 z-[200] px-12 py-5 shadow-2xl animate-in slide-in-from-top-4 duration-500 font-bold uppercase tracking-[0.4em] text-[10px] ${statusMessage.type === 'error' ? 'bg-red-500 text-white' : 'bg-zinc-950 text-white'}`}>
           {statusMessage.text}
        </div>
      )}

      <header className="w-full flex justify-center gap-12 border-b border-zinc-50 pb-8">
        {['received', 'sent', 'bulletins'].map(id => (
          <button 
            key={id} onClick={() => setActiveTab(id as any)}
            className={`text-[11px] uppercase tracking-[0.4em] font-bold transition-all px-4 py-2 ${activeTab === id ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-300 hover:text-zinc-600'}`}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </header>

      <div className="w-full space-y-8 min-h-[400px]">
        {activeTab === 'received' && (
          <div className="space-y-4">
            {tradeRequests.map(trade => (
              <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-white hover:border-zinc-900 transition-all cursor-pointer shadow-sm group" onClick={() => openTradeDetails(trade)}>
                <span className="text-[14px] uppercase font-bold tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">PROPOSAL FROM @{trade.sender.username}</span>
                <button className="text-[10px] uppercase bg-zinc-900 text-white px-8 py-3 font-bold group-hover:bg-black transition-all">INSPECT</button>
              </div>
            ))}
            {tradeRequests.length === 0 && friendRequests.length === 0 && <p className="text-center py-20 text-[9px] uppercase tracking-widest text-zinc-200 font-bold italic">No active inbound signals</p>}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-4">
            {sentTrades.map(trade => (
              <div key={trade.id} className="p-10 border border-zinc-100 flex justify-between items-center bg-white group hover:border-zinc-900 transition-all shadow-sm">
                <span className="text-[14px] uppercase font-bold tracking-widest text-zinc-400 group-hover:text-zinc-900">PROPOSAL TO @{trade.receiver.username}</span>
                <button onClick={() => openTradeDetails(trade)} className="text-[10px] uppercase border border-zinc-900 px-6 py-2 font-bold hover:bg-zinc-900 hover:text-white transition-all">Review</button>
              </div>
            ))}
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
                <button onClick={() => supabase.from('trade_ads').delete().eq('id', ad.id).then(() => fetchEverything())} className="text-[9px] uppercase font-bold text-red-500 hover:underline text-left">De-index</button>
              </div>
            ))}
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
                    <div key={it.id} className="aspect-square bg-white p-4 border border-zinc-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center group relative overflow-hidden">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                      <ItemStatOverlay item={it} />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-2 truncate w-full text-center relative z-10">{it.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[11px] uppercase font-bold tracking-[0.3em] border-b border-zinc-900 pb-4 text-zinc-900">REQUESTING</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {viewingTrade.receiverItemsData?.map((it: any) => (
                    <div key={it.id} className="aspect-square bg-white p-4 border border-zinc-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center group relative overflow-hidden">
                      <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                      <ItemStatOverlay item={it} />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-2 truncate w-full text-center relative z-10">{it.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-lg pt-12">
              {activeTab === 'received' ? (
                <div className="flex flex-col gap-4 w-full">
                  <button onClick={() => executeTrade(viewingTrade)} disabled={executing} className="py-7 bg-zinc-900 text-white text-[13px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all shadow-2xl active:scale-95">
                    {executing ? 'TRANSFERRING...' : 'CONFIRM TRADE'}
                  </button>
                  <button onClick={() => declineTrade(viewingTrade.id)} className="py-5 border border-zinc-200 text-zinc-300 text-[11px] font-bold uppercase tracking-[0.4em] hover:text-red-500 hover:border-red-500 transition-all">
                    DECLINE PROPOSAL
                  </button>
                </div>
              ) : (
                <button onClick={() => setViewingTrade(null)} className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all">BACK TO INDEX</button>
              )}
              <button onClick={() => setViewingTrade(null)} className="w-full py-4 text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-zinc-900 transition-colors">Dismiss Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
