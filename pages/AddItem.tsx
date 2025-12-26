
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processImageWithAI } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { Item } from '../types';

interface AddItemProps {
  ownerId: string;
}

const CATEGORIES = ['FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];
const CONDITIONS = ['DEADSTOCK', 'VNDS', 'USED', 'ARCHIVAL', 'DISTRESSED'];

const AddItem: React.FC<AddItemProps> = ({ ownerId }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'select' | 'item' | 'bulletin'>('select');
  const [step, setStep] = useState<'upload' | 'processing' | 'finalize' | 'verify'>('upload');
  
  // Item State
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('FOOTWEAR');
  const [condition, setCondition] = useState('USED');
  const [price, setPrice] = useState<number>(0);
  const [isForSale, setIsForSale] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);

  // Bulletin State
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulletinText, setBulletinText] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  useEffect(() => {
    if (mode === 'bulletin') {
      fetchMyItems();
    }
  }, [mode]);

  const fetchMyItems = async () => {
    const { data } = await supabase.from('items').select('*').eq('owner_id', ownerId);
    if (data) setMyItems(data as Item[]);
  };

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

  const handleSaveItem = async () => {
    setLoading(true);
    try {
      const response = await fetch(processedImage!);
      const blob = await response.blob();
      const fileName = `${ownerId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('inventory').upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('items').insert([{
        owner_id: ownerId, name, image_url: publicUrl, public: true,
        for_sale: isForSale, for_trade: isForTrade, category, condition, price: isForSale ? price : null
      }]);
      if (dbError) throw dbError;
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBulletin = async () => {
    setLoading(true);
    const { error } = await supabase.from('trade_ads').insert({
      owner_id: ownerId,
      text: bulletinText,
      offering_ids: selectedItemIds,
      looking_for: lookingFor
    });
    if (!error) navigate('/');
    setLoading(false);
  };

  if (mode === 'select') {
    return (
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-24 space-y-12">
        <h1 className="text-[16px] uppercase tracking-[0.5em] font-bold text-zinc-900">CREATION HUB</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <button onClick={() => setMode('item')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4">
            <span className="text-[12px] font-bold uppercase tracking-widest block">Index New Unit</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">Add an item to your archive for showcase or trade.</p>
          </button>
          <button onClick={() => setMode('bulletin')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4">
            <span className="text-[12px] font-bold uppercase tracking-widest block">Market Bulletin</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">Post a public trade request or list units for sale.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'bulletin') {
    return (
      <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4 space-y-12">
        <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold text-zinc-900">MARKET BULLETIN</h1>
        <div className="w-full space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Select Units to Feature</label>
            <div className="grid grid-cols-4 gap-4 max-h-64 overflow-y-auto p-4 border border-zinc-50">
              {myItems.map(it => (
                <div 
                  key={it.id} 
                  onClick={() => setSelectedItemIds(prev => prev.includes(it.id) ? prev.filter(id => id !== it.id) : [...prev, it.id])}
                  className={`aspect-square cursor-pointer border transition-all ${selectedItemIds.includes(it.id) ? 'border-zinc-900 scale-95 opacity-50' : 'border-transparent hover:border-zinc-200'}`}
                >
                  <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
              ))}
            </div>
          </div>
          <textarea 
            value={bulletinText} onChange={e => setBulletinText(e.target.value)}
            placeholder="WHAT IS THE NATURE OF THIS PROPOSAL?"
            className="w-full bg-zinc-50 border border-zinc-100 p-6 text-[13px] uppercase tracking-widest font-bold outline-none h-32 focus:border-zinc-900 transition-all"
          />
          <input 
            value={lookingFor} onChange={e => setLookingFor(e.target.value)}
            placeholder="WHAT ARE YOU LOOKING FOR? (OPTIONAL)"
            className="w-full border-b border-zinc-200 py-4 text-[13px] uppercase tracking-widest font-bold outline-none focus:border-zinc-900"
          />
          <button onClick={handleSaveBulletin} disabled={loading} className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all">
            {loading ? 'POSTING...' : 'COMMIT TO BULLETIN'}
          </button>
          <button onClick={() => setMode('select')} className="w-full text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4">
      <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold mb-16 text-center text-zinc-900">ARCHIVAL INTAKE</h1>

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-12">
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-zinc-100 bg-[#FDFDFD] flex flex-col items-center justify-center cursor-pointer hover:border-zinc-900 transition-all group">
            <span className="text-[12px] uppercase tracking-widest text-zinc-800 font-bold">Select Source Image</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={() => setMode('select')} className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Back</button>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-24 flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-t-2 border-zinc-900 rounded-full animate-spin" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-900 font-bold">Executing Transformation...</p>
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
            <div className="flex gap-12 items-center">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={isForSale} onChange={e => setIsForSale(e.target.checked)} className="w-4 h-4 accent-zinc-950" />
                <label className="text-[10px] font-bold uppercase tracking-widest">Sale</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={isForTrade} onChange={e => setIsForTrade(e.target.checked)} className="w-4 h-4 accent-zinc-950" />
                <label className="text-[10px] font-bold uppercase tracking-widest">Trade</label>
              </div>
              {isForSale && (
                <input 
                  type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                  placeholder="$"
                  className="flex-1 border-b border-zinc-200 text-[12px] font-bold outline-none"
                />
              )}
            </div>
            <button onClick={() => setStep('verify')} className="w-full py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all">REVIEW FOR COMMIT</button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="w-full space-y-16 animate-in fade-in zoom-in-95">
          <header className="text-center space-y-4">
             <h2 className="text-[14px] font-bold uppercase tracking-[0.3em]">COMMITMENT VERIFICATION</h2>
          </header>
          <div className="flex flex-col items-center gap-8 border border-zinc-100 p-12 bg-zinc-50/30">
             <div className="w-32 h-32 bg-white border border-zinc-100">
               <img src={processedImage!} className="w-full h-full object-contain mix-blend-multiply" />
             </div>
             <div className="text-center space-y-2">
               <p className="text-[18px] font-bold uppercase tracking-widest">{name}</p>
               <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{category} / {condition} {isForSale ? `/ $${price}` : ''}</p>
             </div>
          </div>
          <div className="flex gap-4">
             <button onClick={handleSaveItem} disabled={loading} className="flex-1 py-6 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest">
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
