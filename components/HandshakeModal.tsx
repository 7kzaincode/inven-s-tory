
import React from 'react';

interface HandshakeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

const HandshakeModal: React.FC<HandshakeModalProps> = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="max-w-md w-full border border-zinc-950 bg-white p-12 shadow-[40px_40px_0px_rgba(0,0,0,0.05)] animate-in zoom-in-95 duration-300">
        <header className="mb-8 flex flex-col items-center text-center">
           <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-zinc-300 mb-4">CONFIRMATION_PROTOCOL</span>
           <h2 className="text-[18px] font-bold uppercase tracking-[0.4em] text-zinc-950 leading-tight">{title}</h2>
        </header>
        
        <p className="text-[12px] text-zinc-500 text-center uppercase tracking-widest leading-relaxed mb-12">
          {message}
        </p>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onConfirm}
            className="w-full py-5 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all shadow-xl active:scale-95"
          >
            AUTHORIZE_ACTION
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-5 border border-zinc-200 text-zinc-400 text-[11px] font-bold uppercase tracking-[0.4em] hover:bg-zinc-50 transition-all active:scale-95"
          >
            ABORT
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandshakeModal;
