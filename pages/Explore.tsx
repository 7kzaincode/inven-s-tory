
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface ArchivePreview {
  username: string;
  count: number;
}

const Explore: React.FC = () => {
  const [archives, setArchives] = useState<ArchivePreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async (query: string = '') => {
    if (query) setIsSearching(true);
    else setLoading(true);

    try {
      let profileQuery = supabase
        .from('profiles')
        .select('id, username');
      
      if (query) {
        // Search strictly against the username column
        profileQuery = profileQuery.ilike('username', `%${query}%`);
      }

      const { data: profiles, error: pError } = await profileQuery.limit(30);

      if (pError) throw pError;

      if (profiles) {
        const results: ArchivePreview[] = [];
        
        for (const profile of profiles) {
          // If the username looks like an email or is null, we provide a clearer fallback
          const displayName = profile.username || 'ANONYMOUS_ARCHIVE';
          
          const { count, error: cError } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profile.id)
            .eq('public', true);

          if (!cError && count !== null) {
            results.push({
              username: displayName,
              count: count
            });
          }
        }
        setArchives(results);
      }
    } catch (err) {
      console.error("Error fetching archives:", err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const timeoutId = setTimeout(() => {
      fetchArchives(val);
    }, 400);
    return () => clearTimeout(timeoutId);
  };

  if (loading && !searchQuery) return (
    <div className="py-32 flex flex-col items-center">
      <div className="w-4 h-4 border-t border-black rounded-full animate-spin mb-4" />
      <span className="text-[10px] uppercase tracking-[0.4em]">Linking Directory...</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full space-y-24">
      <div className="w-full max-w-xl flex flex-col items-center space-y-8">
        <h2 className="text-[14px] uppercase tracking-[0.3em] text-gray-400">ARCHIVE DIRECTORY</h2>
        <div className="w-full relative group">
          <input 
            type="text"
            placeholder="FIND BY @USERNAME"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-transparent border-b border-gray-100 py-4 text-[13px] uppercase tracking-[0.2em] focus:outline-none focus:border-black transition-colors text-center"
          />
          {isSearching && (
            <div className="absolute right-0 bottom-4">
              <div className="w-3 h-3 border-t border-black rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center">
        {archives.length === 0 ? (
          <div className="flex flex-col items-center space-y-4 py-32">
            <p className="text-[11px] uppercase tracking-widest text-gray-300">
              {searchQuery ? `No matches for "${searchQuery}"` : 'Directory empty'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 w-full max-w-6xl">
            {archives.map((archive) => (
              <Link 
                key={archive.username}
                to={`/profile/${archive.username}`} 
                className="group flex flex-col items-center text-center space-y-6 hover:opacity-70 transition-all border border-transparent hover:border-gray-50 p-10"
              >
                <div className="w-20 h-20 bg-[#FDFDFD] rounded-full flex items-center justify-center mb-2 border border-gray-100 group-hover:border-black transition-colors">
                  <span className="text-[12px] text-gray-400 uppercase tracking-widest group-hover:text-black">
                    @{archive.username.slice(0, 1)}
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <h3 className="text-[13px] uppercase tracking-[0.2em] font-medium">@{archive.username}</h3>
                  <p className="text-[9px] text-gray-300 uppercase tracking-widest pt-2">
                    {archive.count} ARCHIVAL UNITS
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
