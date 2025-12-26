
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
    }
  }, [targetUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);

    if (data) {
      const userIds = new Set(data.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== session.user.id));
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(userIds));
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
    }
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest">Waking Communications...</div>;

  return (
    <div className="flex w-full h-[70vh] gap-8">
      {/* Sidebar List */}
      <aside className="w-64 border-r border-zinc-100 pr-8 space-y-6">
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-900 mb-10">CONVERSATIONS</h3>
        {conversations.map(c => (
          <button 
            key={c.id} onClick={() => fetchUserAndMessages(c.id)}
            className={`w-full text-left p-4 border transition-all ${selectedUser?.id === c.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-50 hover:border-zinc-200'}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-widest">@{c.username}</span>
          </button>
        ))}
        {conversations.length === 0 && <p className="text-[9px] uppercase tracking-widest text-zinc-300">Archive silent</p>}
      </aside>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-zinc-50/20 border border-zinc-100">
        {selectedUser ? (
          <>
            <header className="p-6 border-b border-zinc-100 flex justify-between items-center bg-white">
              <span className="text-[12px] font-bold uppercase tracking-widest">CHANNEL: @{selectedUser.username}</span>
              <span className="text-[8px] uppercase tracking-widest text-zinc-400">Encrypted Archival Relay</span>
            </header>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {messages.map(m => {
                const isMe = m.sender_id !== selectedUser.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] p-5 text-[13px] leading-relaxed ${isMe ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}>
                      {m.text}
                    </div>
                    <span className="text-[8px] uppercase tracking-widest text-zinc-400 mt-2">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
            <form onSubmit={sendMessage} className="p-6 border-t border-zinc-100 bg-white">
              <input 
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder="MESSAGE ARCHIVIST..."
                className="w-full bg-transparent text-[12px] uppercase tracking-widest font-bold outline-none border-b border-zinc-100 py-3 focus:border-zinc-900 transition-colors"
              />
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-300">
             <span className="text-[10px] uppercase tracking-[0.5em]">Select Channel</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
