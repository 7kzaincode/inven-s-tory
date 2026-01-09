
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Item, Room } from '../types';
import InventoryGrid from '../components/InventoryGrid';
import { Link } from 'react-router-dom';

interface AtlasProps {
  ownerId: string;
}

const Atlas: React.FC<AtlasProps> = ({ ownerId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null); 
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchArchive();
  }, [ownerId]);

  const fetchArchive = async () => {
    setLoading(true);
    const { data: rData } = await supabase.from('rooms').select('*').eq('owner_id', ownerId);
    const { data: iData } = await supabase.from('items').select('*').eq('owner_id', ownerId);
    if (rData) setRooms(rData as Room[]);
    if (iData) setItems(iData as Item[]);
    setLoading(false);
  };

  const currentRoom = currentRoomId ? rooms.find(r => r.id === currentRoomId) : null;
  const subRooms = rooms.filter(r => r.parent_id === currentRoomId);
  const roomItems = items.filter(i => i.room_id === currentRoomId);
  
  const breadcrumbs = [];
  let temp = currentRoom;
  while (temp) {
    breadcrumbs.unshift(temp);
    temp = rooms.find(r => r.id === temp?.parent_id);
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, ((e.clientX - rect.left) / rect.width) * 100), 100);
    const y = Math.min(Math.max(0, ((e.clientY - rect.top) / rect.height) * 100), 100);

    const isEditingItem = items.some(i => i.id === editMode);

    if (isEditingItem) {
      setItems((prev: Item[]) => prev.map(item => 
        item.id === editMode ? { ...item, loc_x: x, loc_y: y } : item
      ));
    } else {
      setRooms((prev: Room[]) => prev.map(room => 
        room.id === editMode ? { ...room, x: x, y: y } : room
      ));
    }
  };

  const commitPosition = async (id: string, isItem: boolean) => {
    if (!editMode) return;
    const target = isItem ? items.find(i => i.id === id) : rooms.find(r => r.id === id);
    if (!target) return;
    
    setEditMode(null);
    const table = isItem ? 'items' : 'rooms';
    const coords = isItem 
      ? { loc_x: (target as Item).loc_x, loc_y: (target as Item).loc_y } 
      : { x: (target as Room).x, y: (target as Room).y };

    await supabase.from(table).update(coords).eq('id', id);
  };

  const deIndexItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Prevent parent onMouseDown from setting editMode
    
    if (!window.confirm("DE-INDEX THIS UNIT FROM THE CENTRAL ARCHIVE? THIS ACTION IS PERMANENT.")) return;
    
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      setHoveredPin(null);
    } else {
      alert("DE-INDEX FAILURE: " + error.message);
    }
  };

  if (loading) return (
    <div className="py-40 flex flex-col items-center gap-10">
      <div className="w-24 h-[1px] bg-zinc-100 overflow-hidden relative">
         <div className="absolute inset-0 bg-zinc-950 animate-[slide_1.5s_infinite_linear]" style={{width: '30%'}} />
      </div>
      <span className="text-[10px] uppercase tracking-[0.8em] font-bold text-zinc-900 ml-[0.8em]">ARCHIVE_QUERY</span>
    </div>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-20 py-10 animate-in fade-in duration-1000">
      <header className="flex flex-col items-center text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-[48px] font-bold uppercase tracking-[0.6em] leading-none text-zinc-950">ATLAS</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.5em]">Physical Coordinate Multi-layer Archive</p>
        </div>

        <nav className="flex gap-4 items-center text-[10px] font-bold uppercase tracking-widest">
           <button onClick={() => setCurrentRoomId(null)} className={`hover:text-black transition-colors ${!currentRoomId ? 'text-black underline underline-offset-8' : 'text-zinc-300'}`}>ROOT</button>
           {breadcrumbs.map(b => (
             <React.Fragment key={b.id}>
               <span className="text-zinc-200">/</span>
               <button onClick={() => setCurrentRoomId(b.id)} className={`hover:text-black transition-colors ${currentRoomId === b.id ? 'text-black underline underline-offset-8' : 'text-zinc-300'}`}>{b.name}</button>
             </React.Fragment>
           ))}
        </nav>
      </header>

      {currentRoomId ? (
        <div className="space-y-20">
          <div 
            ref={mapRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setEditMode(null)}
            className="relative aspect-[16/8] w-full bg-zinc-950 border border-zinc-950 overflow-hidden shadow-2xl rounded-sm group select-none"
          >
            <img 
              src={currentRoom?.image_url} 
              className={`w-full h-full object-cover transition-all duration-1000 ${editMode ? 'opacity-40 grayscale blur-sm' : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100'}`} 
            />
            
            {/* SUB-ROOM PINS */}
            {subRooms.map(room => (
              <div 
                key={room.id}
                style={{ left: `${room.x}%`, top: `${room.y}%` }}
                className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 group/pin z-30 flex items-center justify-center cursor-pointer transition-transform ${editMode === room.id ? 'scale-150 z-50' : 'hover:scale-110'}`}
                onMouseDown={() => setEditMode(room.id)}
                onMouseUp={() => commitPosition(room.id, false)}
                onClick={() => !editMode && setCurrentRoomId(room.id)}
              >
                <div className="w-8 h-8 bg-white/20 backdrop-blur-md border border-white rounded-full flex items-center justify-center shadow-2xl">
                   <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="absolute top-14 bg-zinc-950 px-4 py-2 border border-zinc-800 text-white text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
                   ENTER: {room.name}
                </div>
              </div>
            ))}

            {/* ITEM PINS */}
            {roomItems.map(item => (
              <div 
                key={item.id}
                style={{ left: `${item.loc_x}%`, top: `${item.loc_y}%` }}
                onMouseEnter={() => setHoveredPin(item.id)}
                onMouseLeave={() => setHoveredPin(null)}
                className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 group/pin z-20 flex items-center justify-center cursor-crosshair transition-transform ${editMode === item.id ? 'scale-150 z-50' : 'hover:scale-125'}`}
                onMouseDown={() => !editMode && setEditMode(item.id)}
                onMouseUp={() => commitPosition(item.id, true)}
              >
                <div className="w-4 h-4 bg-white border-2 border-zinc-950 rounded-full shadow-2xl animate-pulse relative">
                   {hoveredPin === item.id && !editMode && (
                     <button 
                       onMouseDown={(e) => e.stopPropagation()} 
                       onClick={(e) => deIndexItem(e, item.id)}
                       className="absolute -top-6 -right-6 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xl hover:bg-red-700 hover:scale-125 transition-all z-[60]"
                     >
                       ×
                     </button>
                   )}
                </div>

                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-zinc-950 px-5 py-3 border border-zinc-800 shadow-2xl opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-40 flex flex-col gap-1">
                   <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white leading-none">{item.name}</span>
                   <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">{item.loc_note || 'INDEXED'}</span>
                   <div className="flex gap-4 mt-2">
                     <Link to={`/item/${item.id}`} className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 underline underline-offset-4 pointer-events-auto hover:text-white">DETAILS</Link>
                     <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-600">DRAG_TO_CALIBRATE</span>
                   </div>
                </div>
              </div>
            ))}

            {editMode && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-8 py-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white border border-zinc-700 animate-pulse">
                Spatial Recalibration in Progress...
              </div>
            )}

            <div className="absolute bottom-10 right-10 flex gap-4">
              <Link 
                to="/add-room" 
                state={{ parentId: currentRoomId }}
                className="bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-black hover:bg-zinc-100 shadow-xl border border-zinc-900"
              >
                + Nest Sub-Node
              </Link>
            </div>
          </div>

          <div className="pt-24 border-t border-zinc-100">
             <div className="flex justify-between items-baseline mb-16">
               <h2 className="text-[14px] font-bold uppercase tracking-[0.5em] text-zinc-900 px-4 border-l-4 border-zinc-950">UNIT_ARCHIVE // {currentRoom?.name}</h2>
               <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">{roomItems.length} Registered Units</span>
             </div>
             <InventoryGrid items={roomItems} isOwner={true} />
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-4">
          {rooms.filter(r => !r.parent_id).map(room => (
            <div 
              key={room.id} 
              onClick={() => setCurrentRoomId(room.id)}
              className="group cursor-pointer border border-zinc-100 bg-white hover:border-zinc-950 transition-all duration-700 shadow-sm hover:shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] bg-zinc-50 relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-1000">
                <img src={room.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="p-10 flex justify-between items-center">
                <h3 className="text-[18px] font-bold uppercase tracking-[0.4em] text-zinc-900">{room.name}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-zinc-950 transition-colors">Enter Node →</span>
              </div>
            </div>
          ))}
          
          <Link to="/add-room" className="aspect-[16/10] border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center gap-4 hover:border-zinc-900 transition-all group bg-zinc-50/20">
             <span className="text-[32px] text-zinc-200 group-hover:text-zinc-900 transition-colors">+</span>
             <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-300 group-hover:text-zinc-900 transition-colors">Establish Root Node</span>
          </Link>
        </section>
      )}
    </div>
  );
};

export default Atlas;
