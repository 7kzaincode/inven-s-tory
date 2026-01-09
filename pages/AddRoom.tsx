
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cleanStrict } from '../services/safetyService';

const AddRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const parentId = location.state?.parentId || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const getRotatedBlob = (src: string, deg: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
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
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
      };
      img.src = src;
    });
  };

  const saveNode = async () => {
    if (!name || !image) return setError("COMPLETION_ERROR: Image and Name required.");
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("AUTH_FAILURE");

      const path = `archives/${user.id}/room_${Date.now()}.png`;
      const finalBlob = rotation === 0 ? await (await fetch(image)).blob() : await getRotatedBlob(image, rotation);
      
      await supabase.storage.from('inventory').upload(path, finalBlob);
      const { data: urlData } = supabase.storage.from('inventory').getPublicUrl(path);

      const { error: dbError } = await supabase.from('rooms').insert({
        owner_id: user.id,
        parent_id: parentId,
        name: cleanStrict(name).toUpperCase(),
        image_url: urlData.publicUrl,
        x: 50, 
        y: 50
      });

      if (dbError) throw dbError;
      navigate('/atlas');
    } catch (err) {
      setError("SYSTEM_FAILURE: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-24 px-6 animate-in fade-in duration-700">
      <header className="text-center space-y-4 mb-16">
        <h1 className="text-[20px] uppercase tracking-[0.5em] font-bold text-zinc-950">ESTABLISH SPATIAL NODE</h1>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Map physical space without units</p>
      </header>

      {error && (
        <div className="mb-10 p-6 bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest text-center shadow-2xl animate-pulse">
          {error}
        </div>
      )}

      <div className="space-y-12">
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Node Identifier</label>
          <input 
            value={name} onChange={e => setName(e.target.value)} 
            className="w-full border-b-2 border-zinc-950 py-4 text-[18px] uppercase font-bold outline-none bg-transparent focus:bg-zinc-50 transition-all" 
            placeholder="e.g. UPPER_VAULT" 
          />
        </div>

        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-full aspect-video border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-zinc-50 group ${isDragging ? 'border-zinc-950 bg-zinc-100' : 'border-zinc-100'}`}
          >
             <span className={`text-[40px] transition-colors ${isDragging ? 'text-zinc-950' : 'text-zinc-200 group-hover:text-zinc-950'}`}>+</span>
             <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isDragging ? 'text-zinc-950' : 'text-zinc-300'}`}>
               {isDragging ? 'Release to Initialize' : 'Upload or Drag Context Source'}
             </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-zinc-900 border border-zinc-950 shadow-2xl overflow-hidden flex items-center justify-center">
              <img 
                src={image} 
                style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease-out' }}
                className="max-w-full max-h-full object-contain grayscale opacity-60" 
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={rotateImage}
                  className="bg-white/90 backdrop-blur text-black text-[8px] font-bold px-4 py-2 uppercase shadow-xl hover:bg-white active:scale-95"
                >
                  Rotate 90°
                </button>
                <button 
                  onClick={() => setImage(null)}
                  className="bg-white/90 backdrop-blur text-black text-[8px] font-bold px-4 py-2 uppercase shadow-xl hover:bg-white active:scale-95"
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="text-[9px] text-zinc-400 uppercase tracking-widest text-center italic">Verify orientation before initialization</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleImage} className="hidden" accept="image/*" />

        <button 
          onClick={saveNode} disabled={saving || !name || !image}
          className="w-full py-7 bg-zinc-950 text-white text-[12px] font-bold uppercase tracking-[0.6em] hover:bg-black transition-all disabled:opacity-20 shadow-2xl active:scale-95"
        >
          {saving ? 'ESTABLISHING...' : 'INITIALIZE SPATIAL NODE'}
        </button>
      </div>
    </div>
  );
};

export default AddRoom;
