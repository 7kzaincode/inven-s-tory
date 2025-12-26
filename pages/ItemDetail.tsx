
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, ItemHistory, Profile } from '../types';

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      setIsOwner(session?.user.id === itemData.owner_id);
      setEditName(itemData.name);
      setEditCategory(itemData.category || 'OBJECT');
      setEditCondition(itemData.condition || 'USED');
      setEditPrice(itemData.price);
      setEditForSale(itemData.for_sale);
      setEditForTrade(itemData.for_trade);

      // Fetch History
      const { data: historyData } = await supabase
        .from('item_history')
        .select('*, from_profile:profiles!item_history_from_owner_id_fkey(*), to_profile:profiles!item_history_to_owner_id_fkey(*)')
        .eq('item_id', id)
        .order('created_at', { ascending: false });
      
      if (historyData) setHistory(historyData as any);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('items')
      .update({
        name: editName,
        category: editCategory,
        condition: editCondition,
        price: editPrice,
        for_sale: editForSale,
        for_trade: editForTrade
      })
      .eq('id', id);

    if (!error) {
      setIsEditing(false);
      fetchItem();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO DE-INDEX THIS UNIT?")) return;
    setDeleting(true);
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) navigate('/my-space');
    setDeleting(false);
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em] font-bold">Querying Archive...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase tracking-widest text-zinc-900 font-bold">Unit not found</div>;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-16 lg:gap-32 py-12">
      <div className="w-full lg:w-1/2">
        <div className="aspect-square bg-[#FDFDFD] flex items-center justify-center border border-zinc-100 p-12 mb-12 overflow-hidden group">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-1000" />
        </div>

        {/* Provenance Section */}
        <div className="space-y-8">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-900 border-b border-zinc-100 pb-4">UNIT PROVENANCE</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-2 h-2 rounded-full bg-zinc-900" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest">Entry to Archive</span>
                <span className="text-[9px] text-zinc-500 uppercase">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-6">
                <div className="w-2 h-2 rounded-full bg-zinc-200" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Ownership Transfer: @{h.to_profile?.username}</span>
                  <span className="text-[9px] text-zinc-500 uppercase">{new Date(h.created_at).toLocaleDateString()} / {h.event_type} {h.price ? `/ $${h.price}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col space-y-12">
        {isEditing ? (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Name</label>
                <input 
                  value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full border-b border-zinc-900 py-2 text-[18px] uppercase tracking-[0.1em] font-bold outline-none"
                />
             </div>
             <div className="grid grid-cols-2 gap-12">
               <div className="flex flex-col space-y-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Category</label>
                 <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase tracking-widest font-bold py-2 outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div className="flex flex-col space-y-2">
                 <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">State</label>
                 <select value={editCondition} onChange={e => setEditCondition(e.target.value)} className="bg-transparent border-b border-zinc-200 text-[11px] uppercase tracking-widest font-bold py-2 outline-none">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             </div>
             <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <input type="checkbox" checked={editForSale} onChange={e => setEditForSale(e.target.checked)} className="w-4 h-4 accent-zinc-900" />
                 <label className="text-[11px] uppercase tracking-widest font-bold">List for Sale</label>
               </div>
               {editForSale && (
                 <div className="pl-8 space-y-2">
                   <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Price (USD)</label>
                   <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="w-full border-b border-zinc-200 py-2 font-bold outline-none" />
                 </div>
               )}
               <div className="flex items-center gap-4">
                 <input type="checkbox" checked={editForTrade} onChange={e => setEditForTrade(e.target.checked)} className="w-4 h-4 accent-zinc-900" />
                 <label className="text-[11px] uppercase tracking-widest font-bold">Open for Trade</label>
               </div>
             </div>
             <div className="flex gap-4 pt-10">
               <button onClick={handleUpdate} disabled={saving} className="flex-1 py-4 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all">
                 {saving ? 'UPDATING...' : 'SAVE CHANGES'}
               </button>
               <button onClick={() => setIsEditing(false)} className="flex-1 py-4 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">CANCEL</button>
             </div>
          </div>
        ) : (
          <>
            <header className="space-y-6">
              <div className="flex justify-between items-start">
                <h1 className="text-[32px] font-bold uppercase tracking-tighter leading-none text-zinc-900">{item.name}</h1>
                <div className="flex gap-4">
                   {isOwner && (
                     <button onClick={() => setIsEditing(true)} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Edit</button>
                   )}
                   {isOwner && (
                     <button onClick={handleDelete} disabled={deleting} className="text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">Delete</button>
                   )}
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 bg-zinc-900 text-white">{item.category}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border border-zinc-900">{item.condition}</span>
              </div>
            </header>

            <div className="space-y-10 pt-10 border-t border-zinc-50">
               <div className="grid grid-cols-2 gap-y-8">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Archival Registry</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">ID_{item.id.slice(0, 8)}</span>

                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Market Price</span>
                  <span className="text-[14px] font-bold">{item.price ? `$${item.price.toLocaleString()}` : 'VAULTED'}</span>

                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Status</span>
                  <div className="flex flex-col gap-2">
                    {item.for_sale && <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-900">Available for Purchase</span>}
                    {item.for_trade && <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-900">Tradable Asset</span>}
                    {!item.for_sale && !item.for_trade && <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">Not for Circulation</span>}
                  </div>
               </div>

               <div className="flex flex-col gap-4 pt-10">
                 {isOwner ? (
                   <Link to="/my-space" className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all">RETURN TO SPACE</Link>
                 ) : (
                   <>
                    <Link to={`/trade/${item.id}`} className="text-center py-5 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all">PROPOSE TRADE</Link>
                    <Link to={`/messages/${item.owner_id}`} className="text-center py-5 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-zinc-50 transition-all">MESSAGE ARCHIVIST</Link>
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
