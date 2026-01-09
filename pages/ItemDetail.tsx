
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Profile, Room } from '../types';
import { cleanStrict } from '../services/safetyService';
import HandshakeModal from '../components/HandshakeModal';

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCondition, setEditCondition] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editPublic, setEditPublic] = useState(true);

  useEffect(() => {
    if (id) fetchItem();
  }, [id]);

  const fetchItem = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: itemData } = await supabase.from('items').select('*').eq('id', id).single();
    
    if (itemData) {
      const it = itemData as Item;
      setItem(it);
      setIsOwner(session?.user.id === it.owner_id);
      
      const [pRes, rRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', it.owner_id).single(),
        it.room_id ? supabase.from('rooms').select('*').eq('id', it.room_id).single() : Promise.resolve({ data: null })
      ]);

      if (pRes.data) setOwnerProfile(pRes.data as Profile);
      if (rRes.data) setRoom(rRes.data as Room);

      setEditName(it.name);
      setEditCategory(it.category || 'OBJECT');
      setEditCondition(it.condition || 'USED');
      setEditPrice(it.price || 0);
      setEditPublic(it.public);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase.from('items').update({
        name: cleanStrict(editName),
        category: editCategory,
        condition: editCondition,
        price: editPrice > 0 ? editPrice : null,
        public: editPublic
      }).eq('id', id);

    if (!error) {
      setIsEditing(false);
      fetchItem();
    }
    setSaving(false);
  };

  const handleLocate = () => {
    if (item?.room_id) {
      navigate('/atlas', { state: { roomId: item.room_id, highlightItemId: item.id } });
    }
  };

  const commitDeIndex = async () => {
    try {
      setSaving(true);
      const username = ownerProfile?.username;
      
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      
      if (username) {
        navigate(`/profile/${username}`);
      } else {
        navigate('/atlas');
      }
    } catch (err) {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-[0.4em] animate-pulse">Querying Central Archive...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase font-bold tracking-widest">Unit missing or de-indexed</div>;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-16 lg:gap-32 py-12 animate-in fade-in duration-700">
      
      <HandshakeModal 
        isOpen={showDeleteModal}
        title="DE-INDEX UNIT"
        message="YOU ARE ABOUT TO PERMANENTLY DE-INDEX THIS UNIT FROM THE CENTRAL ARCHIVE. THIS ACTION CANNOT BE REVERSED."
        onConfirm={commitDeIndex}
        onCancel={() => setShowDeleteModal(false)}
      />

      <div className="w-full lg:w-1/2 flex flex-col space-y-12">
        <div className="aspect-square bg-[#FDFDFD] border border-zinc-100 p-12 flex items-center justify-center shadow-inner group relative">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-1000" />
          {isOwner && !item.public && (
            <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[8px] font-bold tracking-[0.3em] uppercase">PRIVATE_UNIT</div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col space-y-12 overflow-hidden">
        {isEditing ? (
          <div className="space-y-10 animate-in fade-in">
             <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Identifier</label>
                <input maxLength={128} value={editName} onChange={e => setEditName(cleanStrict(e.target.value))} className="w-full border-b border-zinc-900 py-2 text-[18px] uppercase tracking-[0.1em] font-bold outline-none focus:bg-zinc-50 transition-colors" />
             </div>
             
             <div className="grid grid-cols-2 gap-12">
               <div className="flex flex-col gap-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Category</label>
                 <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Condition</label>
                 <select value={editCondition} onChange={e => setEditCondition(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             <div className="flex gap-4 pt-8">
               <button onClick={handleUpdate} disabled={saving} className="flex-1 py-4 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl">COMMIT_CHANGE</button>
               <button onClick={() => setIsEditing(false)} className="flex-1 py-4 border border-zinc-300 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all text-zinc-400">CANCEL</button>
             </div>
          </div>
        ) : (
          <>
            <header className="space-y-6">
              <div className="flex justify-between items-start">
                <h1 className="text-[36px] font-bold uppercase tracking-tighter leading-none text-zinc-950 break-all">{item.name}</h1>
                <div className="flex gap-6">
                   {isOwner && <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-950 transition-colors">EDIT</button>}
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase px-3 py-1 bg-zinc-950 text-white shadow-sm tracking-[0.2em]">{item.category}</span>
                <span className="text-[10px] font-bold uppercase px-3 py-1 border border-zinc-950 tracking-[0.2em]">{item.condition}</span>
              </div>
            </header>

            <div className="space-y-10 pt-10 border-t border-zinc-100">
               <div className="grid grid-cols-2 gap-y-10">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Archival Registry</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">ID_{item.id.slice(0, 8).toUpperCase()}</span>
                  
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Market Valuation</span>
                  <span className="text-[16px] font-bold text-zinc-950">{item.price ? `$${item.price.toLocaleString()}` : 'VAULTED'}</span>

                  {room && (
                    <>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Spatial Position</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-900">{room.name} {item.loc_note ? `// ${item.loc_note}` : ''}</span>
                    </>
                  )}
               </div>

               <div className="flex flex-col gap-4 pt-10">
                 {isOwner ? (
                   <>
                     {item.room_id && (
                       <button onClick={handleLocate} className="text-center py-5 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl">LOCATE IN ATLAS</button>
                     )}
                     <Link to={`/profile/${ownerProfile?.username}`} className="text-center py-5 border border-zinc-900 text-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-50 transition-all">RETURN_TO_ARCHIVE</Link>
                     <button onClick={() => setShowDeleteModal(true)} className="text-center py-5 border border-red-600 text-red-600 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-red-50 transition-all mt-4">DE-INDEX UNIT</button>
                   </>
                 ) : (
                   <Link to={`/messages/${item.owner_id}`} className="text-center py-5 border border-zinc-950 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-50 transition-all text-zinc-900">MESSAGE ARCHIVIST</Link>
                 )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
