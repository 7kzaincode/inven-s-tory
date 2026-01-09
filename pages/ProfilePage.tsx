
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
  const [showSettings, setShowSettings] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfileAndItems();
  }, [username]);

  const fetchProfileAndItems = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!profile) {
      setLoading(false);
      return;
    }
    setTargetProfile(profile as Profile);
    if (!isEditing) setEditBio(profile.bio || '');

    const { data: itemsData } = await supabase.from('items').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false });
    if (itemsData) setItems(itemsData as Item[]);

    if (currentUser) {
      const { data: friendData } = await supabase.from('friends').select('*').or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`).maybeSingle();
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
        const result = await processImageWithAI(base64);
        const finalUrl = result.url || base64;
        const fetchResponse = await fetch(finalUrl);
        const blob = await fetchResponse.blob();
        
        // ORGANIZED IDENTITY STORAGE: identities/[userId]/avatar_[timestamp].png
        const fileName = `identities/${currentUser.id}/avatar_${Date.now()}.png`;
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

  const startEditing = () => {
    setEditBio(targetProfile?.bio || '');
    setIsEditing(true);
    setShowSettings(false);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    const { error } = await supabase.from('profiles').update({ bio: editBio }).eq('id', currentUser.id);
    if (!error) {
      setIsEditing(false);
      fetchProfileAndItems();
    }
    setActionLoading(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-900 animate-pulse">Syncing Archive Identity...</div>;
  if (!targetProfile) return <div className="py-32 text-center text-[11px] uppercase tracking-widest text-zinc-900 font-bold">Identity Not Found</div>;

  const isSelf = currentUser?.id === targetProfile.id;

  return (
    <div className="flex flex-col items-center w-full relative">
      <header className="w-full mb-32 flex flex-col items-center">
        {isSelf && (
          <button onClick={() => setShowSettings(!showSettings)} className="absolute top-0 right-0 p-4 opacity-20 hover:opacity-100 transition-opacity">
            <div className="w-5 h-5 flex flex-col justify-between items-end">
              <span className="w-full h-[1.5px] bg-black"></span>
              <span className="w-2/3 h-[1.5px] bg-black"></span>
              <span className="w-1/3 h-[1.5px] bg-black"></span>
            </div>
          </button>
        )}

        {showSettings && isSelf && (
          <div className="absolute top-16 right-0 w-64 bg-white border border-zinc-100 shadow-2xl z-50 p-8">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] border-b border-zinc-50 pb-4 mb-6 text-black">SETTINGS</h4>
             <div className="space-y-6">
                <button onClick={startEditing} className="w-full text-left text-[11px] uppercase tracking-widest font-bold text-black">Edit Bio</button>
                <button onClick={() => setShowSettings(false)} className="w-full text-left text-[10px] uppercase tracking-widest font-bold text-zinc-300 pt-4">Close</button>
             </div>
          </div>
        )}

        <div className="relative group mb-12">
          <div className="w-40 h-40 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 overflow-hidden shadow-sm transition-all duration-700 hover:shadow-xl">
            {targetProfile.avatar_url ? <img src={targetProfile.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[32px] text-zinc-300 uppercase tracking-widest font-bold">@</span>}
            {uploadingAvatar && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-t-2 border-zinc-900 rounded-full animate-spin" /></div>}
          </div>
          {isSelf && <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 text-white text-[10px] uppercase tracking-[0.2em] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">Update</button>}
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
        </div>

        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-[32px] uppercase tracking-[0.4em] font-bold text-zinc-900">@{targetProfile.username}</h1>
          <div className="flex gap-8 items-center border-y border-zinc-50 py-4 px-12 text-[14px] font-bold text-zinc-900">
            <span>{items.length} UNITS</span>
          </div>
        </div>

        <div className="w-full max-w-lg mt-12 text-center">
          {isEditing ? (
            <div className="w-full space-y-8">
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="IDENTITY BIOGRAPHY..." className="w-full bg-zinc-50 border border-zinc-100 p-8 text-[14px] font-medium tracking-wide outline-none h-40 resize-none text-black" />
              <div className="flex gap-6">
                <button onClick={saveProfile} disabled={actionLoading} className="flex-1 py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em]">Commit</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] text-black">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="max-w-2xl text-[15px] text-zinc-700 font-medium tracking-wide leading-relaxed italic whitespace-pre-wrap">
              {targetProfile.bio || 'No bio established.'}
            </p>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-6 mt-16">
            {isSelf ? (
              <button onClick={startEditing} className="text-[11px] uppercase tracking-[0.4em] font-bold border border-zinc-900 px-12 py-5 text-black">Edit Archive</button>
            ) : (
              <>
                <Link to={`/trade/${targetProfile.username}`} className="text-[11px] uppercase tracking-[0.3em] border border-zinc-900 text-zinc-900 font-bold px-10 py-5">Propose Trade</Link>
                <Link to={`/messages/${targetProfile.id}`} className="text-[11px] uppercase tracking-[0.3em] bg-zinc-900 text-white font-bold px-10 py-5">Send Message</Link>
              </>
            )}
          </div>
        )}
      </header>

      <div className="w-full mb-32">
        <h3 className="text-[12px] uppercase tracking-[0.4em] text-zinc-900 mb-12 font-bold px-6 border-l-4 border-zinc-900">ARCHIVE SELECTION</h3>
        <InventoryGrid items={items} isOwner={isSelf} />
      </div>
    </div>
  );
};

export default ProfilePage;
