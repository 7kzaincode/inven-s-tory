
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import InventoryGrid from '../components/InventoryGrid';
import { supabase } from '../services/supabase';
import { Item, Profile, Friend } from '../types';
import { processImageWithAI } from '../services/geminiService';

interface ProfilePageProps {
  currentUser: Profile | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser }) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendship, setFriendship] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit State
  const [editBio, setEditBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfileAndItems();
  }, [username, currentUser]);

  const fetchProfileAndItems = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!profile) {
      setLoading(false);
      return;
    }
    setTargetProfile(profile as Profile);
    setEditBio(profile.bio || '');

    const { data: itemsData } = await supabase.from('items').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false });
    if (itemsData) setItems(itemsData as Item[]);

    // Fetch Friends
    const { data: friendRecords } = await supabase
      .from('friends')
      .select('requester_id, receiver_id, requester:profiles!friends_requester_id_fkey(*), receiver:profiles!friends_receiver_id_fkey(*)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    if (friendRecords) {
      const friendProfiles = friendRecords.map(f => {
        const p = f.requester_id === profile.id ? f.receiver : f.requester;
        return Array.isArray(p) ? p[0] : p;
      });
      setFriends(friendProfiles as unknown as Profile[]);
    }

    if (currentUser) {
      const { data: friendData } = await supabase
        .from('friends')
        .select('*')
        .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();
      setFriendship(friendData as Friend);
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      setUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const normalized = await processImageWithAI(base64);
        const blob = await (await fetch(normalized || base64)).blob();
        const fileName = `avatars/${currentUser.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage.from('inventory').upload(fileName, blob);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(fileName);
          await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
          fetchProfileAndItems();
        }
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ bio: editBio }).eq('id', currentUser.id);
    setIsEditing(false);
    fetchProfileAndItems();
    setActionLoading(false);
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !targetProfile) return;
    setActionLoading(true);
    await supabase.from('friends').insert({ requester_id: currentUser.id, receiver_id: targetProfile.id, status: 'pending' });
    fetchProfileAndItems();
    setActionLoading(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-900">Syncing Archive Identity...</div>;
  if (!targetProfile) return <div className="py-32 text-center text-[11px] uppercase tracking-widest text-zinc-900 font-bold">Identity Not Found</div>;

  const isSelf = currentUser?.id === targetProfile.id;

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full mb-32 flex flex-col items-center">
        <div className="relative group mb-12">
          <div className="w-40 h-40 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 overflow-hidden shadow-sm transition-all duration-700 hover:shadow-xl">
            {targetProfile.avatar_url ? (
              <img src={targetProfile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[32px] text-zinc-300 uppercase tracking-widest font-bold">@{targetProfile.username[0]}</span>
            )}
            {uploadingAvatar && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-t-2 border-zinc-900 rounded-full animate-spin" /></div>}
          </div>
          {isSelf && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 text-white text-[10px] uppercase tracking-[0.2em] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
            >
              Update Image
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
        </div>

        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-[32px] uppercase tracking-[0.4em] font-bold text-zinc-900 leading-none">@{targetProfile.username}</h1>
          <div className="flex gap-8 items-center border-y border-zinc-50 py-4 px-12">
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-bold text-zinc-900">{items.length}</span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold">UNITS</span>
            </div>
            <div className="w-[1px] h-6 bg-zinc-100" />
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-bold text-zinc-900">{friends.length}</span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold">LINKS</span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="w-full max-w-lg mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <textarea 
              value={editBio} onChange={e => setEditBio(e.target.value)}
              placeholder="IDENTITY BIOGRAPHY..."
              className="w-full bg-zinc-50 border border-zinc-100 p-8 text-[14px] font-medium tracking-wide outline-none h-40 focus:border-zinc-900 transition-all shadow-inner"
            />
            <div className="flex gap-6">
              <button onClick={saveProfile} disabled={actionLoading} className="flex-1 py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all">Commit</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em]">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="max-w-2xl text-center mt-12 text-[15px] text-zinc-700 font-medium tracking-wide leading-relaxed px-6 italic whitespace-pre-wrap">
            {targetProfile.bio || (isSelf ? 'No bio established.' : 'Identity bio is unwritten.')}
          </p>
        )}

        <div className="flex gap-6 mt-16">
          {isSelf ? (
            <>
              <button onClick={() => setIsEditing(true)} className="text-[11px] uppercase tracking-[0.4em] font-bold border border-zinc-900 px-12 py-5 hover:bg-zinc-900 hover:text-white transition-all">Edit Archive</button>
              <button onClick={() => navigate('/add')} className="text-[11px] uppercase tracking-[0.4em] font-bold bg-zinc-900 text-white px-12 py-5 hover:bg-black transition-all">Post Bulletin</button>
            </>
          ) : (
            <>
              {!friendship && (
                <button onClick={sendFriendRequest} disabled={actionLoading} className="text-[11px] uppercase tracking-[0.3em] border border-zinc-900 font-bold px-10 py-5 hover:bg-zinc-900 hover:text-white transition-all">Link Archive</button>
              )}
              {friendship?.status === 'pending' && (
                <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 font-bold px-10 py-5 border border-zinc-100">Pending</span>
              )}
              <Link to={`/trade/${targetProfile.username}`} className="text-[11px] uppercase tracking-[0.3em] border border-zinc-900 text-zinc-900 font-bold px-10 py-5 hover:bg-zinc-50 transition-all">Propose Trade</Link>
              <Link to={`/messages/${targetProfile.id}`} className="text-[11px] uppercase tracking-[0.3em] bg-zinc-900 text-white font-bold px-10 py-5 hover:bg-black transition-all">Send Message</Link>
            </>
          )}
        </div>
      </header>

      <div className="w-full mb-32 flex flex-col lg:flex-row gap-24">
        <div className="flex-1">
          <h3 className="text-[12px] uppercase tracking-[0.4em] text-zinc-900 mb-12 font-bold px-6 border-l-4 border-zinc-900">ARCHIVE SELECTION</h3>
          <InventoryGrid items={items} isOwner={isSelf} />
        </div>

        <aside className="w-full lg:w-96 space-y-16 border-t lg:border-t-0 lg:border-l border-zinc-50 pt-16 lg:pt-0 lg:pl-16">
          <section>
            <h3 className="text-[12px] uppercase tracking-[0.4em] text-zinc-900 mb-10 font-bold">ESTABLISHED LINKS</h3>
            <div className="space-y-6">
              {friends.map(f => (
                <Link key={f.id} to={`/profile/${f.username}`} className="flex items-center gap-5 group hover:bg-zinc-50 p-2 transition-all">
                  <div className="w-10 h-10 bg-zinc-50 rounded-full border border-zinc-100 overflow-hidden flex-shrink-0 shadow-sm">
                    {f.avatar_url && <img src={f.avatar_url} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-zinc-600 group-hover:text-zinc-900">@{f.username}</span>
                </Link>
              ))}
              {friends.length === 0 && <p className="text-[10px] uppercase tracking-widest text-zinc-300 italic">No links verified.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProfilePage;
