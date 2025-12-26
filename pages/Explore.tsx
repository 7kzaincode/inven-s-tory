import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface ArchivePreview {
  username: string;
  count: number;
}

const Explore: React.FC = () => {
  const [archives, setArchives] = useState<ArchivePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, username');

        if (pError) throw pError;

        if (profiles) {
          const results: ArchivePreview[] = [];
          
          for (const profile of profiles) {
            const { count, error: cError } = await supabase
              .from('items')
              .select('*', { count: 'exact', head: true })
              .eq('owner_id', profile.id)
              .eq('public', true);

            if (!cError && count !== null && count > 0) {
              results.push({
                username: profile.username,
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
      }
    };

    fetchArchives();
  }, []);

  if (loading) return (
    <div className="py-32 flex flex-col items-center">
      <div className="w-4 h-4 border-t border-black rounded-full animate-spin mb-4" />
      <span className="text-[10px] uppercase tracking-[0.4em]">Opening Connections...</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full space-y-24">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-[14px] uppercase tracking-[0.3em] mb-16 text-gray-400">Connected Archives</h2>
        
        {archives.length === 0 ? (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-300">No public archives available</p>
            <Link to="/login" className="text-[10px] uppercase tracking-[0.2em] border-b border-black">Initialize an Archive</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 w-full max-w-4xl">
            {archives.map((archive) => (
              <Link 
                key={archive.username}
                to={`/profile/${archive.username}`} 
                className="group flex flex-col items-center text-center space-y-4 hover:opacity-70 transition-opacity"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 group-hover:border-gray-300 transition-colors">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">@{archive.username.slice(0, 1)}</span>
                </div>
                <h3 className="text-[12px] uppercase tracking-[0.2em]">@{archive.username}</h3>
                <p className="text-[9px] text-gray-300 uppercase tracking-widest pt-2">{archive.count} Items</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;