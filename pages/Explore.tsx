
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, PublicTradeAd } from '../types';

const FLAGS = ['ALL', 'FOOTWEAR', 'APPAREL', 'ACCESSORY', 'HARDWARE', 'MEDIA', 'FURNITURE', 'OBJECT'];

const Explore: React.FC = () => {
  const [archives, setArchives] = useState<{username: string, count: number}[]>([]);
  const [tradeAds, setTradeAds] = useState<PublicTradeAd[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFlag, setActiveFlag] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchives();
    fetchTradeAds();
  }, [activeFlag]);

  const fetchArchives = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      let pQuery = supabase.from('profiles').select('id, username');
      if (query) pQuery = pQuery.ilike('username', `%${query}%`);
      
      const { data: profiles } = await pQuery.limit(20);
      if (profiles) {
        const results = [];
        for (const p of profiles) {
          let itemQuery = supabase.from('items').select('*', { count: 'exact', head: true })
            .eq('owner_id', p.id).eq('public', true);
          
          if (activeFlag !== 'ALL') itemQuery = itemQuery.eq('category', activeFlag);

          const { count } = await itemQuery;
          if (count !== null && (count > 0 || query)) {
            results.push({ username: p.username || 'UNNAMED', count });
          }
        }
        setArchives(results);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeAds = async () => {
    const { data } = await supabase.from('trade_ads').select('*, owner:profiles(*)').order('created_at', { ascending: false }).limit(10);
    if (data) setTradeAds(data as PublicTradeAd[]);
  };

  return (
    <div className="flex w-full gap-12">
      {/* Sidebar Flags */}
      <aside className="hidden lg:flex flex-col w-48 space-y-10 sticky top-32 h-fit">
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-900 mb-6">ARCHIVE FLAGS</h3>
          {FLAGS.map(f => (
            <button 
              key={f} onClick={() => setActiveFlag(f)}
              className={`block text-[11px] uppercase tracking-[0.2em] text-left transition-colors ${activeFlag === f ? 'text-zinc-900 font-bold border-l-2 border-zinc-900 pl-4' : 'text-zinc-400 hover:text-zinc-900 pl-4 border-l-2 border-transparent'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Grid */}
      <div className="flex-1 space-y-16">
        <div className="max-w-xl">
          <input 
            type="text" placeholder="SEARCH ARCHIVE IDENTITY..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchArchives()}
            className="w-full bg-transparent border-b border-zinc-200 py-4 text-[13px] uppercase tracking-[0.2em] focus:border-zinc-900 outline-none text-zinc-900 placeholder:text-zinc-300 font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {archives.map(a => (
            <Link key={a.username} to={`/profile/${a.username}`} className="p-10 border border-zinc-100 hover:border-zinc-900 transition-all flex flex-col items-center group">
              <div className="w-16 h-16 bg-zinc-50 rounded-full mb-8 flex items-center justify-center border border-zinc-50">
                <span className="text-[14px] font-bold text-zinc-900">@{a.username[0]}</span>
              </div>
              <h3 className="text-[12px] uppercase tracking-[0.2em] font-bold">@{a.username}</h3>
              <p className="text-[9px] text-zinc-500 uppercase mt-2 tracking-widest">{a.count} ARCHIVAL UNITS</p>
            </Link>
          ))}
          {loading && <div className="col-span-full text-center py-20 text-[10px] uppercase tracking-widest text-zinc-400">Loading directory...</div>}
        </div>
      </div>

      {/* Right Market Feed */}
      <aside className="hidden xl:flex flex-col w-80 space-y-10 sticky top-32 h-fit border-l border-zinc-50 pl-12">
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-900 mb-6">PUBLIC MARKET</h3>
        <div className="space-y-10">
          {tradeAds.map(ad => (
            <div key={ad.id} className="space-y-4 group">
              <Link to={`/profile/${ad.owner?.username}`} className="text-[10px] font-bold uppercase tracking-widest block hover:underline">@{ad.owner?.username}</Link>
              <p className="text-[12px] leading-relaxed text-zinc-700 font-medium">{ad.text}</p>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[8px] uppercase tracking-widest text-zinc-400">LF: {ad.looking_for}</span>
                <Link to={`/trade/${ad.owner?.username}`} className="text-[9px] font-bold uppercase tracking-widest text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity underline">Offer</Link>
              </div>
            </div>
          ))}
          <Link to="/trade-ads" className="block text-center py-4 border border-zinc-900 text-[9px] uppercase tracking-[0.3em] font-bold hover:bg-zinc-900 hover:text-white transition-all">Post Bulletin</Link>
        </div>
      </aside>
    </div>
  );
};

export default Explore;
