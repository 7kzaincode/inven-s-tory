
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Explore from './pages/Explore';
import MySpace from './pages/MySpace';
import AddItem from './pages/AddItem';
import Login from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import ItemDetail from './pages/ItemDetail';
import Friends from './pages/Friends';
import Inbox from './pages/Inbox';
import TradeBuilder from './pages/TradeBuilder';
import { UserSession, Profile } from './types';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>({
    user: null,
    profile: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          fetchProfile(session.user.id, session.user.email!);
        } else {
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      const { data, error } = await supabase
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
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-t border-black rounded-full animate-spin" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-gray-400">Archival State Link...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={session.profile} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route 
            path="/login" 
            element={session.user ? <Navigate to="/my-space" replace /> : <Login />} 
          />
          <Route 
            path="/my-space" 
            element={session.user ? <MySpace profile={session.profile!} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/add" 
            element={session.user ? <AddItem ownerId={session.user.id} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/friends" 
            element={session.user ? <Friends profile={session.profile!} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/inbox" 
            element={session.user ? <Inbox profile={session.profile!} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/trade/:username" 
            element={session.user ? <TradeBuilder currentUser={session.profile!} /> : <Navigate to="/login" replace />} 
          />
          <Route path="/profile/:username" element={<ProfilePage currentUser={session.profile} />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
