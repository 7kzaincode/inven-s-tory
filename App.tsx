
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Explore from './pages/Explore';
import AddItem from './pages/AddItem';
import Login from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import ItemDetail from './pages/ItemDetail';
import Friends from './pages/Friends';
import Inbox from './pages/Inbox';
import Messages from './pages/Messages';
import TradeBuilder from './pages/TradeBuilder';
import AdminPanel from './pages/AdminPanel';
import HouseMap from './pages/HouseMap';
import { UserSession, Profile } from './types';
import { supabase } from './services/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>({
    user: null,
    profile: null
  });
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sudoUserId, setSudoUserId] = useState<string | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('inven_admin_token');
    const activeSudoId = localStorage.getItem('inven_sudo_id');
    
    if (adminToken === 'OVERRIDE_ACTIVE') {
      setIsAdmin(true);
      if (activeSudoId) {
        setSudoUserId(activeSudoId);
      }
    }

    const fullUrl = window.location.href;
    const isRecoveryUrl = fullUrl.includes('type=recovery') || 
                         fullUrl.includes('recovery_token=') || 
                         fullUrl.includes('access_token=');
    
    if (isRecoveryUrl) {
      setIsRecovering(true);
    }

    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }: { data: { session: Session | null } }) => {
        if (currentSession && !activeSudoId) {
          fetchProfile(currentSession.user.id, currentSession.user.email!);
        } else if (activeSudoId && adminToken === 'OVERRIDE_ACTIVE') {
          fetchProfile(activeSudoId, "admin@system.internal");
        } else {
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.href.includes('type=recovery'))) {
        setIsRecovering(true);
      }
      
      const activeSudoId = localStorage.getItem('inven_sudo_id');
      if (session || activeSudoId) {
        const targetId = activeSudoId || session?.user.id;
        if (targetId) fetchProfile(targetId, session?.user.email || "admin@system.internal");
      } else {
        setSession({ user: null, profile: null });
        if (!window.location.href.includes('type=recovery')) {
          setIsRecovering(false);
        }
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
    setIsRecovering(false);
    setIsAdmin(false);
    setSudoUserId(null);
    localStorage.removeItem('inven_admin_token');
    localStorage.removeItem('inven_sudo_id');
  };

  const handleAdminAuth = () => {
    setIsAdmin(true);
    localStorage.setItem('inven_admin_token', 'OVERRIDE_ACTIVE');
  };

  const handleTerminateSudo = () => {
    localStorage.removeItem('inven_sudo_id');
    setSudoUserId(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border-t border-black rounded-full animate-spin" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-gray-900 font-bold animate-pulse">Synchronizing Archive...</span>
        </div>
      </div>
    );
  }

  const activeUserId = sudoUserId || session.user?.id;

  return (
    <Router>
      <Layout 
        user={session.profile} 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
        sudoActive={!!sudoUserId}
        onTerminateSudo={handleTerminateSudo}
      >
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route 
            path="/login" 
            element={(session.user && !isRecovering && !isAdmin && !sudoUserId) ? <Navigate to="/" replace /> : <Login onAdminAuth={handleAdminAuth} />} 
          />
          <Route path="/recovery" element={<Login onAdminAuth={handleAdminAuth} />} />
          <Route 
            path="/admin" 
            element={isAdmin ? <AdminPanel /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/map" 
            element={activeUserId ? <HouseMap ownerId={activeUserId} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/my-space" 
            element={session.profile ? <Navigate to={`/profile/${session.profile.username}`} replace /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/add" 
            element={activeUserId ? <AddItem ownerId={activeUserId} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/friends" 
            element={session.profile ? <Friends profile={session.profile} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/inbox" 
            element={session.profile ? <Inbox profile={session.profile} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/messages" 
            element={activeUserId ? <Messages /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/messages/:targetUserId" 
            element={activeUserId ? <Messages /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/profile/:username" 
            element={<ProfilePage currentUser={session.profile} />} 
          />
          <Route 
            path="/item/:id" 
            element={<ItemDetail />} 
          />
          <Route 
            path="/trade/:username" 
            element={session.profile ? <TradeBuilder currentUser={session.profile} /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

// Exporting App as the default export for usage in index.tsx
export default App;
