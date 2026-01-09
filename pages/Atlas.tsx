
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Item, Room } from '../types';
import InventoryGrid from '../components/InventoryGrid';
import HandshakeModal from '../components/HandshakeModal';

interface AtlasProps {
  ownerId: string;
}

const Atlas: React.FC<AtlasProps> = ({ ownerId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [unassignedItems, setUnassignedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  // Interaction State
  const [editMode, setEditMode] = useState<string | null>(null); 
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0); 
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const [showDeployDrawer, setShowDeployDrawer] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  
  // Refs
  const holdTimerRef = useRef<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== ownerId) {
        navigate('/'); 
        return;
      }
      fetchArchive();
    };
    checkAuth();
  }, [ownerId]);

  useEffect(() => {
    const state = location.state as { roomId?: string; highlightItemId?: string };
    if (state?.roomId) setCurrentRoomId(state.roomId);
    if (state?.highlightItemId) {
      setHighlightedItemId(state.highlightItemId);
      setSelectedPinId(state.highlightItemId); 
      setTimeout(() => setHighlightedItemId(null), 5000); 
    }
  }, [location]);

  const fetchArchive = async () => {
    setLoading(true);
    const { data: rData } = await supabase.from('rooms').select('*').eq('owner_id', ownerId);
    const { data: iData } = await supabase.from('items').select('*').eq('owner_id', ownerId);
    if (rData) setRooms(rData as Room[]);
    if (iData) {
      const allItems = iData as Item[];
      setItems(allItems);
      setUnassignedItems(allItems.filter(i => !i.room_id));
    }
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

  // --- INTERACTION LOGIC ---

  const startHoldTimer = (id: string) => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    
    setHoldProgress(0);
    const startTime = Date.now();
    const duration = 500; // Snappy hold

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);
      
      if (elapsed < duration) {
        holdTimerRef.current = window.requestAnimationFrame(tick);
      } else {
        setEditMode(id);
        setHoldProgress(0);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
      }
    };

    holdTimerRef.current = window.requestAnimationFrame(tick);
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('.ignore-pin-interaction')) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    startHoldTimer(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const moveDist = Math.sqrt(
      Math.pow(e.clientX - dragStartPos.current.x, 2) + 
      Math.pow(e.clientY - dragStartPos.current.y, 2)
    );

    if (!editMode && moveDist > 10) {
      clearHoldTimer();
    }

    if (editMode && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(0, ((e.clientX - rect.left) / rect.width) * 100), 100);
      const y = Math.min(Math.max(0, ((e.clientY - rect.top) / rect.height) * 100), 100);

      const isItem = items.some(i => i.id === editMode);
      if (isItem) {
        setItems(prev => prev.map(item => item.id === editMode ? { ...item, loc_x: x, loc_y: y } : item));
      } else {
        setRooms(prev => prev.map(room => room.id === editMode ? { ...room, x: x, y: y } : room));
      }
    }
  };

  const handleMouseUp = async (e: React.MouseEvent, id: string, isItem: boolean) => {
    if ((e.target as HTMLElement).closest('.ignore-pin-interaction')) {
      clearHoldTimer();
      return;
    }

    const moveDist = Math.sqrt(
      Math.pow(e.clientX - dragStartPos.current.x, 2) + 
      Math.pow(e.clientY - dragStartPos.current.y, 2)
    );

    if (editMode === id) {
      await commitPosition(id, isItem);
      setEditMode(null);
    } else {
      clearHoldTimer();
      if (moveDist < 10) {
        setSelectedPinId(id === selectedPinId ? null : id);
      }
    }
  };

  const commitPosition = async (id: string, isItem: boolean) => {
    const target = isItem ? items.find(i => i.id === id) : rooms.find(r => r.id === id);
    if (!target) return;
    const table = isItem ? 'items' : 'rooms';
    const coords = isItem 
      ? { loc_x: (target as Item).loc_x, loc_y: (target as Item).loc_y } 
      : { x: (target as Room).x, y: (target as Room).y };
    await supabase.from(table).update(coords).eq('id', id);
  };

  const handleDeIndexItem = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "DE-INDEX UNIT",
      message: "DE-INDEXING THIS UNIT FROM THE CENTRAL ARCHIVE IS PERMANENT. ALL COORDINATE DATA WILL BE PURGED.",
      onConfirm: async () => {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (!error) {
          setItems(prev => prev.filter(i => i.id !== id));
          setSelectedPinId(null);
        }
        setModalConfig(null);
      }
    });
  };

  const handleDecommissionNode = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "DECOMMISSION NODE",
      message: "DECOMMISSIONING THIS SPATIAL NODE WILL ORPHAN ALL NESTED UNITS. THEY WILL REMAIN IN YOUR GLOBAL ARCHIVE BUT LOSE THEIR SPATIAL COORDINATES.",
      onConfirm: async () => {
        await supabase.from('items').update({ room_id: null, loc_x: 50, loc_y: 50 }).eq('room_id', id);
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (!error) {
          setRooms(prev => prev.filter(r => r.id !== id));
          setSelectedPinId(null);
          if (currentRoomId === id) setCurrentRoomId(null);
        }
        setModalConfig(null);
      }
    });
  };

  const deployItemToRoom = async (item: Item) => {
    if (!currentRoomId || deploying) return;
    setDeploying(true);
    
    const { error } = await supabase.from('items').update({
      room_id: currentRoomId,
      loc_x: 50,
      loc_y: 50
    }).eq('id', item.id);

    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, room_id: currentRoomId, loc_x: 50, loc_y: 50 } : i));
      setUnassignedItems(prev => prev.filter(i => i.id !== item.id));
      setShowDeployDrawer(false);
      setSelectedPinId(item.id);
    }
    setDeploying(false);
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
    <div className="w-full max-w-[1600px] mx-auto space-y-20 py-10 animate-in fade-in duration-1000 relative">
      
      {modalConfig && (
        <HandshakeModal 
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}

      <header className="flex flex-col items-center text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-[48px] font-bold uppercase tracking-[0.6em] leading-none text-zinc-950">ATLAS</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.5em]">Hold for 0.5s to recalibrate unit coordinates</p>
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
            onMouseUp={() => { if (!editMode) clearHoldTimer(); }}
            onMouseDown={(e) => { 
              if (e.target === mapRef.current || (e.target as HTMLElement).tagName === 'IMG') {
                setSelectedPinId(null);
                setEditMode(null);
              }
            }}
            className="relative aspect-[16/8] w-full bg-zinc-950 border border-zinc-950 overflow-hidden shadow-2xl rounded-sm group select-none"
          >
            <img 
              src={currentRoom?.image_url} 
              className={`w-full h-full object-cover transition-all duration-1000 ${editMode ? 'opacity-30 grayscale blur-sm' : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100'}`} 
            />
            
            {editMode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
                 <span className="text-white text-[14px] font-bold uppercase tracking-[1em] animate-pulse">CALIBRATION_ACTIVE</span>
              </div>
            )}

            {/* SUB-ROOM PINS */}
            {subRooms.map(room => (
              <div 
                key={room.id}
                style={{ left: `${room.x}%`, top: `${room.y}%` }}
                className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center cursor-pointer transition-all ${editMode === room.id ? 'scale-150 z-[200]' : 'hover:scale-110'}`}
                onMouseDown={(e) => handleMouseDown(e, room.id)}
                onMouseUp={(e) => handleMouseUp(e, room.id, false)}
                onMouseEnter={() => setHoveredPin(room.id)}
                onMouseLeave={() => setHoveredPin(null)}
              >
                <div className={`w-8 h-8 bg-white/20 backdrop-blur-md border border-white rounded-full flex items-center justify-center shadow-2xl transition-all ${selectedPinId === room.id ? 'ring-4 ring-white/50 bg-white/40' : ''}`}>
                   {holdProgress > 0 && selectedPinId !== room.id && editMode !== room.id && hoveredPin === room.id && (
                     <div className="absolute inset-0 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                   )}
                   <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                
                {(selectedPinId === room.id || (hoveredPin === room.id && !selectedPinId)) && !editMode && (
                  <div className="absolute top-14 bg-zinc-950 px-6 py-5 border border-zinc-800 text-white shadow-2xl flex flex-col gap-4 z-[300] ignore-pin-interaction animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center gap-12">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{room.name}</span>
                      <button 
                        onClick={() => handleDecommissionNode(room.id)}
                        className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center text-[20px] font-bold hover:bg-red-700 transition-all active:scale-90"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-4 border-t border-zinc-800 pt-4">
                      <button onClick={() => setCurrentRoomId(room.id)} className="text-[9px] uppercase tracking-widest font-bold text-white underline underline-offset-8 hover:text-zinc-300 transition-colors">ENTER NODE</button>
                      <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-600 italic">Hold to move</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ITEM PINS */}
            {roomItems.map(item => (
              <div 
                key={item.id}
                style={{ left: `${item.loc_x}%`, top: `${item.loc_y}%` }}
                onMouseEnter={() => setHoveredPin(item.id)}
                onMouseLeave={() => setHoveredPin(null)}
                className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center cursor-crosshair transition-transform ${editMode === item.id ? 'scale-150 z-[200]' : highlightedItemId === item.id ? 'scale-150 z-[200]' : 'hover:scale-125'}`}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
                onMouseUp={(e) => handleMouseUp(e, item.id, true)}
              >
                <div className={`w-4 h-4 bg-white border-2 border-zinc-950 rounded-full shadow-2xl relative transition-all ${selectedPinId === item.id ? 'ring-8 ring-white/20 scale-125' : ''} ${highlightedItemId === item.id ? 'animate-ping' : 'animate-pulse'}`}>
                   {holdProgress > 0 && selectedPinId !== item.id && editMode !== item.id && hoveredPin === item.id && (
                     <div className="absolute -inset-2 rounded-full border border-white/80 border-t-transparent animate-spin" />
                   )}
                </div>

                {/* ITEM POPUP */}
                {(selectedPinId === item.id || (hoveredPin === item.id && !selectedPinId)) && !editMode && (
                  <div 
                    className="absolute top-12 left-1/2 -translate-x-1/2 bg-zinc-950 px-6 py-5 border border-zinc-800 shadow-2xl whitespace-nowrap z-[300] flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center gap-12">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white leading-none">{item.name}</span>
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">{item.loc_note || 'INDEXED'}</span>
                      </div>
                      <button 
                        onClick={() => handleDeIndexItem(item.id)}
                        className="ignore-pin-interaction w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center text-[20px] font-bold hover:bg-red-700 transition-all shadow-xl active:scale-90"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
                      <Link 
                        to={`/item/${item.id}`} 
                        className="ignore-pin-interaction text-[9px] uppercase tracking-widest font-bold text-white underline underline-offset-8 hover:text-zinc-300"
                      >
                        DETAILS
                      </Link>
                      <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-600 italic ml-4">Hold to move</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="absolute bottom-10 right-10 flex gap-4">
              <button 
                onClick={() => setShowDeployDrawer(true)}
                className="bg-zinc-950 px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-black shadow-xl border border-zinc-800"
              >
                + Deploy Existing Unit
              </button>
              <Link to="/add-room" state={{ parentId: currentRoomId }} className="bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-black hover:bg-zinc-100 shadow-xl border border-zinc-900">+ Nest Sub-Node</Link>
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
            <div key={room.id} className="group border border-zinc-100 bg-white hover:border-zinc-950 transition-all duration-700 shadow-sm hover:shadow-2xl overflow-hidden flex flex-col relative">
              <button 
                 onClick={(e) => { e.stopPropagation(); handleDecommissionNode(room.id); }}
                 className="absolute top-4 right-4 z-20 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center text-[18px] font-bold shadow-xl hover:bg-red-700 active:scale-90 transition-all"
              >
                ×
              </button>
              <div onClick={() => setCurrentRoomId(room.id)} className="cursor-pointer">
                <div className="aspect-[16/10] bg-zinc-50 relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-1000">
                  <img src={room.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                </div>
                <div className="p-10 flex justify-between items-center">
                  <h3 className="text-[18px] font-bold uppercase tracking-[0.4em] text-zinc-900">{room.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-zinc-900">Enter Node →</span>
                </div>
              </div>
            </div>
          ))}
          <Link to="/add-room" className="aspect-[16/10] border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center gap-4 hover:border-zinc-900 transition-all group bg-zinc-50/20">
             <span className="text-[32px] text-zinc-200 group-hover:text-zinc-900">+</span>
             <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-300 group-hover:text-zinc-900">Establish Root Node</span>
          </Link>
        </section>
      )}

      {showDeployDrawer && (
        <div className="fixed inset-0 z-[500] bg-white/95 backdrop-blur-xl animate-in fade-in duration-500 flex flex-col items-center p-20 overflow-y-auto">
          <header className="w-full max-w-4xl flex justify-between items-center mb-20">
             <h2 className="text-[20px] font-bold uppercase tracking-[0.6em] text-zinc-900">DEPLOY_UNASSIGNED_UNITS</h2>
             <button onClick={() => setShowDeployDrawer(false)} className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">[ CLOSE ]</button>
          </header>
          <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
             {unassignedItems.map(item => (
               <div key={item.id} onClick={() => deployItemToRoom(item)} className="group aspect-square bg-zinc-50 border border-zinc-100 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-950 hover:bg-white transition-all shadow-sm hover:shadow-2xl relative overflow-hidden">
                 <img src={item.image_url} className="w-full h-full object-contain mix-blend-multiply mb-4 group-hover:scale-110 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white mb-2">{item.name}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">INITIALIZE DEPLOYMENT</span>
                 </div>
               </div>
             ))}
             {unassignedItems.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-30 uppercase tracking-widest text-[12px] font-bold">No unassigned units in global archive.</div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Atlas;
