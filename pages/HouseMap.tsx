
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Item } from '../types';
import InventoryGrid from '../components/InventoryGrid';

interface HouseMapProps {
  ownerId: string;
}

const HouseMap: React.FC<HouseMapProps> = ({ ownerId }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<string | null>(null);

  useEffect(() => {
    fetchArchive();
  }, [ownerId]);

  const fetchArchive = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    
    if (data) setItems(data as Item[]);
    setLoading(false);
  };

  // Fix: Extracting unique zones from items; 'zone' is now part of the Item type
  const zones = Array.from(new Set(items.map(i => i.zone || 'UNMAPPED')));

  if (loading) return (
    <div className="py-40 text-center text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse">
      Rendering Physical Mapping...
    </div>
  );

  return (
    <div className="w-full space-y-24 animate-in fade-in duration-1000">
      <header className="text-center space-y-4">
        <h1 className="text-[18px] uppercase tracking-[0.6em] font-bold">PHYSICAL ATLAS</h1>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Spatial distribution of archival units</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        {zones.map(zone => {
          // Fix: Filter units assigned to this physical zone
          const zoneItems = items.filter(i => (i.zone || 'UNMAPPED') === zone);
          const isActive = activeZone === zone;
          
          return (
            <button 
              key={zone}
              onClick={() => setActiveZone(isActive ? null : zone)}
              className={`p-16 border transition-all text-left flex flex-col justify-between h-80 group ${isActive ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-50 border-zinc-100 hover:border-zinc-950'}`}
            >
              <div className="space-y-2">
                <span className={`text-[10px] font-bold uppercase tracking-[0.4em] ${isActive ? 'text-zinc-500' : 'text-zinc-300 group-hover:text-zinc-500'}`}>Location Node</span>
                <h3 className="text-[20px] font-bold uppercase tracking-widest leading-none">{zone}</h3>
              </div>
              <div className="flex justify-between items-end w-full">
                <span className="text-[40px] font-light leading-none opacity-20">{zoneItems.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4">
                  {isActive ? 'CLOSE VIEW' : 'EXPAND ZONE'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeZone && (
        <div className="pt-24 border-t border-zinc-100 animate-in slide-in-from-bottom-8 duration-700">
          <div className="mb-12 flex justify-between items-baseline">
             <h2 className="text-[12px] font-bold uppercase tracking-[0.4em] text-zinc-900">ZONE CONTENT: {activeZone}</h2>
             <button onClick={() => setActiveZone(null)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-black">Dismiss</button>
          </div>
          {/* Fix: Display the inventory grid for the selected physical zone */}
          <InventoryGrid items={items.filter(i => (i.zone || 'UNMAPPED') === activeZone)} isOwner={true} />
        </div>
      )}

      {items.length === 0 && (
        <div className="py-40 text-center">
           <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-200 font-bold italic">No spatial data indexed</p>
        </div>
      )}
    </div>
  );
};

export default HouseMap;