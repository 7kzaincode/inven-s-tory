
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item } from '../types';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.from('items').select('*').eq('id', id).single();
    if (data) {
      setItem(data as Item);
      setIsOwner(session?.user.id === data.owner_id);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO DE-INDEX THIS UNIT?")) return;
    setDeleting(true);
    try {
      // Logic for deleting record. 
      // Supabase Storage deletion could also happen here if needed.
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (!error) navigate('/my-space');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Querying Archive...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase tracking-widest text-zinc-400">Unit not found</div>;

  return (
    <div className="flex flex-col md:flex-row w-full gap-16 md:gap-32 py-12 items-center">
      <div className="w-full md:w-1/2 aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-800">
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-8 transition-transform duration-700 hover:scale-105"
        />
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center space-y-12">
        <header className="space-y-4">
          <div className="flex justify-between items-start">
            <h1 className="text-[24px] uppercase tracking-[0.3em] font-light leading-snug">{item.name}</h1>
            {isOwner && (
              <button 
                onClick={handleDelete} disabled={deleting}
                className="text-[9px] uppercase tracking-[0.2em] text-red-500 hover:text-red-700 transition-colors border border-red-100 px-4 py-2"
              >
                {deleting ? 'REMOVING...' : 'DELETE'}
              </button>
            )}
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">ARCHIVE_ID #{item.id.slice(0, 8)}</p>
        </header>

        <div className="space-y-8 pt-10 border-t border-zinc-100 dark:border-zinc-900">
          <div className="grid grid-cols-2 gap-y-8">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Condition</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">{item.condition || 'Archival'}</span>
            
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Category</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">{item.category || 'Essential'}</span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Market Status</span>
            <div className="flex flex-col gap-2">
              {item.for_sale && <span className="text-[10px] uppercase tracking-[0.2em] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-1 inline-block w-fit">Listing: Sale</span>}
              {item.for_trade && <span className="text-[10px] uppercase tracking-[0.2em] border border-zinc-900 dark:border-zinc-100 px-2 py-1 inline-block w-fit">Status: Trade Open</span>}
              {!item.for_sale && !item.for_trade && <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-300">Vaulted / Private</span>}
            </div>
          </div>

          <div className="pt-12">
            <button 
              onClick={() => navigate(-1)}
              className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              ← RETURN TO DIRECTORY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
