
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { isClean } from '../services/safetyService';
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
  const [step, setStep] = useState<'upload' | 'protocol' | 'finalize' | 'verify'>('upload');
  const [error, setError] = useState<string | null>(null);
  
  // Item State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('FOOTWEAR');
  const [condition, setCondition] = useState('USED');
  const [price, setPrice] = useState<number>(0);
  const [isForSale, setIsForSale] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);
  const [complianceAccepted, setComplianceAccepted] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("ASSET TOO LARGE: LIMIT IS 5MB.");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setStep('protocol');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProtocolAccepted = () => {
    if (complianceAccepted) {
      setStep('finalize');
    }
  };

  const handleSaveItem = async () => {
    if (!sourceImage) return;
    if (!isClean(name)) {
      alert("UNIT NAME VIOLATES ARCHIVAL STANDARDS.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      const fileName = `${ownerId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('inventory').upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('items').insert([{
        owner_id: ownerId, 
        name, 
        image_url: publicUrl, 
        public: true,
        for_sale: isForSale, 
        for_trade: isForTrade, 
        category, 
        condition, 
        price: isForSale ? price : null
      }]);
      
      if (dbError) throw dbError;
      navigate(`/profile/${(window as any).username || 'me'}`);
    } catch (e: any) {
      alert("Archive Failure: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBulletin = async () => {
    if (!bulletinText.trim()) return alert("BULLETIN TEXT REQUIRED");
    if (!isClean(bulletinText) || !isClean(lookingFor)) {
      alert("BULLETIN CONTENT CONTAINS PROHIBITED TERMS.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('trade_ads').insert({
      owner_id: ownerId,
      text: bulletinText,
      offering_ids: selectedItemIds,
      looking_for: lookingFor
    });
    if (error) alert("ARCHIVAL COMMIT FAILED: " + error.message);
    else navigate('/');
    setLoading(false);
  };

  if (mode === 'select') {
    return (
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-24 space-y-12">
        <h1 className="text-[16px] uppercase tracking-[0.5em] font-bold text-zinc-900">INTAKE TERMINAL</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <button onClick={() => setMode('item')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4 shadow-sm hover:shadow-md hover:-translate-y-1">
            <span className="text-[12px] font-bold uppercase tracking-widest block text-zinc-900">INDEX NEW UNIT</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed font-bold">Standard intake protocol for physical assets.</p>
          </button>
          <button onClick={() => setMode('bulletin')} className="p-12 border border-zinc-100 bg-[#FDFDFD] hover:border-zinc-900 transition-all text-left space-y-4 shadow-sm hover:shadow-md hover:-translate-y-1">
            <span className="text-[12px] font-bold uppercase tracking-widest block text-zinc-900">MARKET BULLETIN</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed font-bold">Broadcast trade requests or listings to the network.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
        <h1 className="text-[16px] uppercase tracking-[0.4em] font-bold text-zinc-900">ARCHIVAL INTAKE</h1>
      </div>

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-12">
          {error && (
            <div className="w-full p-6 bg-black text-white text-[10px] uppercase tracking-[0.2em] font-bold text-center animate-in fade-in zoom-in-95 leading-relaxed">
              {error}
            </div>
          )}
          
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full aspect-square border-2 border-dashed border-zinc-100 bg-[#FDFDFD] cursor-pointer hover:border-zinc-900 hover:shadow-2xl transition-all group flex flex-col items-center justify-center shadow-sm"
          >
            <div className="flex flex-col items-center gap-6 group-hover:scale-110 transition-transform duration-500">
              <span className="text-[40px] font-light text-zinc-200 group-hover:text-zinc-900">+</span>
              <span className="text-[12px] uppercase tracking-widest font-bold text-zinc-400 group-hover:text-zinc-900">Source Asset</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={() => setMode('select')} className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold hover:text-zinc-900">Return</button>
        </div>
      )}

      {step === 'protocol' && (
        <div className="w-full space-y-12 animate-in fade-in duration-500">
          <div className="p-10 border border-zinc-900 bg-zinc-900 text-white space-y-6 shadow-2xl">
            <h2 className="text-[12px] font-bold tracking-[0.3em] uppercase">Archival Compliance Protocol</h2>
            <ul className="space-y-4 text-[11px] font-medium tracking-wide uppercase leading-relaxed text-zinc-400">
              <li>1. Asset must be a clear, physical object.</li>
              <li>2. No selfies, landscapes, or text screenshots.</li>
              <li>3. Non-archival uploads result in immediate unit de-indexing.</li>
            </ul>
          </div>
          <div className="flex items-center gap-6 p-6 border border-zinc-100 bg-zinc-50 cursor-pointer" onClick={() => setComplianceAccepted(!complianceAccepted)}>
             <div className={`w-6 h-6 border-2 flex items-center justify-center transition-colors ${complianceAccepted ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-200'}`}>
                {complianceAccepted && <span className="text-white text-[10px]">✓</span>}
             </div>
             <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-900">I certify this asset meets standards.</span>
          </div>
          <button 
            onClick={handleProtocolAccepted} 
            disabled={!complianceAccepted}
            className="w-full py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black shadow-xl disabled:opacity-20"
          >
            PROCEED TO INDEXING
          </button>
        </div>
      )}

      {step === 'finalize' && (
        <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="aspect-square bg-white border border-zinc-100 flex items-center justify-center overflow-hidden shadow-2xl relative">
            <img src={sourceImage!} className="w-full h-full object-contain mix-blend-multiply p-12" />
          </div>
          <div className="space-y-10">
            <input 
              value={name} onChange={e => setName(e.target.value)}
              placeholder="UNIT NAME"
              className="w-full border-b border-zinc-900 py-4 text-[16px] uppercase tracking-widest font-bold outline-none bg-transparent"
            />
            <div className="grid grid-cols-2 gap-10">
               <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-transparent border-b border-zinc-100 py-3 text-[11px] uppercase tracking-widest font-bold outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-transparent border-b border-zinc-100 py-3 text-[11px] uppercase tracking-widest font-bold outline-none">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="flex gap-12 items-center pt-4">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsForSale(!isForSale)}>
                <div className={`w-5 h-5 border flex items-center justify-center ${isForSale ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200'}`}>{isForSale && <span className="text-[10px] text-white">✓</span>}</div>
                <label className="text-[10px] font-bold uppercase tracking-widest">Sale</label>
              </div>
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsForTrade(!isForTrade)}>
                <div className={`w-5 h-5 border flex items-center justify-center ${isForTrade ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200'}`}>{isForTrade && <span className="text-[10px] text-white">✓</span>}</div>
                <label className="text-[10px] font-bold uppercase tracking-widest">Trade</label>
              </div>
              {isForSale && (
                <input 
                  type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                  className="flex-1 border-b border-zinc-900 text-[14px] font-bold outline-none py-1 bg-transparent text-right"
                  placeholder="$"
                />
              )}
            </div>
            <button onClick={() => setStep('verify')} disabled={!name} className="w-full py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black shadow-xl">REVIEW COMMIT</button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="w-full space-y-16 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center space-y-4">
             <h2 className="text-[14px] font-bold uppercase tracking-[0.5em]">COMMITMENT VERIFICATION</h2>
          </div>
          <div className="flex flex-col items-center gap-10 border border-zinc-100 p-16 bg-[#FAFAFA] shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900" />
             <div className="w-48 h-48 bg-white border border-zinc-100 shadow-inner p-6">
               <img src={sourceImage!} className="w-full h-full object-contain mix-blend-multiply" />
             </div>
             <div className="text-center space-y-4">
               <p className="text-[24px] font-bold uppercase tracking-[0.1em] text-zinc-900 leading-none">{name}</p>
               <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                 <span>{category}</span> / <span>{condition}</span> {isForSale && <span>/ ${price}</span>}
               </div>
             </div>
          </div>
          <div className="flex gap-6">
             <button onClick={handleSaveItem} disabled={loading} className="flex-1 py-7 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-black shadow-xl">
               {loading ? 'INDEXING...' : 'FINALIZE COMMIT'}
             </button>
             <button onClick={() => setStep('finalize')} className="flex-1 py-7 border border-zinc-900 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-900">BACK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItem;
