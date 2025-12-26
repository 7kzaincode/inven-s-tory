
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => triggerProcessing(event.target?.result as string);
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(track => track.stop());
      triggerProcessing(dataUrl);
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
      <h1 className="text-[14px] uppercase tracking-[0.3em] mb-16 text-center">ADD TO ARCHIVE</h1>

      {error && <div className="w-full p-4 mb-8 bg-black text-white text-[10px] uppercase tracking-widest text-center">{error}</div>}

      {step === 'upload' && (
        <div className="w-full flex flex-col items-center space-y-8">
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-[11px] uppercase tracking-widest text-gray-400">Select File</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={startCamera} className="text-[11px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Camera</button>
        </div>
      )}

      {step === 'camera' && (
        <div className="w-full flex flex-col items-center space-y-8">
          <div className="w-full aspect-square overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <button onClick={capturePhoto} className="w-16 h-16 border-4 border-gray-200 rounded-full flex items-center justify-center hover:border-black transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full" />
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="w-full aspect-square flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-t-2 border-black rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Isolating Object...</p>
        </div>
      )}

      {step === 'finalize' && processedImage && (
        <div className="w-full flex flex-col space-y-12">
          <div className="w-full aspect-square bg-[#F9F9F9] flex items-center justify-center">
            <img src={processedImage} alt="Processed" className="w-full h-full object-contain mix-blend-multiply" />
          </div>

          <div className="flex flex-col space-y-8">
            <input 
              type="text" placeholder="NAME / IDENTIFIER" 
              className="w-full border-b border-gray-200 py-4 text-[12px] uppercase tracking-[0.2em] focus:outline-none focus:border-black transition-colors bg-transparent"
              value={name} onChange={(e) => setName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-gray-400">Category</label>
                <select 
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="bg-transparent border-b border-gray-100 py-2 text-[11px] uppercase tracking-widest focus:outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-gray-400">Condition</label>
                <select 
                  value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="bg-transparent border-b border-gray-100 py-2 text-[11px] uppercase tracking-widest focus:outline-none"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Public Visibility', state: isPublic, setter: setIsPublic },
                { label: 'Listed For Sale', state: isForSale, setter: setIsForSale },
                { label: 'Open To Trade', state: isForTrade, setter: setIsForTrade }
              ].map((item, idx) => (
                <label key={idx} className="flex items-center space-x-4 cursor-pointer group">
                  <input 
                    type="checkbox" checked={item.state} onChange={(e) => item.setter(e.target.checked)}
                    className="w-4 h-4 border-gray-200 rounded-none checked:bg-black accent-black"
                  />
                  <span className="text-[11px] uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">{item.label}</span>
                </label>
              ))}
            </div>

            <button 
              onClick={handleSave} disabled={loading || !name}
              className="w-full py-6 bg-black text-white text-[11px] uppercase tracking-[0.4em] hover:bg-gray-900 transition-colors disabled:opacity-30"
            >
              {loading ? 'UPLOADING...' : 'ARCHIVE ITEM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItem;
