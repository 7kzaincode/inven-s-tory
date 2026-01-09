
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cleanStrict } from '../services/safetyService';
import { Room } from '../types';

interface AddItemProps {
  ownerId: string;
}

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const AddItem: React.FC<AddItemProps> = ({ ownerId }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [step, setStep] = useState<'upload' | 'spatial' | 'details' | 'saving' | 'committed'>('upload');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // Data
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [locX, setLocX] = useState<number>(50);
  const [locY, setLocY] = useState<number>(50);
  const [locNote, setLocNote] = useState('');
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('OBJECT');
  const [condition, setCondition] = useState('USED');
  const [price, setPrice] = useState<number>(0);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    supabase.from('rooms').select('*').eq('owner_id', ownerId).then(({ data }) => {
      if (data) setRooms(data as Room[]);
    });
  }, [ownerId]);

  const handleItemImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setItemImage(ev.target?.result as string);
        setRotation(0);
        setStep('spatial');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePin = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setLocX(((e.clientX - rect.left) / rect.width) * 100);
    setLocY(((e.clientY - rect.top) / rect.height) * 100);
  };

  const getRotatedBlob = (src: string, deg: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Correctly handle dimension swapping for 90/270 degree rotations
        if (deg % 180 === 0) {
          canvas.width = img.width;
          canvas.height = img.height;
        } else {
          canvas.width = img.height;
          canvas.height = img.width;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.95);
      };
      img.src = src;
    });
  };

  const saveProtocol = async () => {
    if (!name.trim()) return setErrorStatus("VALIDATION_ERROR: Unit name required.");
    setStep('saving');
    
    try {
      const itemPath = `archives/${ownerId}/item_${Date.now()}.png`;
      // Always use the baking protocol if rotation is present
      const finalBlob = rotation === 0 ? await (await fetch(itemImage!)).blob() : await getRotatedBlob(itemImage!, rotation);
      
      await supabase.storage.from('inventory').upload(itemPath, finalBlob);
      const { data: itemUrl } = supabase.storage.from('inventory').getPublicUrl(itemPath);

      const { error } = await supabase.from('items').insert({
        owner_id: ownerId,
        room_id: selectedRoomId || null,
        name: cleanStrict(name).toUpperCase(),
        image_url: itemUrl.publicUrl,
        category,
        condition,
        public: isPublic,
        price: price > 0 ? price : null,
        loc_x: locX,
        loc_y: locY,
        loc_note: cleanStrict(locNote, true)
      });

      if (error) throw error;
      setStep('committed');
      setTimeout(() => navigate(`/atlas`), 1200);
    } catch (err) {
      setErrorStatus("REGISTRATION_FAILURE: Archive Unreachable.");
      setStep('details');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      {errorStatus && <div className="mb-10 p-6 bg-red-600 text-white text-[11px] font-bold uppercase text-center shadow-2xl animate-bounce">{errorStatus}</div>}

      {step === 'upload' && (
        <div className="flex flex-col items-center space-y-12">
          <h1 className="text-[20px] uppercase tracking-[0.5em] font-bold text-zinc-950">ASSET_INTAKE</h1>
          <label className="w-full aspect-square border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-950 transition-all bg-zinc-50 group">
             <span className="text-[48px] font-light text-zinc-200 group-hover:text-zinc-950">+</span>
             <span className="text-[11px] uppercase tracking-[0.4em] text-zinc-300 font-bold mt-4">Upload Asset Source</span>
             <input type="file" onChange={handleItemImage} className="hidden" accept="image/*" />
          </label>
        </div>
      )}

      {step === 'spatial' && (
        <div className="space-y-12">
          <h1 className="text-[20px] uppercase tracking-[0.5em] font-bold text-center">SPATIAL_CALIBRATION</h1>
          
          {itemImage && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 h-48 bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shadow-inner group relative">
                <img 
                  src={itemImage} 
                  style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} 
                  className="max-w-full max-h-full object-contain mix-blend-multiply" 
                />
              </div>
              <button 
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-950 border border-zinc-950 px-8 py-3 hover:bg-zinc-950 hover:text-white transition-all"
              >
                [ ROTATE_90 ]
              </button>
            </div>
          )}

          <div className="space-y-10">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Parent Node Selection</label>
              <select 
                value={selectedRoomId} 
                onChange={e => setSelectedRoomId(e.target.value)}
                className="w-full border-b-2 border-zinc-950 py-4 text-[14px] uppercase font-bold outline-none bg-transparent"
              >
                <option value="">(UNASSIGNED / ROOT)</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {selectedRoomId && (
              <div className="space-y-6">
                <p className="text-[10px] uppercase tracking-widest text-center text-zinc-400 font-bold">Bake unit coordinate onto spatial node</p>
                <div className="relative aspect-video bg-zinc-900 border border-zinc-950 overflow-hidden shadow-2xl cursor-crosshair" onClick={handlePin}>
                  <img src={rooms.find(r => r.id === selectedRoomId)?.image_url} className="w-full h-full object-cover grayscale opacity-40 blur-[1px]" />
                  <div style={{ left: `${locX}%`, top: `${locY}%` }} className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-white border-4 border-zinc-950 rounded-full shadow-2xl animate-pulse" />
                </div>
                <input value={locNote} onChange={e => setLocNote(e.target.value)} placeholder="Node metadata (e.g. Shelf 4, Left Side)" className="w-full border-b border-zinc-100 py-3 text-[14px] italic outline-none focus:border-zinc-900 transition-colors bg-transparent" />
              </div>
            )}
          </div>
          <button onClick={() => setStep('details')} className="w-full py-6 bg-zinc-950 text-white text-[12px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all shadow-2xl">PROCEED_TO_REGISTRY</button>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-12">
          <h1 className="text-[20px] uppercase tracking-[0.5em] font-bold text-center">ARCHIVAL_REGISTRATION</h1>
          <div className="space-y-12">
            <div className="space-y-2">
               <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Unit Identifier</label>
               <input value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-zinc-950 py-4 text-[22px] uppercase font-bold outline-none bg-transparent" placeholder="BRAUN_T3_RADIO" />
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Taxonomy</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-transparent border-b border-zinc-200 text-[12px] uppercase font-bold py-3 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Condition_Grade</label>
                <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-transparent border-b border-zinc-200 text-[12px] uppercase font-bold py-3 outline-none">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={saveProtocol} className="w-full py-7 bg-zinc-950 text-white text-[13px] font-bold uppercase tracking-[0.6em] hover:bg-black transition-all shadow-2xl">INITIALIZE_ARCHIVE</button>
        </div>
      )}

      {step === 'saving' && <div className="py-40 flex flex-col items-center space-y-12"><div className="w-24 h-[1px] bg-zinc-100 overflow-hidden relative"><div className="absolute inset-0 bg-zinc-950 animate-[slide_1.5s_infinite_linear]" style={{width: '30%'}} /></div><span className="text-[11px] uppercase tracking-[1em] font-bold animate-pulse">COMMITTING_DATA...</span></div>}
      {step === 'committed' && <div className="py-40 flex flex-col items-center space-y-12"><div className="w-20 h-20 bg-zinc-950 text-white flex items-center justify-center rounded-full text-[32px] shadow-2xl">✓</div><span className="text-[14px] uppercase tracking-[1em] font-bold">NODE_ESTABLISHED</span></div>}
    </div>
  );
};

export default AddItem;
