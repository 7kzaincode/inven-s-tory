
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item } from '../types';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setItem(data as Item);
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  if (loading) return <div className="py-32 text-center text-[10px] uppercase tracking-[0.4em]">Querying Archive...</div>;
  if (!item) return <div className="py-24 text-center text-[11px] uppercase tracking-widest text-gray-400">Item not found</div>;

  return (
    <div className="flex flex-col md:flex-row w-full gap-16 md:gap-32 py-12">
      <div className="w-full md:w-2/3 aspect-square bg-[#F9F9F9] flex items-center justify-center overflow-hidden">
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-105"
        />
      </div>

      <div className="w-full md:w-1/3 flex flex-col justify-center space-y-12">
        <header className="space-y-4">
          <h1 className="text-[20px] uppercase tracking-[0.3em] font-light">{item.name}</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">ARCHIVED ITEM #{item.id.slice(0, 4)}</p>
        </header>

        <div className="space-y-8 pt-8 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-y-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Condition</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">Archival</span>
            
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Category</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">{item.category || 'Essential'}</span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Availability</span>
            <div className="flex flex-col gap-1">
              {item.for_sale && <span className="text-[10px] uppercase tracking-[0.2em]">For Sale</span>}
              {item.for_trade && <span className="text-[10px] uppercase tracking-[0.2em]">Open to Trade</span>}
              {!item.for_sale && !item.for_trade && <span className="text-[10px] uppercase tracking-[0.2em]">Archive Only</span>}
            </div>
          </div>

          <div className="pt-12">
            <button 
              onClick={() => navigate(-1)}
              className="text-[11px] uppercase tracking-[0.3em] text-gray-300 hover:text-black transition-colors"
            >
              ← Back to Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
