
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { processImageWithAI } from '../services/geminiService';
import { supabase } from '../services/supabase';

interface AddItemProps {
  ownerId: string;
}

const CATEGORIES = ['Footwear', 'Apparel', 'Accessory', 'Object', 'Archive'];
const CONDITIONS = ['Deadstock', 'VNDS', 'Used', 'Archival', 'Distressed'];

const AddItem: React.FC<AddItemProps> = ({ ownerId }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<'upload' | 'camera' | 'processing' | 'finalize'>('upload');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Footwear');
  const [condition, setCondition] = useState('Deadstock');
  const [isPublic, setIsPublic] = useState(true);
  const [isForSale, setIsForSale] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);

  // Auto-adjustment: Resize and center image on 1:1 white background
  const normalizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 1024; // Standardized resolution
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Calculate scaling to fit 1:1
        const scale = Math.min(size / img.width, size / img.height) * 0.9; // 10% padding
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

  const startCamera = async () => {
    setStep('camera');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Camera access denied.");
      setStep('upload');
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(track => track.stop());
      
      const normalized = await normalizeImage(dataUrl);
      triggerProcessing(normalized);
    }
  };

  const triggerProcessing = async (base64: string) => {
    setStep('processing');
    setError(null);
    try {
      const processed = await processImageWithAI(base64);
      setProcessedImage(processed || base64);
    } catch (e) {
      setProcessedImage(base64);
    }
    setStep('finalize');
  };

  const resetPhoto = () => {
    setProcessedImage(null);
    setStep('upload');
  };

  const handleSave = async () => {
    if (!processedImage || !name) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const fileName = `${ownerId}/${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('items')
        .insert([{
          owner_id: ownerId,
          name: name,
          image_url: publicUrl,
          public: isPublic,
          for_sale: isForSale,
          for_trade: isForTrade,
          category,
          condition
        }]);

      if (dbError) throw dbError;
      navigate('/my-space');
    } catch (err: any) {
      setError(err.message || "Failed to save item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto py-12 px-4">
      <h1 className="text-[14px] uppercase tracking-[0.3em] font-semibold mb-16 text-center text-zinc-900">INDEX NEW UNIT</h1>

      {error && <div className="w-full p-4 mb-8 bg-red-50 text-red-600 text-[10px] uppercase tracking-widest text-center border border-red-100">{error}</div>}

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-12">
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border border-zinc-100 bg-[#FDFDFD] flex flex-col items-center justify-center cursor-pointer hover:border-zinc-900 transition-all group">
            <span className="text-[11px] uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">Select Archive File</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={startCamera} className="text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 font-medium transition-colors">Use Camera Sensor</button>
        </div>
      )}

      {step === 'camera' && (
        <div className="w-full flex flex-col items-center space-y-8">
          <div className="w-full aspect-square overflow-hidden bg-black border border-zinc-100">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <button onClick={capturePhoto} className="w-20 h-20 border-2 border-zinc-200 rounded-full flex items-center justify-center hover:border-zinc-900 transition-colors">
            <div className="w-16 h-16 bg-zinc-100 rounded-full" />
          </button>
          <button onClick={() => setStep('upload')} className="text-[10px] uppercase tracking-widest text-zinc-400">Cancel</button>
        </div>
      )}

      {step === 'processing' && (
        <div className="w-full aspect-square flex flex-col items-center justify-center space-y-6">
          <div className="w-8 h-8 border-t-2 border-zinc-900 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Normalizing Visual State...</p>
        </div>
      )}

      {step === 'finalize' && processedImage && (
        <div className="w-full flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="relative group w-full aspect-square bg-[#FDFDFD] border border-zinc-50 flex items-center justify-center overflow-hidden">
            <img src={processedImage} alt="Processed" className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
            <button 
              onClick={resetPhoto}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-zinc-100 px-4 py-2 text-[9px] uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
            >
              Change Photo
            </button>
          </div>

          <div className="flex flex-col space-y-10">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold">Unit Identifier</label>
              <input 
                type="text" placeholder="E.G. 350 V2 'SLATE'" 
                className="w-full border-b border-zinc-100 py-4 text-[13px] uppercase tracking-[0.2em] focus:outline-none focus:border-zinc-900 transition-colors bg-transparent text-zinc-900"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold">Category</label>
                <select 
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="bg-transparent border-b border-zinc-100 py-2 text-[11px] uppercase tracking-widest focus:outline-none focus:border-zinc-900"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold">Archival State</label>
                <select 
                  value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="bg-transparent border-b border-zinc-100 py-2 text-[11px] uppercase tracking-widest focus:outline-none focus:border-zinc-900"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              {[
                { label: 'Public Visibility', state: isPublic, setter: setIsPublic },
                { label: 'Open For Sale', state: isForSale, setter: setIsForSale },
                { label: 'Open For Trade', state: isForTrade, setter: setIsForTrade }
              ].map((item, idx) => (
                <label key={idx} className="flex items-center space-x-6 cursor-pointer group">
                  <div className={`w-5 h-5 border border-zinc-200 flex items-center justify-center transition-all ${item.state ? 'bg-zinc-900 border-zinc-900' : 'bg-transparent'}`}>
                    {item.state && <div className="w-1.5 h-1.5 bg-white" />}
                    <input 
                      type="checkbox" checked={item.state} onChange={(e) => item.setter(e.target.checked)}
                      className="hidden"
                    />
                  </div>
                  <span className={`text-[11px] uppercase tracking-widest transition-colors ${item.state ? 'text-zinc-900 font-medium' : 'text-zinc-400 group-hover:text-zinc-900'}`}>{item.label}</span>
                </label>
              ))}
            </div>

            <button 
              onClick={handleSave} disabled={loading || !name}
              className="w-full py-6 bg-zinc-900 text-white text-[11px] font-semibold uppercase tracking-[0.4em] hover:bg-black transition-all disabled:opacity-20"
            >
              {loading ? 'SYNCING...' : 'COMMIT TO ARCHIVE'}
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AddItem;
