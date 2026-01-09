
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { censor, isClean } from '../services/safetyService';
import { Profile, Message } from '../types';

const Messages: React.FC = () => {
  const { targetUserId } = useParams<{ targetUserId: string }>();
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
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
      const sortedIds = [currentUserId, targetUserId].sort();
      const channelId = `convo:${sortedIds[0]}_${sortedIds[1]}`;
      const channel = supabase.channel(channelId);

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === targetUserId || newMsg.sender_id === currentUserId) {
              setMessages(prev => [...prev, newMsg]);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setMessages(prev => prev.filter(m => m.id !== oldId));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [targetUserId, currentUserId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async (uid: string) => {
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', uid);
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', uid);
    const uids = new Set([...(sent?.map(m => m.receiver_id) || []), ...(received?.map(m => m.sender_id) || [])]);
    if (uids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(uids));
      if (profiles) setConversations(profiles as Profile[]);
    }
    setLoading(false);
  };

  const fetchUserAndMessages = async (uid: string) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (profile) setSelectedUser(profile as Profile);
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const deleteMessage = async (msgId: string) => {
    if (!window.confirm("DE-INDEX THIS DIALOGUE FRAGMENT?")) return;
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) alert("DELETION FAILURE: ACCESS DENIED.");
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUser || !currentUserId || isSending) return;

    if (!isClean(inputText)) {
      alert("ARCHIVAL REJECTION: CONTENT VIOLATES SAFETY PROTOCOL.");
      setInputText('');
      return;
    }

    const msgText = censor(inputText);
    setInputText(''); 
    setIsSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedUser.id,
      text: msgText
    });

    if (error) alert("SIGNAL FAILURE: " + error.message);
    setIsSending(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest animate-pulse">Syncing...</div>;

  return (
    <div className="flex w-full h-[75vh] gap-12">
      <aside className="w-80 border-r border-zinc-100 pr-12 space-y-10 overflow-y-auto">
        <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-zinc-900 sticky top-0 bg-white pb-6 border-b border-zinc-50">CHANNELS</h3>
        <div className="space-y-4">
          {conversations.map(c => (
            <Link key={c.id} to={`/messages/${c.id}`} className={`w-full flex items-center gap-4 p-5 border ${selectedUser?.id === c.id ? 'border-zinc-900 bg-zinc-900 text-white shadow-xl' : 'border-zinc-50 hover:bg-zinc-50'}`}>
              <div className="w-8 h-8 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden flex-shrink-0">
                {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300 font-bold">@</div>}
              </div>
              <span className="text-[12px] font-bold uppercase tracking-widest truncate">@{c.username}</span>
            </Link>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-white border border-zinc-100 relative shadow-sm">
        {selectedUser ? (
          <>
            <header className="px-10 py-7 border-b border-zinc-100 flex items-center gap-5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="w-12 h-12 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden">
                {selectedUser.avatar_url && <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />}
              </div>
              <span className="text-[15px] font-bold uppercase tracking-[0.2em] text-zinc-900">@{selectedUser.username}</span>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-[#FAFAFA]">
              {messages.map(m => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                    <div className="flex items-center gap-2 max-w-[70%]">
                      {isMe && (
                        <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-300 hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      )}
                      <div className={`p-7 text-[14px] font-medium leading-relaxed tracking-wide ${isMe ? 'bg-zinc-900 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white border border-zinc-100 text-zinc-900 rounded-r-2xl rounded-tl-2xl'}`}>
                        {censor(m.text)}
                      </div>
                    </div>
                    <span className="mt-2 text-[8px] uppercase font-bold text-zinc-300 tracking-widest">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-10 border-t border-zinc-100 bg-white flex gap-6 items-center">
              <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="PROPOSE DIALOGUE..." className="flex-1 bg-zinc-50 text-[13px] tracking-widest font-bold outline-none border border-zinc-100 px-8 py-6 focus:border-zinc-900 focus:bg-white" autoComplete="off" />
              <button type="submit" disabled={!inputText.trim() || isSending} className="px-12 py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95">Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-300">
             <span className="text-[12px] uppercase tracking-[0.6em] font-bold text-zinc-400">ENCRYPTION ACTIVE</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
