
import React from 'react';
import { Item } from '../types.ts';
import { Link } from 'react-router-dom';

interface InventoryGridProps {
  items: Item[];
  isOwner?: boolean;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ items, isOwner }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-16 w-full">
      {items.map((item) => (
        <div key={item.id} className="group flex flex-col relative overflow-hidden">
          <Link to={`/item/${item.id}`} className="w-full aspect-square mb-6 overflow-hidden bg-[#FDFDFD] border border-zinc-50 flex items-center justify-center transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 relative">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-1000"
              loading="lazy"
            />
            
            {/* STATS OVERLAY ON HOVER */}
            <div className="absolute inset-0 bg-zinc-950/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6 text-center space-y-4">
               <div className="space-y-1">
                 <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-500 font-bold block">CATEGORY</span>
                 <span className="text-[11px] uppercase tracking-widest text-white font-bold">{item.category}</span>
               </div>
               <div className="space-y-1">
                 <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-500 font-bold block">CONDITION</span>
                 <span className="text-[11px] uppercase tracking-widest text-white font-bold">{item.condition}</span>
               </div>
               <div className="pt-4 border-t border-zinc-800 w-1/2">
                 <span className="text-[8px] uppercase tracking-[0.4em] text-zinc-500 font-bold block">REGISTRY ID</span>
                 <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{item.id.slice(0, 8)}</span>
               </div>
            </div>
          </Link>

          <div className="flex flex-col space-y-2 px-1">
            <div className="flex justify-between items-start">
              <Link to={`/item/${item.id}`} className="text-[12px] tracking-[0.1em] text-zinc-900 font-bold uppercase hover:underline leading-tight max-w-[80%] break-all">
                {item.name}
              </Link>
              <div className="flex gap-1">
                {item.for_sale && <div className="w-1.5 h-1.5 bg-zinc-950" title="Listed for Sale" />}
                {item.for_trade && <div className="w-1.5 h-1.5 bg-zinc-300" title="Open to Trade" />}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400">{item.price ? `$${item.price.toLocaleString()}` : 'VAULTED'}</span>
              {isOwner && !item.public && (
                <span className="text-[8px] uppercase tracking-widest text-zinc-300 font-bold">PRIVATE</span>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="col-span-full py-40 text-center border border-dashed border-zinc-100 bg-zinc-50/30">
          <p className="text-[11px] uppercase tracking-[0.6em] text-zinc-300 font-bold">Archive node empty</p>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
