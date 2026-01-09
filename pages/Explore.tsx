
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, PublicTradeAd, Item } from '../types';
import { cleanStrict } from '../services/safetyService';

// HARDCODED LEGACY DATA FOR RECRUITERS
const LEGACY_ARCHIVISTS = [
  { 
    id: 'legacy-node-001', 
    username: 'brutalist_lab', 
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', 
    count: 12,
    bio: 'Curating monochrome forms and brutalist archival hardware. Focus on 1970s Braun design and minimalist objects.'
  },
  { 
    id: 'legacy-node-002', 
    username: 'vintage_optics', 
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop', 
    count: 8,
    bio: 'Specialist in 90s tech, archival optics, and rare media repositories.'
  },
  { 
    id: 'legacy-node-003', 
    username: 'hardware_vault', 
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', 
    count: 24,
    bio: 'Mapping the intersection of physical utility and identity through high-performance objects.'
  },
  { 
    id: 'legacy-node-004', 
    username: 'studio_index', 
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop', 
    count: 15,
    bio: 'Typography, brutalist print media, and rare book curation. The history of the printed word as object.'
  },
  { 
    id: 'legacy-node-005', 
    username: 'analog_archive', 
    avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=200&auto=format&fit=crop', 
    count: 31,
    bio: 'Magnetic media specialist. 35mm film, modular synthesis, and the preservation of analog decay.'
  },
  { 
    id: 'legacy-node-006', 
    username: 'tech_decay', 
    avatar_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=200&auto=format&fit=crop', 
    count: 19,
    bio: 'Translucent plastics and early 2000s computing. Documenting the aesthetic of the early internet age.'
  }
];

