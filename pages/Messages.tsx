
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Message } from '../types';

const Messages: React.FC = () => {
  const { targetUserId } = useParams<{ targetUserId: string }>();
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [targetOnline, setTargetOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchConversations(session.user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (targetUserId && currentUserId) {
      fetchUserAndMessages(targetUserId);
      
      // DETERMINISTIC CHANNEL NAME: Shared by both users
      const sortedIds = [currentUserId, targetUserId].sort();
      const channelId = `convo:${sortedIds[0]}_${sortedIds[1]}`;
      
      const channel = supabase.channel(channelId, {
        config: { presence: { key: currentUserId } }
      });

      channel
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, (payload) => {
          const newMsg = payload.new as Message;
          // Only process messages for this specific conversation
          const isRelevant = 
            (newMsg.sender_id === targetUserId && newMsg.receiver_id === currentUserId) ||
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === targetUserId);

          if (isRelevant) {
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setTargetOnline(!!state[targetUserId]);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === targetUserId && payload.typing) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [targetUserId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!targetUserId || !currentUserId) return;
    const sortedIds = [currentUserId, targetUserId].sort();
    const channelId = `convo:${sortedIds[0]}_${sortedIds[1]}`;
    
    supabase.channel(channelId).send({
      type: 'broadcast',
      event: 'typing',
      payload: { typing: true, userId: currentUserId }
    });
  };

  const fetchConversations = async (uid: string) => {
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', uid);
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', uid);

    const uids = new Set([
      ...(sent?.map(m => m.receiver_id) || []),
      ...(received?.map(m => m.sender_id) || [])
    ]);

    if (uids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(uids));
      if (profiles) setConversations(profiles as Profile[]);
    }
    setLoading(false);
  };

  const fetchUserAndMessages = async (uid: string) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (profile) setSelectedUser(profile as Profile);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUser || !currentUserId || isSending) return;

    const msgText = inputText;
    setInputText(''); 

    // Optimistic Update: Add message immediately to the UI
    const tempId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: selectedUser.id,
      text: msgText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setIsSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: selectedUser.id,
        text: msgText
      })
      .select('*')
      .single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("SIGNAL FAILURE: " + error.message);
      setInputText(msgText); 
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      if (!conversations.find(c => c.id === selectedUser.id)) {
        setConversations(prev => [selectedUser, ...prev]);
      }
    }
    setIsSending(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest animate-pulse">Syncing...</div>;

  return (
    <div className="flex w-full h-[75vh] gap-12 animate-in fade-in duration-700">
      <aside className="w-80 border-r border-zinc-100 pr-12 space-y-10 overflow-y-auto">
        <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-zinc-900 sticky top-0 bg-white pb-6 border-b border-zinc-50">CHANNELS</h3>
        <div className="space-y-4">
          {conversations.map(c => (
            <Link 
              key={c.id} to={`/messages/${c.id}`}
              className={`w-full flex items-center gap-4 p-5 border transition-all duration-500 ${selectedUser?.id === c.id ? 'border-zinc-900 bg-zinc-900 text-white shadow-xl scale-[1.02]' : 'border-zinc-50 hover:bg-zinc-50'}`}
            >
              <div className="w-8 h-8 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden flex-shrink-0">
                {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300 font-bold">@</div>}
              </div>
              <span className="text-[12px] font-bold uppercase tracking-widest truncate">@{c.username}</span>
            </Link>
          ))}
          {conversations.length === 0 && <p className="text-[9px] uppercase tracking-widest text-zinc-300 italic py-10 font-bold">No established connections</p>}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-white border border-zinc-100 relative shadow-sm">
        {selectedUser ? (
          <>
            <header className="px-10 py-7 border-b border-zinc-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden shadow-inner">
                  {selectedUser.avatar_url && <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold uppercase tracking-[0.2em] text-zinc-900">@{selectedUser.username}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${targetOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-200'}`} />
                    <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">{targetOnline ? 'CONNECTED' : 'STANDBY'}</span>
                  </div>
                </div>
              </div>
              {isTyping && <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-zinc-400 animate-pulse">Synchronizing thoughts...</span>}
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-[#FAFAFA]">
              {messages.map(m => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[65%] p-7 text-[14px] font-medium leading-relaxed tracking-wide shadow-sm ${isMe ? 'bg-zinc-900 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white border border-zinc-100 text-zinc-900 rounded-r-2xl rounded-tl-2xl'}`}>
                      {m.text}
                    </div>
                    <span className="mt-2 text-[8px] uppercase font-bold text-zinc-300 tracking-widest">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-10 border-t border-zinc-100 bg-white flex gap-6 items-center">
              <input 
                value={inputText} 
                onChange={e => { setInputText(e.target.value); handleTyping(); }}
                placeholder="PROPOSE DIALOGUE..."
                className="flex-1 bg-zinc-50 text-[13px] uppercase tracking-widest font-bold outline-none border border-zinc-100 px-8 py-6 focus:border-zinc-900 focus:bg-white transition-all shadow-inner"
                autoComplete="off"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-12 py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 space-y-6">
             <div className="text-center space-y-2">
               <span className="text-[12px] uppercase tracking-[0.6em] font-bold text-zinc-400 block">ENCRYPTION ACTIVE</span>
               <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-zinc-200 block">Establish link to initiate sync</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
