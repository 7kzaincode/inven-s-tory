
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Explore from './pages/Explore.tsx';
import AddItem from './pages/AddItem.tsx';
import AddRoom from './pages/AddRoom.tsx';
import Login from './pages/Login.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import ItemDetail from './pages/ItemDetail.tsx';
import Friends from './pages/Friends.tsx';
import Inbox from './pages/Inbox.tsx';
import Atlas from './pages/Atlas.tsx';
import TradeBuilder from './pages/TradeBuilder.tsx';
import About from './pages/About.tsx';
import { UserSession, Profile } from './types.ts';
import { supabase } from './services/supabase.ts';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>({
    user: null,
    profile: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        if (currentSession) {
          fetchProfile(currentSession.user.id, currentSession.user.email!);
        } else {
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setSession({ user: null, profile: null });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setSession({
          user: { id: userId, email },
          profile: data as Profile
        });
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession({ user: null, profile: null });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-12">
          <div className="w-16 h-[1px] bg-zinc-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-zinc-900 animate-[slide_1.5s_infinite_linear]" style={{width: '30%'}} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.8em] text-zinc-900 font-bold ml-[0.8em]">ARCHIVE_SYNC</span>
        </div>
      </div>
    );
  }

  const activeUserId = session.user?.id;

  return (
    <Router>
      <Layout 
        user={session.profile} 
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/about" element={<About />} />
          <Route path="/atlas" element={activeUserId ? <Atlas ownerId={activeUserId} /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={session.user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/add" element={activeUserId ? <AddItem ownerId={activeUserId} /> : <Navigate to="/login" replace />} />
          <Route path="/add-room" element={activeUserId ? <AddRoom /> : <Navigate to="/login" replace />} />
          <Route path="/friends" element={session.profile ? <Friends profile={session.profile} /> : <Navigate to="/login" replace />} />
          <Route path="/inbox" element={session.profile ? <Inbox profile={session.profile} /> : <Navigate to="/login" replace />} />
          <Route path="/messages/:targetUserId" element={session.profile ? <Inbox profile={session.profile} /> : <Navigate to="/login" replace />} />
          <Route path="/profile/:username" element={<ProfilePage currentUser={session.profile} />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/trade/:username" element={session.profile ? <TradeBuilder currentUser={session.profile} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </Router>
  );
};

export default App;
