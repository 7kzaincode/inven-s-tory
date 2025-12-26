
import React from 'react';
import { Item } from '../types';
import { Link } from 'react-router-dom';

interface InventoryGridProps {
  items: Item[];
  isOwner?: boolean;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ items, isOwner }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-16 w-full max-w-[1400px]">
      {items.map((item) => (
        <div key={item.id} className="group flex flex-col items-center">
          <Link to={`/item/${item.id}`} className="w-full aspect-square mb-6 overflow-hidden bg-[#F9F9F9] flex items-center justify-center transition-opacity duration-500 group-hover:opacity-[0.97]">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-contain mix-blend-multiply"
              loading="lazy"
            />
          </Link>
          <div className="flex flex-col items-center space-y-1">
            <Link to={`/item/${item.id}`} className="text-[11px] tracking-[0.1em] text-gray-500 uppercase hover:text-black transition-colors">
              {item.name}
            </Link>
            {isOwner && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {item.for_sale && <span className="text-[9px] text-gray-400 uppercase tracking-widest">Sale</span>}
                {item.for_trade && <span className="text-[9px] text-gray-400 uppercase tracking-widest">Trade</span>}
                {!item.public && <span className="text-[9px] text-gray-300 uppercase tracking-widest italic">Private</span>}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="col-span-full py-32 text-center">
          <p className="text-[11px] uppercase tracking-widest text-gray-300">Empty Archive</p>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
