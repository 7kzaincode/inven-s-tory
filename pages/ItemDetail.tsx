
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Profile } from '../types';

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCondition, setEditCondition] = useState('');
  const [editPrice, setEditPrice] = useState<number | undefined>(0);
  const [editForSale, setEditForSale] = useState(false);
  const [editForTrade, setEditForTrade] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: itemData } = await supabase.from('items').select('*').eq('id', id).single();
    
    if (itemData) {
      setItem(itemData as Item);
      const ownerId = itemData.owner_id;
      setIsOwner(session?.user.id === ownerId);
      
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', ownerId).single();
      if (pData) setOwnerProfile(pData as Profile);

      setEditName(itemData.name);
      setEditCategory(itemData.category || 'OBJECT');
      setEditCondition(itemData.condition || 'USED');
      setEditPrice(itemData.price);
      setEditForSale(itemData.for_sale);
      setEditForTrade(itemData.for_trade);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase.from('items').update({
        name: editName,
        category: editCategory,
        condition: editCondition,
        price: editPrice,
        for_sale: editForSale,
        for_trade: editForTrade
      }).eq('id', id);

    if (!error) {
      setIsEditing(false);
      fetchItem();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO DE-INDEX THIS UNIT?")) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) navigate('/my-space');
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest">Querying Archive...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase font-bold tracking-widest">Unit not found</div>;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-16 lg:gap-32 py-12">
      <div className="w-full lg:w-1/2">
        <div className="aspect-square bg-[#FDFDFD] border border-zinc-100 p-12 mb-12 flex items-center justify-center">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
        </div>

        {ownerProfile && (
          <div className="space-y-6 pt-10 border-t border-zinc-50">
             <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">CURRENT ARCHIVIST</h3>
             <Link to={`/profile/${ownerProfile.username}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden">
                   {ownerProfile.avatar_url ? <img src={ownerProfile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-300">@</div>}
                </div>
                <div className="flex flex-col">
                   <span className="text-[14px] font-bold uppercase tracking-widest text-zinc-900 group-hover:underline">@{ownerProfile.username}</span>
                </div>
             </Link>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col space-y-12">
        {isEditing ? (
          <div className="space-y-10">
             <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-b border-zinc-900 py-2 text-[18px] uppercase tracking-[0.1em] font-bold outline-none" />
             </div>
             <div className="grid grid-cols-2 gap-12">
               <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <select value={editCondition} onChange={e => setEditCondition(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div className="flex gap-4">
               <button onClick={handleUpdate} disabled={saving} className="flex-1 py-4 bg-zinc-900 text-white text-[11px] font-bold uppercase">SAVE</button>
               <button onClick={() => setIsEditing(false)} className="flex-1 py-4 border border-zinc-900 text-[11px] font-bold uppercase">CANCEL</button>
             </div>
          </div>
        ) : (
          <>
            <header className="space-y-6">
              <div className="flex justify-between items-start">
                <h1 className="text-[32px] font-bold uppercase tracking-tighter leading-none text-zinc-900">{item.name}</h1>
                <div className="flex gap-4">
                   {isOwner && <button onClick={() => setIsEditing(true)} className="text-[9px] font-bold uppercase text-zinc-400 hover:text-zinc-900">Edit</button>}
                   {isOwner && <button onClick={handleDelete} className="text-[9px] font-bold uppercase text-red-500 hover:text-red-700">Delete</button>}
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase px-3 py-1 bg-zinc-900 text-white">{item.category}</span>
                <span className="text-[10px] font-bold uppercase px-3 py-1 border border-zinc-900">{item.condition}</span>
              </div>
            </header>

            <div className="space-y-10 pt-10 border-t border-zinc-50">
               <div className="grid grid-cols-2 gap-y-8">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Archival Registry</span>
                  <span className="text-[10px] font-bold uppercase">ID_{item.id.slice(0, 8)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Market Price</span>
                  <span className="text-[14px] font-bold">{item.price ? `$${item.price.toLocaleString()}` : 'VAULTED'}</span>
               </div>

               <div className="flex flex-col gap-4 pt-10">
                 {isOwner ? (
                   <Link to="/my-space" className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em]">MANAGE ARCHIVE</Link>
                 ) : (
                   <>
                    <Link to={`/trade/${ownerProfile?.username}`} className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em]">PROPOSE TRADE</Link>
                    <Link to={`/messages/${item.owner_id}`} className="text-center py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em]">MESSAGE ARCHIVIST</Link>
                   </>
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
