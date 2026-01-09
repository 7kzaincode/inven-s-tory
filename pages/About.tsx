
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center py-20 animate-in fade-in duration-1000">
      <div className="max-w-4xl w-full space-y-40">
        
        <header className="space-y-10">
          <h1 className="text-[44px] font-bold uppercase tracking-[0.6em] leading-none text-zinc-950">
            SYSTEM_INFO
          </h1>
          <p className="text-[18px] font-medium tracking-wide leading-relaxed text-zinc-800 max-w-2xl">
            INVEN[S]TORY IS NOT A MARKETPLACE. <br />
            IT IS A REPOSITORY OF THE PHYSICAL SELF.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-8">
            <h3 className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-400">MANIFESTO</h3>
            <div className="space-y-6 text-[14px] leading-loose font-medium text-zinc-900 uppercase tracking-widest">
              <p>Possessions are data points of existence.</p>
              <p>We do not facilitate transactions; we facilitate the mapping of identity.</p>
              <p>The things you own define the space you occupy. The Archive protects that space.</p>
            </div>
          </div>
          
          <div className="space-y-8 bg-zinc-50 p-12 border border-zinc-100 shadow-inner">
            <h3 className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-400">SYSTEM ARCHITECTURE</h3>
            <ul className="space-y-4 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              <li>• Unit Provenance Tracking</li>
              <li>• Bilateral Exchange Protocol</li>
              <li>• Physical Atlas Mapping</li>
              <li>• AI Compliance Filter</li>
            </ul>
          </div>
        </section>

        <section className="space-y-12">
          <h3 className="text-[10px] uppercase tracking-[0.6em] font-bold text-zinc-400 text-center">CORE VALUES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {[
              { title: "ARCHIVAL", desc: "Long-term preservation of physical objects as digital units." },
              { title: "MINIMALIST", desc: "Removing the noise of commerce to focus on the form of the unit." },
              { title: "TRUSTED", desc: "Direct, peer-to-peer verification through identity linking." }
            ].map((v, i) => (
              <div key={i} className="p-12 border border-zinc-100 space-y-4 text-center hover:bg-zinc-50 transition-colors">
                <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-zinc-900">{v.title}</span>
                <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-400 font-bold leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-20 border-t border-zinc-100 flex flex-col items-center gap-6">
           <span className="text-[10px] uppercase tracking-[0.8em] text-zinc-200 font-bold">ESTABLISHED_2024</span>
           <div className="w-1 h-1 bg-zinc-200 rounded-full" />
        </footer>
      </div>
    </div>
  );
};

export default About;
