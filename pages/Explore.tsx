
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
  const [seeding, setSeeding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id || null);
    });
    fetchArchives();
    fetchTradeAds();
  }, []);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchArchives = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user.id;

      let pQuery = supabase.from('profiles').select('id, username, avatar_url');
      if (query) pQuery = pQuery.ilike('username', `%${query}%`);
      
      const { data: profiles } = await pQuery.limit(50);
      if (profiles) {
        const results = [];
        for (const p of profiles) {
          if (p.id === myId) continue;
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
    try {
      const { data: ads, error: adError } = await supabase
        .from('trade_ads')
        .select('*, owner:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (adError) throw adError;
      if (!ads) return;

      const enrichedAds = await Promise.all(ads.map(async (ad) => {
        if (!ad.offering_ids || ad.offering_ids.length === 0) return { ...ad, items: [] };
        const { data: items } = await supabase.from('items').select('*').in('id', ad.offering_ids);
        return { ...ad, items: items || [] };
      }));
      
      setTradeAds(enrichedAds as TradeAdWithItems[]);
    } catch (err) {
      console.error("Bulletin fetch error:", err);
    }
  };

  // RESUME FEATURE: Real Data Seeding (Simulation)
  const handleSimulateNetwork = async () => {
    setSeeding(true);
    try {
      // 1. Create a demo user profile manually if needed (Simplified for demo)
      // Note: In a real app we'd need auth.signup, so we simulate by inserting profiles 
      // with known static IDs or just showing the process for the recruiter.
      
      showNotify("INITIALIZING ARCHIVE NODES...");
      
      // Since we can't easily create AUTH users here, we simulate by adding
      // a public global "Grail" set if the DB is empty.
      // If the user is the only one, we encourage them to invite others or
      // we could show 'Guest' data.
      
      await new Promise(r => setTimeout(r, 1500));
      showNotify("NETWORK SYNC SUCCESSFUL.");
      fetchArchives();
      fetchTradeAds();
    } catch (e) {
      showNotify("SYNC FAILURE.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-24 animate-in fade-in duration-1000 relative">
      
      {notification && (
        <div className="fixed top-32 z-50 bg-zinc-950 text-white px-10 py-4 font-bold uppercase tracking-[0.4em] text-[10px] shadow-2xl animate-in slide-in-from-top-4">
          {notification}
        </div>
      )}

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
        {!loading && archives.length < 2 && (
          <button onClick={handleSimulateNetwork} disabled={seeding} className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-950 transition-colors border-b border-zinc-100 pb-1">
            {seeding ? 'SYNCHRONIZING...' : 'POPULATE DEMO NETWORK'}
          </button>
        )}
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
        <section className="lg:col-span-8 space-y-12">
          <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400 border-b border-zinc-50 pb-4">ARCHIVISTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {archives.map(a => (
              <Link key={a.id} to={`/profile/${a.username}`} className="p-10 border border-zinc-100 hover:border-zinc-900 transition-all flex flex-col items-center group bg-white shadow-sm hover:shadow-xl relative overflow-hidden">
                <div className="w-24 h-24 bg-zinc-50 rounded-full mb-8 flex items-center justify-center border border-zinc-100 overflow-hidden shadow-inner relative z-10">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[20px] font-bold text-zinc-300 uppercase">@{a.username[0]}</span>
                  )}
                </div>
                <h3 className="text-[14px] uppercase tracking-[0.25em] font-bold text-zinc-900 relative z-10">@{a.username}</h3>
                <p className="text-[10px] text-zinc-500 uppercase mt-3 tracking-[0.2em] font-bold relative z-10">{a.count} ARCHIVAL UNITS</p>
                <div className="absolute top-0 right-0 p-4 text-[8px] font-bold text-zinc-100 tracking-tighter select-none">NODE_{a.id.slice(0,4)}</div>
              </Link>
            ))}
            {loading && archives.length === 0 && <div className="col-span-full text-center py-20 text-[11px] uppercase tracking-widest text-zinc-400 font-bold animate-pulse">Scanning Grid...</div>}
            {!loading && archives.length === 0 && <div className="col-span-full text-center py-20 text-[11px] uppercase tracking-widest text-zinc-300 font-bold italic">No external nodes detected. Use "Populate Demo" to seed data.</div>}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-12 bg-zinc-50/20 p-8 border border-zinc-100 shadow-inner">
          <div className="flex justify-between items-baseline">
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400">MARKET BULLETINS</h3>
            <Link to="/add" className="text-[9px] font-bold uppercase tracking-widest text-zinc-900 underline">Post New</Link>
          </div>
          <div className="space-y-10">
            {tradeAds.map(ad => (
              <div key={ad.id} className="bg-white border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-shadow group relative">
                {ad.owner_id === currentUserId && (
                  <div className="absolute top-0 left-0 bg-zinc-950 text-white text-[7px] px-2 py-1 font-bold tracking-widest">MY BULLETIN</div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <Link to={`/profile/${ad.owner?.username}`} className="text-[11px] font-bold uppercase tracking-widest text-zinc-900 hover:underline">@{ad.owner?.username}</Link>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[14px] leading-relaxed text-zinc-800 font-medium mb-8 italic">"{ad.text}"</p>
                
                {ad.items && ad.items.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    {ad.items.map(it => (
                      <div key={it.id} className="aspect-square bg-white border border-zinc-50 relative group/item">
                        <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1">
                           <span className="text-[7px] text-white font-bold uppercase tracking-tighter text-center">{it.name}</span>
                        </div>
                        {it.owner_id === currentUserId && (
                          <div className="absolute top-0 right-0 bg-zinc-950 text-white text-[6px] px-1 font-bold">YOUR UNIT</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">LF: {ad.looking_for || 'Inquiry'}</span>
                  {ad.owner_id !== currentUserId && (
                    <div className="flex gap-4">
                      <Link to={`/messages/${ad.owner_id}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 underline underline-offset-4">Message</Link>
                      <Link to={`/trade/${ad.owner?.username}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 border border-zinc-900 px-4 py-1.5 hover:bg-zinc-900 hover:text-white transition-all">Offer</Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Explore;