const LEGACY_BULLETINS = [
  {
    id: 'lb-1',
    owner_id: 'legacy-node-001',
    text: "Looking for archival hardware units from the Rams era. Open to trading monochrome objects.",
    looking_for: "HARDWARE, MEDIA",
    created_at: new Date().toISOString(),
    owner: LEGACY_ARCHIVISTS[0],
    items: [
      { id: 'li-1', name: 'UNIT_ALPHA', image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop', category: 'OBJECT', condition: 'ARCHIVAL' }
    ]
  },
  {
    id: 'lb-2',
    owner_id: 'legacy-node-002',
    text: "De-indexing my collection of vintage optics. Preference for hard-currency or high-tier apparel.",
    looking_for: "APPAREL, OBJECT",
    created_at: new Date().toISOString(),
    owner: LEGACY_ARCHIVISTS[1],
    items: [
      { id: 'li-2', name: 'OPTIC_V3', image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop', category: 'HARDWARE', condition: 'VNDS' }
    ]
  },
  {
    id: 'lb-3',
    owner_id: 'legacy-node-004',
    text: "LF: First edition design journals. Have rare brutalist zines for trade.",
    looking_for: "MEDIA, OBJECT",
    created_at: new Date().toISOString(),
    owner: LEGACY_ARCHIVISTS[3],
    items: []
  },
  {
    id: 'lb-4',
    owner_id: 'legacy-node-006',
    text: "Seeking working iMac G3 units (Bondi Blue). Trading early Y2K hardware.",
    looking_for: "HARDWARE",
    created_at: new Date().toISOString(),
    owner: LEGACY_ARCHIVISTS[5],
    items: [
       { id: 'li-3', name: 'TRANSLUCENT_NODE', image_url: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?q=80&w=400&auto=format&fit=crop', category: 'HARDWARE', condition: 'USED' }
    ]
  }
];

interface TradeAdWithItems extends PublicTradeAd {
  items: any[];
}

const Explore: React.FC = () => {
  const [archives, setArchives] = useState<{id: string, username: string, avatar_url?: string, count: number}[]>([]);
  const [tradeAds, setTradeAds] = useState<TradeAdWithItems[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSample, setShowSample] = useState(true); 
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
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchArchives = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user.id;

      let pQuery = supabase.from('profiles').select('id, username, avatar_url');
      if (query) pQuery = pQuery.ilike('username', `%${query}%`);
      
      const { data: profiles } = await pQuery.limit(50);
      let results: any[] = [];
      
      if (profiles) {
        for (const p of profiles) {
          if (p.id === myId) continue;
          const { count } = await supabase.from('items')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', p.id).eq('public', true);
          results.push({ ...p, count: count || 0 });
        }
      }

      setArchives(results);
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

  const toggleSample = () => {
    setShowSample(!showSample);
    showNotify(showSample ? "LEGACY NODES DISCONNECTED" : "LEGACY NODES INITIALIZED");
  };

  const displayedArchives = showSample 
    ? [...LEGACY_ARCHIVISTS, ...archives.filter(a => !LEGACY_ARCHIVISTS.some(l => l.id === a.id))]
    : archives;

  const displayedBulletins = showSample 
    ? [...LEGACY_BULLETINS, ...tradeAds]
    : tradeAds;

  // REUSABLE STATS OVERLAY
  const ItemStatOverlay = ({ item }: { item: any }) => (
    <div className="absolute inset-0 bg-zinc-950/90 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-2 text-center space-y-2 z-20 pointer-events-none">
      <span className="text-[7px] text-white font-bold uppercase tracking-widest truncate w-full">{item.name}</span>
      <div className="space-y-0.5">
        <span className="text-[5px] uppercase tracking-[0.2em] text-zinc-500 font-bold block">CATEGORY</span>
        <span className="text-[7px] uppercase tracking-widest text-zinc-300 font-bold">{item.category}</span>
      </div>
      <div className="space-y-0.5">
        <span className="text-[5px] uppercase tracking-[0.2em] text-zinc-500 font-bold block">CONDITION</span>
        <span className="text-[7px] uppercase tracking-widest text-zinc-300 font-bold">{item.condition}</span>
      </div>
    </div>
  );

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
            maxLength={128}
            value={searchQuery} onChange={(e) => setSearchQuery(cleanStrict(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && fetchArchives()}
            className="w-full bg-zinc-50 border border-zinc-100 px-10 py-7 text-[14px] uppercase tracking-[0.25em] focus:border-zinc-900 outline-none text-zinc-900 placeholder:text-zinc-300 font-bold transition-all shadow-sm"
          />
          <button onClick={() => fetchArchives()} className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Search</button>
        </div>
        
        <button 
          onClick={toggleSample}
          className={`text-[9px] uppercase tracking-[0.4em] font-bold transition-all border-b pb-1 ${showSample ? 'text-zinc-900 border-zinc-900' : 'text-zinc-300 border-zinc-100 hover:text-zinc-500'}`}
        >
          {showSample ? 'DISCONNECT LEGACY NODES' : 'INITIALIZE LEGACY NETWORK'}
        </button>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
        <section className="lg:col-span-8 space-y-12">
          <div className="flex justify-between items-baseline border-b border-zinc-50 pb-4">
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400">ARCHIVISTS</h3>
            {currentUserId && <Link to="/friends" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Established Links</Link>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedArchives.map(a => (
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
                <div className="absolute top-0 right-0 p-4 text-[8px] font-bold text-zinc-100 tracking-tighter select-none uppercase">
                  {a.id.startsWith('legacy') ? 'LEGACY_NODE' : `NODE_${a.id.slice(0,4)}`}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-12 bg-zinc-50/20 p-8 border border-zinc-100 shadow-inner">
          <div className="flex justify-between items-baseline">
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-zinc-400">MARKET BULLETINS</h3>
            <Link to="/add" className="text-[9px] font-bold uppercase tracking-widest text-zinc-900 underline">Post New</Link>
          </div>
          <div className="space-y-10">
            {displayedBulletins.map((ad: any) => (
              <div key={ad.id} className="bg-white border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-shadow group relative">
                {ad.owner_id === currentUserId && (
                  <div className="absolute top-0 left-0 bg-zinc-950 text-white text-[7px] px-2 py-1 font-bold tracking-widest">MY BULLETIN</div>
                )}
                {ad.owner_id.startsWith('legacy') && (
                  <div className="absolute top-0 left-0 bg-zinc-100 text-zinc-400 text-[7px] px-2 py-1 font-bold tracking-widest uppercase">Legacy Node</div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <Link to={`/profile/${ad.owner?.username}`} className="text-[11px] font-bold uppercase tracking-widest text-zinc-900 hover:underline">@{ad.owner?.username}</Link>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[14px] leading-relaxed text-zinc-800 font-medium mb-8 italic">"{ad.text}"</p>
                
                {ad.items && ad.items.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    {ad.items.map((it: any) => (
                      <Link key={it.id} to={`/item/${it.id}`} className="aspect-square bg-white border border-zinc-50 relative group/item overflow-hidden">
                        <img src={it.image_url} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover/item:scale-110" />
                        <ItemStatOverlay item={it} />
                        {it.owner_id === currentUserId && (
                          <div className="absolute top-0 right-0 bg-zinc-950 text-white text-[6px] px-1 font-bold z-30">MY UNIT</div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">LF: {ad.looking_for || 'Inquiry'}</span>
                  {ad.owner_id !== currentUserId && !ad.owner_id.startsWith('legacy') && (
                    <div className="flex gap-4">
                      <Link to={`/messages/${ad.owner_id}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 underline underline-offset-4">Message</Link>
                      <Link to={`/trade/${ad.owner?.username}`} className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 border border-zinc-900 px-4 py-1.5 hover:bg-zinc-900 hover:text-white transition-all">Offer</Link>
                    </div>
                  )}
                  {ad.owner_id.startsWith('legacy') && (
                    <span className="text-[8px] uppercase tracking-widest text-zinc-300 font-bold italic">Simulation Node</span>
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
