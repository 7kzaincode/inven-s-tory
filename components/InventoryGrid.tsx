
import React from 'react';
import { Item } from '../types';
import { Link } from 'react-router-dom';

interface InventoryGridProps {
  items: Item[];
  isOwner?: boolean;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ items, isOwner }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-16 w-full">
      {items.map((item) => (
        <div key={item.id} className="group flex flex-col">
          <Link to={`/item/${item.id}`} className="w-full aspect-square mb-6 overflow-hidden bg-[#FDFDFD] border border-zinc-50 flex items-center justify-center transition-all duration-700 hover:shadow-xl hover:-translate-y-1">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-1000"
              loading="lazy"
            />
          </Link>
          <div className="flex flex-col space-y-2 px-1">
            <div className="flex justify-between items-start">
              <Link to={`/item/${item.id}`} className="text-[12px] tracking-[0.1em] text-zinc-900 font-bold uppercase hover:underline leading-tight max-w-[80%]">
                {item.name}
              </Link>
              {item.category && (
                <span className="text-[8px] bg-zinc-900 text-white px-1.5 py-0.5 font-bold uppercase tracking-widest">{item.category[0]}</span>
              )}
            </div>
            
            <div className="flex gap-3 items-center">
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">{item.condition}</span>
              <div className="flex gap-2">
                {item.for_sale && <div className="w-1 h-1 rounded-full bg-zinc-900" title="For Sale" />}
                {item.for_trade && <div className="w-1 h-1 rounded-full bg-zinc-400" title="For Trade" />}
              </div>
            </div>

            {isOwner && !item.public && (
              <span className="text-[8px] uppercase tracking-widest text-zinc-300 italic font-bold">Private Vault</span>
            )}
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="col-span-full py-40 text-center border-2 border-dashed border-zinc-50 rounded-xl">
          <p className="text-[11px] uppercase tracking-[0.5em] text-zinc-200 font-bold">Archive Vacant</p>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
