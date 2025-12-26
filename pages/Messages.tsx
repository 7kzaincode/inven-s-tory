
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (targetUserId) {
      fetchUserAndMessages(targetUserId);
    } else {
      setSelectedUser(null);
      setMessages([]);
    }
  }, [targetUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get unique people I've talked to
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', session.user.id);
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', session.user.id);

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

    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .or(`and(sender_id.eq.${session?.user.id},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${session?.user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: session?.user.id,
        receiver_id: selectedUser.id,
        text: inputText
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single();

    if (!error && data) {
      setMessages([...messages, data as Message]);
      setInputText('');
      // Update conversations list if new
      if (!conversations.find(c => c.id === selectedUser.id)) {
        setConversations([selectedUser, ...conversations]);
      }
    }
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest">Waking Communications Hub...</div>;

  return (
    <div className="flex w-full h-[75vh] gap-12">
      {/* Conversation Sidebar */}
      <aside className="w-80 border-r border-zinc-100 pr-12 space-y-10 overflow-y-auto">
        <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-zinc-900 sticky top-0 bg-white pb-6">ACTIVE CHANNELS</h3>
        <div className="space-y-4">
          {conversations.map(c => (
            <Link 
              key={c.id} to={`/messages/${c.id}`}
              className={`w-full flex items-center gap-4 p-5 border transition-all ${selectedUser?.id === c.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-50 hover:border-zinc-200'}`}
            >
              <div className="w-8 h-8 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden flex-shrink-0">
                {c.avatar_url && <img src={c.avatar_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-widest truncate max-w-[140px]">@{c.username}</span>
              </div>
            </Link>
          ))}
          {conversations.length === 0 && <p className="text-[9px] uppercase tracking-widest text-zinc-300 italic">No archival chatter found</p>}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-white border border-zinc-100 shadow-sm">
        {selectedUser ? (
          <>
            <header className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <Link to={`/profile/${selectedUser.username}`} className="flex items-center gap-4 hover:opacity-70 transition-opacity">
                <div className="w-10 h-10 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden">
                  {selectedUser.avatar_url && <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold uppercase tracking-widest">@{selectedUser.username}</span>
                  <span className="text-[8px] uppercase tracking-widest text-zinc-400">Secure Channel</span>
                </div>
              </Link>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-zinc-50/20">
              {messages.map(m => {
                const isMe = m.sender_id !== selectedUser.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] p-6 text-[14px] font-medium leading-relaxed tracking-wide ${isMe ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-900 shadow-sm'}`}>
                      {m.text}
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-400 mt-3 font-bold">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-8 border-t border-zinc-100 bg-white">
              <input 
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder="PROPOSE DIALOGUE..."
                className="w-full bg-zinc-50 text-[13px] uppercase tracking-widest font-bold outline-none border border-zinc-100 p-6 focus:border-zinc-900 focus:bg-white transition-all shadow-inner"
              />
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 space-y-6">
             <div className="w-20 h-20 border border-zinc-100 rounded-full flex items-center justify-center">
               <span className="text-[20px] font-light">⇅</span>
             </div>
             <span className="text-[11px] uppercase tracking-[0.5em] font-bold">Select Archival Channel</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
