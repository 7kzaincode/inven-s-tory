
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { processImageWithAI } from '../services/geminiService';
import { supabase } from '../services/supabase';

interface AddItemProps {
  ownerId: string;
}

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const AddItem: React.FC<AddItemProps> = ({ ownerId }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<'upload' | 'camera' | 'processing' | 'finalize' | 'verify'>('upload');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('FOOTWEAR');
  const [condition, setCondition] = useState('USED');
  const [isPublic, setIsPublic] = useState(true);
  const [isForSale, setIsForSale] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);

  const normalizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 1024;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min(size / img.width, size / img.height) * 0.9;
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = dataUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const normalized = await normalizeImage(event.target?.result as string);
        triggerProcessing(normalized);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerProcessing = async (base64: string) => {
    setStep('processing');
    try {
      const processed = await processImageWithAI(base64);
      setProcessedImage(processed || base64);
    } catch (e) {
      setProcessedImage(base64);
    }
    setStep('finalize');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(processedImage!);
      const blob = await response.blob();
      const fileName = `${ownerId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('inventory').upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('items').insert([{
        owner_id: ownerId, name, image_url: publicUrl, public: isPublic,
        for_sale: isForSale, for_trade: isForTrade, category, condition
      }]);
      if (dbError) throw dbError;
      navigate('/my-space');
    } catch (err: any) {
      setError(err.message || "Failed to commit unit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4">
      <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold mb-16 text-center text-zinc-900">ARCHIVAL INTAKE</h1>

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-12">
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-zinc-100 bg-[#FDFDFD] flex flex-col items-center justify-center cursor-pointer hover:border-zinc-900 transition-all group">
            <span className="text-[12px] uppercase tracking-widest text-zinc-800 font-bold">Select Archive Source</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-24 flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-t-2 border-zinc-900 rounded-full animate-spin" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-900 font-bold">Executing Visual Transformation...</p>
        </div>
      )}

      {step === 'finalize' && (
        <div className="w-full space-y-12">
          <div className="aspect-square bg-[#FDFDFD] border border-zinc-100 flex items-center justify-center overflow-hidden">
            <img src={processedImage!} className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div className="space-y-10">
            <input 
              value={name} onChange={e => setName(e.target.value)}
              placeholder="UNIT IDENTIFIER"
              className="w-full border-b border-zinc-900 py-4 text-[15px] uppercase tracking-widest font-bold outline-none"
            />
            <div className="grid grid-cols-2 gap-8">
              <select value={category} onChange={e => setCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 text-[11px] uppercase tracking-widest font-bold outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 text-[11px] uppercase tracking-widest font-bold outline-none">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setStep('verify')} className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all">REVIEW FOR COMMITMENT</button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="w-full space-y-16 animate-in fade-in zoom-in-95">
          <header className="text-center space-y-4">
             <h2 className="text-[14px] font-bold uppercase tracking-[0.3em]">COMMITMENT VERIFICATION</h2>
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Please verify archival details are accurate</p>
          </header>
          <div className="flex flex-col items-center gap-8 border border-zinc-100 p-12 bg-zinc-50/30">
             <div className="w-32 h-32 bg-white border border-zinc-100">
               <img src={processedImage!} className="w-full h-full object-contain mix-blend-multiply" />
             </div>
             <div className="text-center space-y-2">
               <p className="text-[18px] font-bold uppercase tracking-widest">{name}</p>
               <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{category} / {condition}</p>
             </div>
          </div>
          <div className="flex gap-4">
             <button onClick={handleSave} disabled={loading} className="flex-1 py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest">
               {loading ? 'SYNCING...' : 'FINALIZE COMMIT'}
             </button>
             <button onClick={() => setStep('finalize')} className="flex-1 py-6 border border-zinc-900 text-[11px] font-bold uppercase tracking-widest">BACK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItem;
