
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Item, Room } from '../types';
import InventoryGrid from '../components/InventoryGrid';
import { Link } from 'react-router-dom';

interface HouseMapProps {
  ownerId: string;
}

const HouseMap: React.FC<HouseMapProps> = ({ ownerId }) => {
  const [items, setItems] = useState<Item[]>([]);
  // Added rooms state to store spatial node data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchArchive();
  }, [ownerId]);

  const fetchArchive = async () => {
    setLoading(true);
    // Fetch items and rooms in parallel for performance
    const [itemRes, roomRes] = await Promise.all([
      supabase.from('items').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').eq('owner_id', ownerId)
    ]);
    
    if (itemRes.data) setItems(itemRes.data as Item[]);
    if (roomRes.data) setRooms(roomRes.data as Room[]);
    setLoading(false);
  };

  // Extract unique room names from the rooms table instead of non-existent Item property
  const uniqueRoomNames = Array.from(new Set(rooms.map(r => r.name)));
  
  // Filter items based on the room they are assigned to (via room_id)
  const filteredItems = selectedRoom 
    ? items.filter(i => {
        const room = rooms.find(r => r.id === i.room_id);
        return room?.name === selectedRoom;
      }) 
    : items;

  // Find the selected room object to access its image_url
  const selectedRoomObj = rooms.find(r => r.name === selectedRoom);

  if (loading) return (
    <div className="py-40 text-center text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse">
      SYNCING SPATIAL NODES...
    </div>
  );

  return (
    <div className="w-full space-y-24 py-10 animate-in fade-in duration-1000">
      <header className="flex flex-col items-center space-y-6">
        <h1 className="text-[20px] uppercase tracking-[0.6em] font-bold text-zinc-900">SPATIAL REGISTRY</h1>
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => setSelectedRoom(null)}
            className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${!selectedRoom ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl' : 'text-zinc-400 border-zinc-100 hover:border-zinc-300'}`}
          >
            GLOBAL_VIEW
          </button>
          {uniqueRoomNames.map(roomName => (
            <button 
              key={roomName}
              onClick={() => setSelectedRoom(roomName)}
              className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${selectedRoom === roomName ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl' : 'text-zinc-400 border-zinc-100 hover:border-zinc-300'}`}
            >
              {roomName}
            </button>
          ))}
        </div>
      </header>

      {/* Corrected to use selectedRoomObj and valid properties */}
      {selectedRoom && selectedRoomObj && (
        <div className="w-full max-w-5xl mx-auto space-y-10">
          <div className="relative aspect-video bg-zinc-50 border border-zinc-100 overflow-hidden shadow-inner group">
             <img src={selectedRoomObj.image_url} className="w-full h-full object-cover opacity-90" alt={selectedRoom} />
             {filteredItems.map(item => (
               item.loc_x !== undefined && item.loc_y !== undefined && (
                 <Link 
                   key={item.id}
                   to={`/item/${item.id}`}
                   style={{ left: `${item.loc_x}%`, top: `${item.loc_y}%` }}
                   className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 border-2 border-white rounded-full shadow-2xl hover:scale-150 transition-transform cursor-pointer group/pin z-20"
                 >
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 border border-zinc-100 shadow-xl opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-900">{item.name}</span>
                    </div>
                 </Link>
               )
             ))}
             <div className="absolute inset-0 pointer-events-none border-[20px] border-white/10" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300">Room Map Active — {filteredItems.length} Registered Nodes</p>
          </div>
        </div>
      )}

      <div className="pt-12 border-t border-zinc-50">
        <h3 className="text-[11px] uppercase tracking-[0.4em] text-zinc-400 mb-12 font-bold text-center">ITEMIZED INDEX</h3>
        <InventoryGrid items={filteredItems} isOwner={true} />
      </div>

      {items.length === 0 && (
        <div className="py-40 text-center border border-dashed border-zinc-100 bg-zinc-50/30">
          <p className="text-[11px] uppercase tracking-[0.6em] text-zinc-300 font-bold">Spatial database empty. No rooms defined.</p>
          <Link to="/add" className="mt-8 inline-block text-[10px] font-bold uppercase tracking-widest text-zinc-900 underline underline-offset-8">Begin Indexing Protocol</Link>
        </div>
      )}
    </div>
  );
};

export default HouseMap;
