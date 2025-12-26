
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, PublicTradeAd } from '../types';

type Tab = 'ARCHIVES' | 'TRADES';

const Explore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ARCHIVES');
  const [archives, setArchives] = useState<{username: string, count: number}[]>([]);
  const [tradeAds, setTradeAds] = useState<PublicTradeAd[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'FOR_SALE' | 'FOR_TRADE'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'ARCHIVES') fetchArchives();
    else fetchTradeAds();
  }, [activeTab, filter]);

  const fetchArchives = async (query: string = searchQuery) => {
    setLoading(true);
    try {
      let pQuery = supabase.from('profiles').select('id, username');
      if (query) pQuery = pQuery.ilike('username', `%${query}%`);
      
      const { data: profiles } = await pQuery.limit(30);
      if (profiles) {
        const results = [];
        for (const p of profiles) {
          let itemQuery = supabase.from('items').select('*', { count: 'exact', head: true })
            .eq('owner_id', p.id).eq('public', true);
          
          if (filter === 'FOR_SALE') itemQuery = itemQuery.eq('for_sale', true);
          if (filter === 'FOR_TRADE') itemQuery = itemQuery.eq('for_trade', true);

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
    setLoading(true);
    const { data } = await supabase.from('trade_ads').select('*, owner:profiles(*)').order('created_at', { ascending: false });
    if (data) setTradeAds(data as PublicTradeAd[]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center w-full space-y-16">
      <div className="flex gap-12 border-b border-zinc-100 dark:border-zinc-900 w-full max-w-lg justify-center pb-4">
        {['ARCHIVES', 'TRADES'].map((t) => (
          <button 
            key={t} onClick={() => setActiveTab(t as Tab)}
            className={`text-[11px] uppercase tracking-[0.3em] transition-colors ${activeTab === t ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'ARCHIVES' ? (
        <div className="w-full flex flex-col items-center space-y-16">
          <div className="w-full max-w-xl space-y-8">
            <input 
              type="text" placeholder="SEARCH DIRECTORY..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchArchives()}
              className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 py-4 text-center text-[12px] uppercase tracking-[0.2em] focus:border-zinc-900 dark:focus:border-zinc-100 outline-none"
            />
            <div className="flex gap-6 justify-center">
              {['ALL', 'FOR_SALE', 'FOR_TRADE'].map(f => (
                <button 
                  key={f} onClick={() => setFilter(f as any)}
                  className={`text-[9px] uppercase tracking-widest px-4 py-1 border transition-colors ${filter === f ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl">
            {archives.map(a => (
              <Link key={a.username} to={`/profile/${a.username}`} className="p-8 border border-zinc-50 dark:border-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all text-center group">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-[14px] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">@{a.username[0]}</span>
                </div>
                <h3 className="text-[12px] uppercase tracking-[0.2em]">@{a.username}</h3>
                <p className="text-[9px] text-zinc-400 uppercase mt-2">{a.count} UNITS</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-8">
          {tradeAds.map(ad => (
            <div key={ad.id} className="p-10 border border-zinc-100 dark:border-zinc-900 bg-[#FDFDFD] dark:bg-zinc-950 flex flex-col space-y-6">
              <div className="flex justify-between items-baseline">
                <Link to={`/profile/${ad.owner?.username}`} className="text-[11px] uppercase tracking-[0.2em] font-medium hover:underline">@{ad.owner?.username}</Link>
                <span className="text-[9px] text-zinc-300 uppercase">{new Date(ad.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-[13px] tracking-wide leading-relaxed">{ad.text}</p>
              <div className="pt-4 border-t border-zinc-50 dark:border-zinc-900 flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Looking For</span>
                  <span className="text-[11px] uppercase tracking-widest">{ad.looking_for}</span>
                </div>
                <Link to={`/trade/${ad.owner?.username}`} className="text-[10px] uppercase tracking-[0.2em] px-6 py-2 border border-zinc-900 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all">Submit Offer</Link>
              </div>
            </div>
          ))}
          {tradeAds.length === 0 && <p className="text-center py-24 text-zinc-300 uppercase tracking-widest text-[11px]">No active trade bulletins</p>}
        </div>
      )}
    </div>
  );
};

export default Explore;
