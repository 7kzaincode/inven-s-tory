
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import InventoryGrid from '../components/InventoryGrid';
import { supabase } from '../services/supabase';
import { Item, Profile, Friend } from '../types';
import { processImageWithAI } from '../services/geminiService';

// Fallback legacy profile data
const LEGACY_DATA: Record<string, any> = {
  'brutalist_lab': {
    id: 'legacy-node-001',
    username: 'brutalist_lab',
    bio: 'Curating monochrome forms and brutalist archival hardware. Focus on 1970s Braun design and minimalist objects.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 14500, liquidCount: 4 },
    items: [
      { id: 'l1', name: 'BRAUN T3 RADIO', category: 'HARDWARE', condition: 'ARCHIVAL', price: 450, image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop', public: true, for_trade: true },
      { id: 'l2', name: 'BRUTALIST VASE', category: 'OBJECT', condition: 'USED', price: 120, image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop', public: true, for_trade: true }
    ]
  },
  'vintage_optics': {
    id: 'legacy-node-002',
    username: 'vintage_optics',
    bio: 'Specialist in 90s tech, archival optics, and rare media repositories.',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 8200, liquidCount: 2 },
    items: [
      { id: 'l3', name: 'OPTIC GEN 2', category: 'HARDWARE', condition: 'VNDS', price: 800, image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop', public: true, for_trade: true }
    ]
  },
  'hardware_vault': {
    id: 'legacy-node-003',
    username: 'hardware_vault',
    bio: 'Mapping the intersection of physical utility and identity through high-performance objects.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 32000, liquidCount: 12 },
    items: []
  },
  'studio_index': {
    id: 'legacy-node-004',
    username: 'studio_index',
    bio: 'Typography, brutalist print media, and rare book curation. The history of the printed word as object.',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 19800, liquidCount: 5 },
    items: [
       { id: 'l4', name: 'DESIGN_MANUAL_1', category: 'MEDIA', condition: 'ARCHIVAL', price: 1200, image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop', public: true, for_trade: true }
    ]
  },
  'analog_archive': {
    id: 'legacy-node-005',
    username: 'analog_archive',
    bio: 'Magnetic media specialist. 35mm film, modular synthesis, and the preservation of analog decay.',
    avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 24500, liquidCount: 8 },
    items: []
  },
  'tech_decay': {
    id: 'legacy-node-006',
    username: 'tech_decay',
    bio: 'Translucent plastics and early 2000s computing. Documenting the aesthetic of the early internet age.',
    avatar_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=200&auto=format&fit=crop',
    stats: { totalVal: 11200, liquidCount: 3 },
    items: [
       { id: 'l5', name: 'G3_NODE', category: 'HARDWARE', condition: 'VNDS', price: 950, image_url: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?q=80&w=400&auto=format&fit=crop', public: true, for_trade: true }
    ]
  }
};

interface ProfilePageProps {
  currentUser: Profile | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser }) => {
  const { username: routeUsername } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [stats, setStats] = useState({ totalVal: 0, liquidCount: 0, privateCount: 0 });
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  useEffect(() => {
    fetchProfileAndItems();
  }, [routeUsername]);

  const fetchProfileAndItems = async () => {
    setLoading(true);

    if (routeUsername && LEGACY_DATA[routeUsername]) {
      const data = LEGACY_DATA[routeUsername];
      setTargetProfile(data);
      setItems(data.items);
      setStats({ 
        totalVal: data.stats.totalVal, 
        liquidCount: data.stats.liquidCount, 
        privateCount: 0 
      });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('username', routeUsername).single();
    if (!profile) {
      setLoading(false);
      return;
    }
    setTargetProfile(profile as Profile);
    setNewUsername(profile.username);
    
    if (!isEditing) setEditBio(profile.bio || '');

    // Note: Owners see all their items, non-owners only see public ones.
    const isSelf = currentUser?.id === profile.id;
    let query = supabase.from('items').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false });
    if (!isSelf) {
      query = query.eq('public', true);
    }

    const { data: itemsData } = await query;
    if (itemsData) {
      setItems(itemsData as Item[]);
      const total = itemsData.reduce((acc, it) => acc + (it.price || 0), 0);
      const liquid = itemsData.filter(it => it.for_trade || it.for_sale).length;
      const privateUnits = itemsData.filter(it => !it.public).length;
      
      setStats({ 
        totalVal: total, 
        liquidCount: liquid, 
        privateCount: privateUnits
      });
    }

    if (currentUser && currentUser.id !== profile.id) {
      const { data: fData } = await supabase.from('friends')
        .select('*')
        .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .single();
      if (fData) setFriendStatus(fData.status as any);
      else setFriendStatus('none');
    }

    setLoading(false);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername || newUsername === targetProfile?.username) return;
    setActionLoading(true);
    const { error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', currentUser?.id);
    if (error) {
      alert("HANDLE UNAVAILABLE.");
    } else {
      navigate(`/profile/${newUsername}`);
      setShowSettings(false);
    }
    setActionLoading(false);
  };

  const handleLinkRequest = async () => {
    if (!currentUser || !targetProfile) return;
    setActionLoading(true);
    const { error } = await supabase.from('friends').insert({
      requester_id: currentUser.id,
      receiver_id: targetProfile.id,
      status: 'pending'
    });
    if (!error) setFriendStatus('pending');
    setActionLoading(false);
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
  const isLegacy = targetProfile.id.startsWith('legacy');

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
          <div className="absolute top-16 right-0 w-80 bg-white border border-zinc-100 shadow-2xl z-50 p-8 animate-in slide-in-from-top-4 duration-300">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] border-b border-zinc-50 pb-4 mb-6 text-black">IDENTITY CONTROL</h4>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">Update Handle</label>
                   <div className="flex gap-2">
                     <input value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase())} className="flex-1 border-b border-zinc-900 py-1 text-[12px] font-bold outline-none" />
                     <button onClick={handleUpdateUsername} disabled={actionLoading} className="text-[9px] font-bold uppercase underline">Update</button>
                   </div>
                </div>
                <button onClick={startEditing} className="w-full text-left text-[11px] uppercase tracking-widest font-bold text-black hover:text-zinc-500">Edit Bio</button>
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
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] uppercase tracking-[0.4em] font-bold text-zinc-900">@{targetProfile.username}</h1>
            {isLegacy && <span className="text-[8px] uppercase tracking-widest bg-zinc-100 px-2 py-1 text-zinc-400 font-bold">Legacy Node</span>}
          </div>
          
          <div className="flex gap-12 items-center bg-zinc-50/50 p-6 border border-zinc-50 shadow-inner mt-8">
            <div className="text-center px-6 border-r border-zinc-100">
              <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-400 font-bold block mb-1">UNITS</span>
              <span className="text-[16px] font-bold text-zinc-900">{items.length}</span>
            </div>
            <div className="text-center px-6 border-r border-zinc-100">
              <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-400 font-bold block mb-1">VALUATION</span>
              <span className="text-[16px] font-bold text-zinc-900">${stats.totalVal.toLocaleString()}</span>
            </div>
            <div className="text-center px-6">
              <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-400 font-bold block mb-1">LIQUIDITY</span>
              <span className="text-[16px] font-bold text-zinc-900">{items.length > 0 ? Math.round((stats.liquidCount / items.length) * 100) : 0}%</span>
            </div>
          </div>
          {isSelf && stats.privateCount > 0 && (
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">({stats.privateCount} UNITS VAULTED / HIDDEN)</p>
          )}
        </div>

        <div className="w-full max-w-lg mt-12 text-center">
          {isEditing ? (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="IDENTITY BIOGRAPHY..." className="w-full bg-zinc-50 border border-zinc-100 p-8 text-[14px] font-medium tracking-wide outline-none h-40 resize-none text-black shadow-inner" />
              <div className="flex gap-6">
                <button onClick={saveProfile} disabled={actionLoading} className="flex-1 py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all">Commit</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] text-black hover:bg-zinc-50">Cancel</button>
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
              <>
                <button onClick={startEditing} className="text-[11px] uppercase tracking-[0.4em] font-bold border border-zinc-900 px-12 py-5 text-black hover:bg-zinc-900 hover:text-white transition-all">Edit Archive</button>
                <Link to="/add" className="text-[11px] uppercase tracking-[0.4em] font-bold bg-zinc-900 text-white px-12 py-5 hover:bg-black transition-all shadow-xl">Index Unit</Link>
              </>
            ) : (
              <>
                {!isLegacy && friendStatus === 'none' && (
                  <button onClick={handleLinkRequest} disabled={actionLoading} className="text-[11px] uppercase tracking-[0.3em] border border-zinc-300 text-zinc-300 font-bold px-10 py-5 hover:border-black hover:text-black transition-all">Link Identity</button>
                )}
                {!isLegacy && friendStatus === 'pending' && (
                  <button disabled className="text-[11px] uppercase tracking-[0.3em] bg-zinc-50 text-zinc-300 font-bold px-10 py-5 italic">Link Pending</button>
                )}
                {!isLegacy && (
                  <>
                    <Link to={`/trade/${targetProfile.username}`} className="text-[11px] uppercase tracking-[0.3em] border border-zinc-900 text-zinc-900 font-bold px-10 py-5 hover:bg-zinc-50">Propose Trade</Link>
                    <Link to={`/messages/${targetProfile.id}`} className="text-[11px] uppercase tracking-[0.3em] bg-zinc-900 text-white font-bold px-10 py-5 hover:bg-black transition-all shadow-xl">Message</Link>
                  </>
                )}
                {isLegacy && (
                  <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold italic py-5 border-y border-zinc-50">Simulation Hub: Interactivity Restricted</span>
                )}
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
