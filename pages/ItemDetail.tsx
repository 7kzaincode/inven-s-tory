
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Profile } from '../types';
import { cleanStrict } from '../services/safetyService';

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];
const MAX_VALUATION = 999999;

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
  const [editPublic, setEditPublic] = useState(true);

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
      setEditPublic(itemData.public);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const cappedPrice = editPrice ? Math.min(editPrice, MAX_VALUATION) : null;

    const { error } = await supabase.from('items').update({
        name: cleanStrict(editName),
        category: editCategory,
        condition: editCondition,
        price: editForSale ? cappedPrice : null,
        for_sale: editForSale,
        for_trade: editForTrade,
        public: editPublic
      }).eq('id', id);

    if (!error) {
      setIsEditing(false);
      fetchItem();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("DE-INDEX THIS UNIT FROM THE CENTRAL ARCHIVE?")) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) navigate('/my-space');
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase font-bold tracking-widest animate-pulse">Querying Archive Node...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase font-bold tracking-widest">Unit missing</div>;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-16 lg:gap-32 py-12 animate-in fade-in duration-700">
      <div className="w-full lg:w-1/2">
        <div className="aspect-square bg-[#FDFDFD] border border-zinc-100 p-12 mb-12 flex items-center justify-center shadow-inner group relative">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-1000" />
          {isOwner && !item.public && (
            <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[8px] font-bold tracking-[0.3em] uppercase">VAULTED (PRIVATE)</div>
          )}
        </div>

        {ownerProfile && (
          <div className="space-y-6 pt-10 border-t border-zinc-50">
             <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">CURRENT ARCHIVIST</h3>
             <Link to={`/profile/${ownerProfile.username}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full border border-zinc-100 bg-zinc-50 overflow-hidden shadow-sm group-hover:shadow-lg transition-all">
                   {ownerProfile.avatar_url ? <img src={ownerProfile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase">@</div>}
                </div>
                <div className="flex flex-col">
                   <span className="text-[14px] font-bold uppercase tracking-widest text-zinc-900 group-hover:underline leading-none">@{ownerProfile.username}</span>
                   <span className="text-[9px] uppercase tracking-widest text-zinc-400 mt-1 font-bold">Archive Identity</span>
                </div>
             </Link>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col space-y-12">
        {isEditing ? (
          <div className="space-y-10 animate-in fade-in">
             <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Archival Name ({editName.length}/128)</label>
                <input maxLength={128} value={editName} onChange={e => setEditName(cleanStrict(e.target.value))} className="w-full border-b border-zinc-900 py-2 text-[18px] uppercase tracking-[0.1em] font-bold outline-none focus:bg-zinc-50 transition-colors" />
             </div>
             
             <div className="space-y-4">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setEditPublic(!editPublic)}>
                  <div className={`w-10 h-5 border transition-all relative ${editPublic ? 'bg-zinc-900 border-zinc-900' : 'bg-zinc-100 border-zinc-200'}`}>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white transition-all ${editPublic ? 'left-6' : 'left-1'}`} />
                  </div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">
                    {editPublic ? 'INDEXED (PUBLICLY VISIBLE)' : 'VAULTED (PRIVATE / HIDDEN)'}
                  </label>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-12">
               <div className="flex flex-col gap-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Category</label>
                 <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none focus:border-zinc-900">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">State</label>
                 <select value={editCondition} onChange={e => setEditCondition(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase font-bold py-2 outline-none focus:border-zinc-900">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             <div className="flex gap-12 items-center pt-4">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setEditForSale(!editForSale)}>
                <div className={`w-5 h-5 border transition-all ${editForSale ? 'bg-zinc-900 border-zinc-900 shadow-md' : 'border-zinc-200 group-hover:border-zinc-400'}`}>
                  {editForSale && <span className="text-white text-[10px] flex items-center justify-center h-full">✓</span>}
                </div>
                <label className="text-[10px] font-bold uppercase tracking-widest group-hover:text-black transition-colors">Sale</label>
              </div>
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setEditForTrade(!editForTrade)}>
                <div className={`w-5 h-5 border transition-all ${editForTrade ? 'bg-zinc-900 border-zinc-900 shadow-md' : 'border-zinc-200 group-hover:border-zinc-400'}`}>
                  {editForTrade && <span className="text-white text-[10px] flex items-center justify-center h-full">✓</span>}
                </div>
                <label className="text-[10px] font-bold uppercase tracking-widest group-hover:text-black transition-colors">Trade</label>
              </div>
              {editForSale && (
                <div className="flex-1 flex flex-col">
                  <input 
                    type="number" 
                    value={editPrice} 
                    onChange={e => setEditPrice(Math.min(MAX_VALUATION, Number(e.target.value)))} 
                    className="w-full border-b border-zinc-900 text-[14px] font-bold outline-none text-right bg-transparent" 
                    placeholder="$" 
                  />
                  {editPrice && editPrice >= MAX_VALUATION && <span className="text-[7px] text-zinc-400 text-right mt-1 font-bold">MAX REGISTRY VALUE</span>}
                </div>
              )}
            </div>

             <div className="flex gap-4 pt-8">
               <button onClick={handleUpdate} disabled={saving} className="flex-1 py-4 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl">COMMIT</button>
               <button onClick={() => setIsEditing(false)} className="flex-1 py-4 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">CANCEL</button>
             </div>
          </div>
        ) : (
          <>
            <header className="space-y-6">
              <div className="flex justify-between items-start">
                <h1 className="text-[32px] font-bold uppercase tracking-tighter leading-none text-zinc-900">{item.name}</h1>
                <div className="flex gap-4">
                   {isOwner && <button onClick={() => setIsEditing(true)} className="text-[9px] font-bold uppercase text-zinc-400 hover:text-zinc-900 transition-colors">Edit Unit</button>}
                   {isOwner && <button onClick={handleDelete} className="text-[9px] font-bold uppercase text-red-500 hover:text-red-700 transition-colors">De-index</button>}
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase px-3 py-1 bg-zinc-900 text-white shadow-sm tracking-[0.2em]">{item.category}</span>
                <span className="text-[10px] font-bold uppercase px-3 py-1 border border-zinc-900 tracking-[0.2em]">{item.condition}</span>
              </div>
            </header>

            <div className="space-y-10 pt-10 border-t border-zinc-50">
               <div className="grid grid-cols-2 gap-y-8">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Archive Registry</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">ID_{item.id.slice(0, 8)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Market Value</span>
                  <span className="text-[14px] font-bold text-zinc-900">{item.price ? `$${item.price.toLocaleString()}` : 'VAULTED'}</span>
               </div>

               <div className="flex flex-col gap-4 pt-10">
                 {isOwner ? (
                   <Link to="/my-space" className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl">MY ARCHIVE</Link>
                 ) : (
                   <>
                    <Link to={`/trade/${ownerProfile?.username}`} className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl">PROPOSE TRADE</Link>
                    <Link to={`/messages/${item.owner_id}`} className="text-center py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-50 transition-all text-zinc-900">MESSAGE ARCHIVIST</Link>
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
