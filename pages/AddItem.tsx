
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
    if (!bulletinText.trim()) return alert("BULLETIN TEXT REQUIRED");
    setLoading(true);
    const { error } = await supabase.from('trade_ads').insert({
      owner_id: ownerId,
      text: bulletinText,
      offering_ids: selectedItemIds,
      looking_for: lookingFor
    });
    if (error) {
      console.error("Save failed:", error);
      alert("ARCHIVAL COMMIT FAILED: " + error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  if (mode === 'select') {
    return (
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-24 space-y-12">
        <h1 className="text-[16px] uppercase tracking-[0.5em] font-bold text-zinc-900">CREATION HUB</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <button onClick={() => setMode('item')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4 shadow-sm hover:shadow-md hover:-translate-y-1">
            <span className="text-[12px] font-bold uppercase tracking-widest block text-zinc-900">Index New Unit</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed font-bold">Add an item to your archive for showcase or trade.</p>
          </button>
          <button onClick={() => setMode('bulletin')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4 shadow-sm hover:shadow-md hover:-translate-y-1">
            <span className="text-[12px] font-bold uppercase tracking-widest block text-zinc-900">Market Bulletin</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed font-bold">Post a public trade request or list units for sale.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'bulletin') {
    return (
      <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-500">
        <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold text-zinc-900">MARKET BULLETIN</h1>
        <div className="w-full space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-2">Select Units to Feature</label>
            <div className="grid grid-cols-4 gap-4 max-h-64 overflow-y-auto p-6 border border-zinc-100 bg-zinc-50/50 shadow-inner">
              {myItems.map(it => (
                <div 
                  key={it.id} 
                  onClick={() => setSelectedItemIds(prev => prev.includes(it.id) ? prev.filter(id => id !== it.id) : [...prev, it.id])}
                  className={`aspect-square cursor-pointer border-2 transition-all ${selectedItemIds.includes(it.id) ? 'border-zinc-900 bg-white shadow-xl' : 'border-transparent grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}
                >
                  <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply p-2" />
                </div>
              ))}
              {myItems.length === 0 && <p className="col-span-4 text-center py-10 text-[9px] uppercase tracking-widest text-zinc-300 font-bold">Archive empty. Index units first.</p>}
            </div>
          </div>
          <textarea 
            value={bulletinText} onChange={e => setBulletinText(e.target.value)}
            placeholder="WHAT IS THE NATURE OF THIS PROPOSAL?"
            className="w-full bg-zinc-50 border border-zinc-100 p-8 text-[13px] uppercase tracking-widest font-bold outline-none h-40 focus:border-zinc-900 focus:bg-white transition-all text-zinc-900 placeholder:text-zinc-300 shadow-sm"
          />
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold px-2">Looking For</label>
            <input 
              value={lookingFor} onChange={e => setLookingFor(e.target.value)}
              placeholder="SPECIFIC UNITS OR OFFERS?"
              className="w-full border-b border-zinc-200 py-5 px-2 text-[13px] uppercase tracking-widest font-bold outline-none focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-200 transition-colors"
            />
          </div>
          <button onClick={handleSaveBulletin} disabled={loading} className="w-full py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:translate-y-0">
            {loading ? 'POSTING...' : 'COMMIT TO BULLETIN'}
          </button>
          <button onClick={() => setMode('select')} className="w-full text-[10px] uppercase tracking-widest text-zinc-300 font-bold hover:text-zinc-900 transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold mb-16 text-center text-zinc-900">ARCHIVAL INTAKE</h1>

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-12">
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full aspect-square border-2 border-dashed border-zinc-100 bg-[#FDFDFD] flex flex-col items-center justify-center cursor-pointer hover:border-zinc-900 transition-all group shadow-sm hover:shadow-2xl"
          >
            <div className="flex flex-col items-center gap-6 group-hover:scale-110 transition-transform duration-500">
              <span className="text-[40px] font-light text-zinc-200 group-hover:text-zinc-900 transition-colors">+</span>
              <span className="text-[12px] uppercase tracking-widest text-zinc-400 font-bold group-hover:text-zinc-900 transition-colors">Select Source Image</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={() => setMode('select')} className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold hover:text-zinc-900">Back</button>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-24 flex flex-col items-center gap-10">
          <div className="relative">
            <div className="w-20 h-20 border-2 border-zinc-50 rounded-full animate-spin border-t-zinc-900" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold">⇅</span>
            </div>
          </div>
          <div className="text-center space-y-3">
            <p className="text-[12px] uppercase tracking-[0.4em] text-zinc-900 font-bold">Executing Transformation</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-bold animate-pulse">Isolating archival asset...</p>
          </div>
        </div>
      )}

      {step === 'finalize' && (
        <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="aspect-square bg-[#FDFDFD] border border-zinc-100 flex items-center justify-center overflow-hidden shadow-2xl relative">
            <img src={processedImage!} className="w-full h-full object-contain mix-blend-multiply p-12" />
            <button onClick={() => setStep('upload')} className="absolute top-6 right-6 text-[9px] uppercase font-bold tracking-widest bg-white/80 backdrop-blur-sm border border-zinc-100 px-4 py-2 hover:bg-black hover:text-white transition-all">Retry</button>
          </div>
          <div className="space-y-10">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold px-1">Unit Identifier</label>
              <input 
                value={name} onChange={e => setName(e.target.value)}
                placeholder="E.G. YEEZY BOOST 700 V2"
                className="w-full border-b border-zinc-900 py-4 text-[16px] uppercase tracking-widest font-bold outline-none text-zinc-900 bg-transparent placeholder:text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold px-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-transparent border-b border-zinc-100 py-3 text-[11px] uppercase tracking-widest font-bold outline-none text-zinc-900 cursor-pointer hover:border-zinc-900 transition-colors">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold px-1">State</label>
                <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-transparent border-b border-zinc-100 py-3 text-[11px] uppercase tracking-widest font-bold outline-none text-zinc-900 cursor-pointer hover:border-zinc-900 transition-colors">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-12 items-center pt-4">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setIsForSale(!isForSale)}>
                <div className={`w-5 h-5 border flex items-center justify-center transition-all ${isForSale ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200 group-hover:border-zinc-900'}`}>
                  {isForSale && <span className="text-[10px] text-white">✓</span>}
                </div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 cursor-pointer">Sale</label>
              </div>
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setIsForTrade(!isForTrade)}>
                <div className={`w-5 h-5 border flex items-center justify-center transition-all ${isForTrade ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200 group-hover:border-zinc-900'}`}>
                  {isForTrade && <span className="text-[10px] text-white">✓</span>}
                </div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 cursor-pointer">Trade</label>
              </div>
              {isForSale && (
                <div className="flex-1 flex items-center gap-4 animate-in slide-in-from-left-4 duration-300">
                  <span className="text-[12px] font-bold text-zinc-300">$</span>
                  <input 
                    type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                    className="flex-1 border-b border-zinc-900 text-[14px] font-bold outline-none text-zinc-900 py-1 bg-transparent"
                  />
                </div>
              )}
            </div>
            <button onClick={() => setStep('verify')} disabled={!name} className="w-full py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all shadow-xl disabled:opacity-20">REVIEW FOR COMMIT</button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="w-full space-y-16 animate-in fade-in zoom-in-95 duration-500">
          <header className="text-center space-y-4">
             <h2 className="text-[14px] font-bold uppercase tracking-[0.5em] text-zinc-900">COMMITMENT VERIFICATION</h2>
             <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Confirming entry to the permanent record</p>
          </header>
          <div className="flex flex-col items-center gap-10 border border-zinc-100 p-16 bg-[#FAFAFA] shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900" />
             <div className="w-48 h-48 bg-white border border-zinc-100 shadow-inner p-6">
               <img src={processedImage!} className="w-full h-full object-contain mix-blend-multiply" />
             </div>
             <div className="text-center space-y-4">
               <p className="text-[24px] font-bold uppercase tracking-[0.1em] text-zinc-900 leading-none">{name}</p>
               <div className="flex items-center justify-center gap-4">
                 <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{category}</span>
                 <span className="text-[10px] text-zinc-200">/</span>
                 <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{condition}</span>
                 {isForSale && (
                   <>
                     <span className="text-[10px] text-zinc-200">/</span>
                     <span className="text-[11px] text-zinc-900 uppercase font-bold tracking-widest">${price}</span>
                   </>
                 )}
               </div>
             </div>
          </div>
          <div className="flex gap-6">
             <button onClick={handleSaveItem} disabled={loading} className="flex-1 py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl">
               {loading ? 'SYNCING ARCHIVE...' : 'FINALIZE COMMIT'}
             </button>
             <button onClick={() => setStep('finalize')} className="flex-1 py-7 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-900 hover:bg-zinc-50 transition-all">BACK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItem;
