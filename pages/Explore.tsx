
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, PublicTradeAd, Item } from '../types';

interface TradeAdWithItems extends PublicTradeAd {
  items: Item[];
}

const Explore: React.FC = () => {
  const [archives, setArchives] = useState<{id: string, username: string, avatar_url?: string, count: number}[]>([]);
  const [tradeAds, setTradeAds] = useState<TradeAdWithItems[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchives();
    fetchTradeAds();
  }, []);

  const fetchArchives = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      let pQuery = supabase.from('profiles').select('id, username, avatar_url');
      if (query) pQuery = pQuery.ilike('username', `%${query}%`);
      
      const { data: profiles } = await pQuery.limit(50);
      if (profiles) {
        const results = [];
        for (const p of profiles) {
          const { count } = await supabase.from('items')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', p.id).eq('public', true);
          
          results.push({ ...p, count: count || 0 });
        }
        setArchives(query ? results : results.filter(r => r.count > 0));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeAds = async () => {
    const { data } = await supabase.from('trade_ads').select('*, owner:profiles(*)').order('created_at', { ascending: false }).limit(10);
    if (data) {
      const enrichedAds = await Promise.all(data.map(async (ad) => {
        const { data: items } = await supabase.from('items').select('*').in('id', ad.offering_ids || []);
        return { ...ad, items: items || [] };
      }));
      setTradeAds(enrichedAds as TradeAdWithItems[]);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-24">
      <header className="w-full max-w-2xl space-y-10 text-center">
        <h1 className="text-[18px] uppercase tracking-[0.5em] font-bold text-zinc-900">IDENTITY DIRECTORY</h1>
        <div className="relative">
          <input 
            type="text" placeholder="SEARCH ARCHIVE IDENTITY..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchArchives()}
            className="w-full bg-zinc-50 border border-zinc-100 px-10 py-7 text-[14px] uppercase tracking-[0.25em] focus:border-zinc-900 outline-none text-zinc-900 placeholder:text-zinc-300 font-bold transition-all shadow-sm"
          />
          <button onClick={() => fetchArchives()} className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Search</button>
        </div>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
        <section className="lg:col-span-8 space-y-12">
          <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400 border-b border-zinc-50 pb-4">ARCHIVISTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {archives.map(a => (
              <Link key={a.id} to={`/profile/${a.username}`} className="p-10 border border-zinc-100 hover:border-zinc-900 transition-all flex flex-col items-center group bg-white shadow-sm hover:shadow-xl">
                <div className="w-24 h-24 bg-zinc-50 rounded-full mb-8 flex items-center justify-center border border-zinc-100 overflow-hidden shadow-inner">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[20px] font-bold text-zinc-300 uppercase">@{a.username[0]}</span>
                  )}
                </div>
                <h3 className="text-[14px] uppercase tracking-[0.25em] font-bold text-zinc-900">@{a.username}</h3>
                <p className="text-[10px] text-zinc-500 uppercase mt-3 tracking-[0.2em] font-bold">{a.count} ARCHIVAL UNITS</p>
              </Link>
            ))}
            {loading && <div className="col-span-full text-center py-20 text-[11px] uppercase tracking-widest text-zinc-400 font-bold animate-pulse">Syncing...</div>}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-12 bg-zinc-50/20 p-8 border border-zinc-100">
          <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400">MARKET BULLETINS</h3>
          <div className="space-y-10">
            {tradeAds.map(ad => (
              <div key={ad.id} className="bg-white border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-center mb-6">
                  <Link to={`/profile/${ad.owner?.username}`} className="text-[11px] font-bold uppercase tracking-widest text-zinc-900 hover:underline">@{ad.owner?.username}</Link>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[14px] leading-relaxed text-zinc-800 font-medium mb-8 italic">"{ad.text}"</p>
                
                {ad.items.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    {ad.items.map(it => (
                      <div key={it.id} className="aspect-square bg-white border border-zinc-50 relative group/item">
                        <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                        {it.price && it.for_sale && (
                          <span className="absolute bottom-1 right-1 bg-zinc-900 text-white text-[8px] px-1 font-bold tracking-tighter">${it.price}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">LF: {ad.looking_for || 'Inquiry'}</span>
                  <div className="flex gap-4">
                    <Link to={`/messages/${ad.owner_id}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 underline underline-offset-4">Message</Link>
                    <Link to={`/trade/${ad.owner?.username}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 border border-zinc-900 px-4 py-1.5 hover:bg-zinc-900 hover:text-white transition-all">Offer</Link>
                  </div>
                </div>
              </div>
            ))}
            <Link to="/add" className="block text-center py-6 bg-zinc-900 text-white text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-black transition-all">POST BULLETIN</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Explore;
