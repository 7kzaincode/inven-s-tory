
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Message, Item } from '../types';
import { censor, isClean, cleanStrict } from '../services/safetyService';
import HandshakeModal from '../components/HandshakeModal';

interface InboxProps {
  profile: Profile;
}

const Inbox: React.FC<InboxProps> = ({ profile }) => {
  const { targetUserId } = useParams<{ targetUserId: string }>();
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [tradeRequests, setTradeRequests] = useState<any[]>([]);
  const [sentTrades, setSentTrades] = useState<any[]>([]);
  const [myBulletins, setMyBulletins] = useState<any[]>([]);
  const [tradeItemsMap, setTradeItemsMap] = useState<Record<string, Item>>({});
  
  // Messaging integration
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Profile | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'bulletins' | 'messages'>(targetUserId ? 'messages' : 'received');
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchEverything();
    if (targetUserId) {
        fetchUserAndMessages(targetUserId);
    }
  }, [profile.id, targetUserId]);

  useEffect(() => {
    if (activeTab === 'messages' && selectedConvo) {
      const sortedIds = [profile.id, selectedConvo.id].sort();
      const channelId = `convo:${sortedIds[0]}_${sortedIds[1]}`;
      const channel = supabase.channel(channelId);

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === selectedConvo.id || newMsg.sender_id === profile.id) {
              setMessages(prev => [...prev, newMsg]);
            }
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab, selectedConvo, profile.id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchEverything = async () => {
    setLoading(true);
    try {
      const [fRes, tRes, sRes, bRes, msgSent, msgRec] = await Promise.all([
        supabase.from('friends').select(`id, status, requester:profiles!friends_requester_id_fkey(id, username)`).eq('receiver_id', profile.id).eq('status', 'pending'),
        supabase.from('trades').select(`id, status, sender_id, receiver_id, sender_items, receiver_items, created_at, sender:profiles!trades_sender_id_fkey(id, username)`).eq('receiver_id', profile.id).eq('status', 'pending'),
        supabase.from('trades').select(`id, status, sender_id, receiver_id, sender_items, receiver_items, created_at, receiver:profiles!trades_receiver_id_fkey(id, username)`).eq('sender_id', profile.id).eq('status', 'pending'),
        supabase.from('trade_ads').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('messages').select('receiver_id').eq('sender_id', profile.id),
        supabase.from('messages').select('sender_id').eq('receiver_id', profile.id)
      ]);

      if (fRes.data) setFriendRequests(fRes.data);
      if (tRes.data) setTradeRequests(tRes.data);
      if (sRes.data) setSentTrades(sRes.data);
      if (bRes.data) setMyBulletins(bRes.data);

      // Enlist all items involved in trades for the summary view
      const allItemIds = new Set<string>();
      [...(tRes.data || []), ...(sRes.data || [])].forEach(trade => {
        trade.sender_items?.forEach((id: string) => allItemIds.add(id));
        trade.receiver_items?.forEach((id: string) => allItemIds.add(id));
      });

      if (allItemIds.size > 0) {
        const { data: items } = await supabase.from('items').select('*').in('id', Array.from(allItemIds));
        if (items) {
          const map: Record<string, Item> = {};
          items.forEach((it: Item) => map[it.id] = it);
          setTradeItemsMap(map);
        }
      }

      const sentIds = msgSent.data?.map(m => m.receiver_id) || [];
      const recIds = msgRec.data?.map(m => m.sender_id) || [];
      const uids = new Set([...sentIds, ...recIds]);

      if (uids.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(uids));
        if (profiles) setConversations(profiles as Profile[]);
      }
    } catch (err) {
      console.error("Archive sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecommissionBulletin = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "DECOMMISSION_BULLETIN",
      message: "THIS SIGNAL WILL BE PERMANENTLY REMOVED FROM THE GLOBAL DIRECTORY.",
      onConfirm: async () => {
        const { error } = await supabase.from('trade_ads').delete().eq('id', id);
        if (!error) {
          setMyBulletins(prev => prev.filter(b => b.id !== id));
        }
        setModalConfig(null);
      }
    });
  };

  const handleRevokeTrade = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "REVOKE_PROPOSAL",
      message: "WITHDRAW THIS TRADE REQUEST FROM THE RECEIVER'S NODE? THIS ACTION IS FINAL.",
      onConfirm: async () => {
        const { error } = await supabase.from('trades').delete().eq('id', id);
        if (!error) {
          setSentTrades(prev => prev.filter(t => t.id !== id));
        }
        setModalConfig(null);
      }
    });
  };

  const fetchUserAndMessages = async (uid: string) => {
    const { data: targetProfile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (targetProfile) setSelectedConvo(targetProfile as Profile);
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedConvo || isSending) return;
    
    if (!isClean(inputText)) {
       setModalConfig({
         isOpen: true,
         title: "SAFETY_REJECTION",
         message: "CONTENT VIOLATES PROTOCOL. SIGNAL BLOCKED.",
         onConfirm: () => setModalConfig(null)
       });
       return;
    }

    const msgText = censor(cleanStrict(inputText, true));
    setInputText(''); 
    setIsSending(true);

    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedConvo.id,
      text: msgText
    });

    setIsSending(false);
  };

  if (loading) return (
    <div className="py-40 flex flex-col items-center gap-6">
      <div className="w-12 h-[1px] bg-zinc-100 overflow-hidden relative"><div className="absolute inset-0 bg-zinc-950 animate-[slide_1.5s_infinite_linear]" style={{width: '30%'}} /></div>
      <div className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-900 animate-pulse">ARCHIVE_QUERY</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-12 py-10 animate-in fade-in duration-700 relative">
      
      {modalConfig && (
        <HandshakeModal 
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}

      <header className="w-full flex justify-center gap-10 border-b border-zinc-100 pb-8 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        {['received', 'sent', 'bulletins', 'messages'].map(id => (
          <button 
            key={id} onClick={() => { setActiveTab(id as any); if (id !== 'messages') setSelectedConvo(null); }}
            className={`text-[11px] uppercase tracking-[0.4em] font-bold transition-all px-4 py-2 ${activeTab === id ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-300 hover:text-zinc-600'}`}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </header>

      <div className="w-full min-h-[500px]">
        {activeTab === 'messages' ? (
          <div className="flex h-[600px] border border-zinc-100 bg-white shadow-sm overflow-hidden">
             <aside className="w-64 border-r border-zinc-50 p-6 space-y-4 overflow-y-auto bg-zinc-50/20">
                <h3 className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold mb-6">THREADS</h3>
                {conversations.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { setSelectedConvo(c); fetchUserAndMessages(c.id); }}
                    className={`w-full text-left p-4 text-[11px] font-bold uppercase tracking-widest border transition-all ${selectedConvo?.id === c.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-100 hover:bg-zinc-50'}`}
                  >
                    @{c.username}
                  </button>
                ))}
                {conversations.length === 0 && <p className="text-[8px] uppercase font-bold text-zinc-300">No active signals</p>}
             </aside>
             <div className="flex-1 flex flex-col relative">
                {selectedConvo ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#FAFAFA]">
                      {messages.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.sender_id === profile.id ? 'items-end' : 'items-start'}`}>
                          <div className={`p-5 text-[13px] font-medium leading-relaxed tracking-wide break-all max-w-[70%] ${m.sender_id === profile.id ? 'bg-zinc-900 text-white rounded-l-xl rounded-tr-xl' : 'bg-white border border-zinc-100 text-zinc-900 rounded-r-xl rounded-tl-xl'}`}>
                            {censor(m.text)}
                          </div>
                        </div>
                      ))}
                      <div ref={scrollRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-8 border-t border-zinc-50 flex gap-4 bg-white">
                      <input 
                        value={inputText} onChange={e => setInputText(cleanStrict(e.target.value, true))}
                        placeholder="Type signal..." className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 text-[12px] font-bold uppercase tracking-widest outline-none focus:border-zinc-900"
                      />
                      <button disabled={!inputText.trim()} className="px-10 py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black">SEND</button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                     <div className="w-8 h-8 border-2 border-zinc-100 rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-zinc-100 rounded-full" /></div>
                     <span className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-200">Select Thread</span>
                  </div>
                )}
             </div>
          </div>
        ) : activeTab === 'bulletins' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {myBulletins.map(b => (
               <div key={b.id} className="bg-white border border-zinc-100 p-10 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 left-0 bg-zinc-950 text-white text-[8px] font-bold tracking-widest px-3 py-1">ACTIVE_BROADCAST</div>
                  <button 
                    onClick={() => handleDecommissionBulletin(b.id)}
                    className="absolute top-4 right-4 text-red-600 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    [ DECOMMISSION ]
                  </button>
                  <p className="text-[15px] italic font-medium leading-relaxed text-zinc-800 my-8">"{b.text}"</p>
                  <div className="flex justify-between items-baseline pt-6 border-t border-zinc-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">LF: {b.looking_for || 'INQUIRY'}</span>
                    <span className="text-[8px] text-zinc-200 font-bold">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
               </div>
             ))}
             <Link to="/post-bulletin" className="border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center py-20 bg-zinc-50/20 group hover:border-zinc-900 transition-all">
                <span className="text-[32px] text-zinc-200 group-hover:text-zinc-950">+</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300 group-hover:text-zinc-950">Initialize Broadcast</span>
             </Link>
          </div>
        ) : (
          <div className="space-y-6">
             {activeTab === 'received' && (
               <>
                {friendRequests.map(req => (
                  <div key={req.id} className="p-8 border border-zinc-100 flex justify-between items-center bg-white hover:shadow-md transition-all">
                    <span className="text-[12px] uppercase tracking-widest font-bold">LINK REQUEST FROM @{req.requester.username}</span>
                    <button className="text-[10px] uppercase font-bold bg-zinc-900 text-white px-8 py-3 hover:bg-black">Accept</button>
                  </div>
                ))}
                {tradeRequests.map(trade => (
                  <div key={trade.id} className="p-10 border border-zinc-100 bg-white hover:border-zinc-950 shadow-sm transition-all group">
                    <div className="flex justify-between items-start mb-10">
                      <span className="text-[13px] uppercase font-bold tracking-widest text-zinc-900">PROPOSAL FROM @{trade.sender.username}</span>
                      <span className="text-[9px] text-zinc-300 font-bold">{new Date(trade.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-12 mb-10">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-4">THEIR OFFER</span>
                        <div className="flex flex-wrap gap-2">
                          {trade.sender_items?.map((id: string) => (
                            <div key={id} className="w-12 h-12 bg-zinc-50 border border-zinc-100 p-1">
                              <img src={tradeItemsMap[id]?.image_url} className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-4">THEIR REQUEST</span>
                        <div className="flex flex-wrap gap-2">
                          {trade.receiver_items?.map((id: string) => (
                            <div key={id} className="w-12 h-12 bg-zinc-50 border border-zinc-100 p-1">
                              <img src={tradeItemsMap[id]?.image_url} className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-4 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black">INSPECT HANDSHAKE</button>
                  </div>
                ))}
                {friendRequests.length === 0 && tradeRequests.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-zinc-50 bg-zinc-50/10">
                    <span className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-200">No incoming signals</span>
                  </div>
                )}
               </>
             )}
             {activeTab === 'sent' && (
               <>
                 {sentTrades.map(trade => (
                    <div key={trade.id} className="p-10 border border-zinc-100 bg-white shadow-sm relative group transition-all hover:border-zinc-950">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] uppercase tracking-widest font-bold">SENT TO @{trade.receiver.username}</span>
                          <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">Awaiting Remote Handshake</span>
                        </div>
                        <button 
                          onClick={() => handleRevokeTrade(trade.id)}
                          className="text-[10px] text-zinc-300 hover:text-red-500 font-bold uppercase tracking-widest transition-colors"
                        >
                          [ REVOKE ]
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-12 border-t border-zinc-50 pt-8">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-4">YOUR OFFER</span>
                          <div className="flex flex-wrap gap-2">
                            {trade.sender_items?.map((id: string) => (
                              <div key={id} className="w-12 h-12 bg-zinc-50 border border-zinc-100 p-1">
                                <img src={tradeItemsMap[id]?.image_url} className="w-full h-full object-contain" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-4">YOUR REQUEST</span>
                          <div className="flex flex-wrap gap-2">
                            {trade.receiver_items?.map((id: string) => (
                              <div key={id} className="w-12 h-12 bg-zinc-50 border border-zinc-100 p-1">
                                <img src={tradeItemsMap[id]?.image_url} className="w-full h-full object-contain" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                 ))}
                 {sentTrades.length === 0 && (
                   <div className="py-20 text-center border-2 border-dashed border-zinc-50 bg-zinc-50/10">
                     <span className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-200">No active outgoing signals</span>
                   </div>
                 )}
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
