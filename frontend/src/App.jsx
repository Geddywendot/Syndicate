import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Heart, 
  Image as ImageIcon, 
  Menu,
  User,
  Plus,
  Lock,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Auth from './components/Auth';
import Upload from './components/Upload';
import Home from './components/Home';
import Gallery from './components/Gallery';
import Discussions from './components/Discussions';
import Profile from './components/Profile';
import SyndicateNetwork from './components/SyndicateNetwork';
import SyndicateAvatar from './components/SyndicateAvatar';
import { formatDistanceToNow } from 'date-fns';

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAssetVideo = (url) => url?.includes('/video/') || url?.endsWith('.mp4') || url?.endsWith('.mov');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [memoriesPage, setMemoriesPage] = useState(0);
  const [hasMoreMemories, setHasMoreMemories] = useState(true);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite')) {
        setIsSettingPassword(true);
      }
      setLoading(false);
      
      if (session) {
        setMemoriesPage(0);
        fetchMemories(session.user.id, 0, true);
        fetchMessages();
        fetchNotifications(session.user.id);
        
        // Setup notification subscription
        const channel = supabase
          .channel('notifications-live')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          }, () => {
            fetchNotifications(session.user.id);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } else {
        setMemories([]);
        setMessages([]);
        setUnreadCount(0);
      }
    };

    handleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
        setMemoriesPage(0);
        fetchMemories(session.user.id, 0, true);
        fetchMessages();
      }
      if (event === 'SIGNED_OUT') {
        setMemories([]);
        setMessages([]);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsSettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMemories = async (userId, page = 0, reset = false) => {
    if (!userId) return;
    
    // Get groups user is in
    const { data: groupData } = await supabase.from('group_members').select('group_id').eq('user_id', userId);
    const groupIds = groupData?.map(g => g.group_id) || [];

    // Get following IDs (accepted)
    const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted');
    const followingIds = followData?.map(f => f.following_id) || [];

    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Visibility Query: (Own) OR (Followed & No Group) OR (In Group)
    let query = supabase.from('memories').select('*');
    
    const conditions = [`uploaded_by.eq.${userId}`];
    if (groupIds.length > 0) conditions.push(`group_id.in.(${groupIds.join(',')})`);
    if (followingIds.length > 0) conditions.push(`and(uploaded_by.in.(${followingIds.join(',')}),group_id.is.null)`);

    query = query.or(conditions.join(','));

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error) {
      if (reset) {
        setMemories(data || []);
      } else {
        setMemories(prev => [...prev, ...(data || [])]);
      }
      setHasMoreMemories(data?.length === ITEMS_PER_PAGE);
    }
  };

  const loadMoreMemories = () => {
    if (hasMoreMemories && session?.user) {
      const nextPage = memoriesPage + 1;
      setMemoriesPage(nextPage);
      fetchMemories(session.user.id, nextPage);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Scalability: limit messages
    if (!error) setMessages(data || []);
  };

  const fetchNotifications = async (userId) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (!error) setUnreadCount(count || 0);
  };

  const handleNewMessage = async (text) => {
    if (!session?.user) return;
    const { error } = await supabase.from('messages').insert([
      { text, uploaded_by: session.user.id, friend_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0] }
    ]);
    if (!error) {
      fetchMessages();
      showToast('Message broadcasted.');
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!session?.user) return;
    
    // Safety check: Ensure user owns the memory before deleting
    const memoryToDelete = memories.find(m => m.id === id);
    if (memoryToDelete?.uploaded_by !== session.user.id) {
      showToast('Unauthorized deletion attempt blocked.', 'error');
      return;
    }

    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (!error) {
      fetchMemories(session.user.id);
      showToast('Memory deleted.');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!session?.user) return;

    // Safety check: Ensure user owns the message before deleting
    const messageToDelete = messages.find(m => m.id === id);
    if (messageToDelete?.uploaded_by !== session.user.id) {
      showToast('Unauthorized deletion attempt blocked.', 'error');
      return;
    }

    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (!error) {
      fetchMessages();
      showToast('Transmission erased.');
    }
  };

  const renderPasswordSetup = () => {
    const [newPassword, setNewPassword] = useState('');
    const [updating, setUpdating] = useState(false);

    const handleUpdatePassword = async (e) => {
      e.preventDefault();
      setUpdating(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) {
        setIsSettingPassword(false);
        showToast('Welcome to the Syndicate family.');
      }
      setUpdating(false);
    };

    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-black/[0.03] p-10 rounded-[3rem] shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Lock className="text-primary w-10 h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-center mb-2">Password Setup</h2>
          <p className="text-text-muted text-xs text-center mb-8 uppercase tracking-widest font-bold">Create your login credentials</p>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-6 py-4 bg-black/[0.03] border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={updating}
              className="w-full py-5 bg-black text-white font-bold rounded-2xl hover:bg-primary transition-all flex items-center justify-center gap-3 text-sm shadow-xl"
            >
              Set Password
            </button>
          </form>
        </motion.div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-bg-deep flex items-center justify-center"><Heart className="text-primary w-12 h-12 animate-pulse" /></div>;
  if (!session) return <Auth />;
  if (isSettingPassword) return renderPasswordSetup();

  return (
    <div className="min-h-screen bg-bg-deep text-text-main selection:bg-primary selection:text-white">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-b border-black/[0.03]">
        <div className="px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Heart className="text-primary w-5 h-5 fill-primary/20" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-none">Syndicate</span>
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-widest">Memory Sharing</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('settings')} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-text-main overflow-hidden border border-black/[0.03]">
              <SyndicateAvatar src={session?.user?.user_metadata?.avatar_url} name={session?.user?.email} size={40} variant="beam" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <Home memories={memories} />}
            {activeTab === 'network' && <SyndicateNetwork session={session} />}
            {activeTab === 'gallery' && (
              <Gallery 
                memories={memories} 
                session={session} 
                setSelectedImageIndex={setSelectedImageIndex} 
                handleDeleteMemory={handleDeleteMemory}
                galleryFilter={galleryFilter}
                setGalleryFilter={setGalleryFilter}
                isAssetVideo={isAssetVideo}
                hasMore={hasMoreMemories}
                loadMore={loadMoreMemories}
              />
            )}
            {activeTab === 'wall' && (
              <Discussions session={session} />
            )}
            {activeTab === 'settings' && (
              <Profile 
                session={session} 
                memories={memories} 
                messages={messages} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
        <div className="glass-panel card-shadow rounded-[2.5rem] pl-28 pr-8 py-4 flex justify-between items-center relative">
          {[
            { id: 'gallery', icon: ImageIcon, label: 'Archive' },
            { id: 'home', icon: Heart, label: 'Feed' },
            { id: 'network', icon: Users, label: 'Network' },
            { id: 'wall', icon: Menu, label: 'Briefing' },
            { id: 'settings', icon: User, label: 'Profile' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === item.id ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}
            >
              <item.icon size={24} className={activeTab === item.id ? 'fill-primary/10' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              
              {item.id === 'network' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}

          <button 
            onClick={() => setShowUpload(true)}
            className="absolute left-6 -top-6 w-16 h-16 bg-black text-white rounded-[1.8rem] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={32} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showUpload && (
          <Upload 
            onUploadSuccess={() => {
              fetchMemories(session.user.id);
              setShowUpload(false);
            }} 
            onClose={() => setShowUpload(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex items-center justify-center touch-none"
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-[110]" />
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-[110]" />

            <button 
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-12 right-6 z-[120] w-12 h-12 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center text-text-main transition-colors"
            >
              <X size={24} />
            </button>

            <motion.div 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = 50;
                if (offset.x < -swipeThreshold && selectedImageIndex < memories.length - 1) {
                  setSelectedImageIndex(prev => prev + 1);
                } else if (offset.x > swipeThreshold && selectedImageIndex > 0) {
                  setSelectedImageIndex(prev => prev - 1);
                }
              }}
              key={selectedImageIndex}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full h-full flex items-center justify-center p-4 relative z-[105]"
            >
              <div className="relative w-full max-w-lg">
                {isAssetVideo(memories[selectedImageIndex].image_url) ? (
                  <video src={memories[selectedImageIndex].image_url} className="w-full h-auto max-h-[70vh] object-contain rounded-3xl shadow-2xl" controls autoPlay playsInline />
                ) : (
                  <img src={memories[selectedImageIndex].image_url} className="w-full h-auto max-h-[70vh] object-contain rounded-3xl shadow-2xl" alt="Full view" />
                )}
                
                <div className="mt-8 space-y-2 px-4">
                  <div className="flex items-center gap-3">
                    <SyndicateAvatar name={memories[selectedImageIndex].friend_name} size={32} variant="beam" />
                    <div>
                      <p className="text-sm font-extrabold tracking-tight">{memories[selectedImageIndex].friend_name || 'General'}</p>
                      <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(memories[selectedImageIndex].created_at))} ago</p>
                    </div>
                  </div>
                  <p className="text-text-main text-lg font-medium leading-relaxed italic">"{memories[selectedImageIndex].caption || 'No caption'}"</p>
                </div>
              </div>
            </motion.div>

            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 z-[120]">
              {memories.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === selectedImageIndex ? 'w-8 bg-primary' : 'w-2 bg-black/10'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl z-[60]">
          {toast.message}
        </motion.div>
      )}
    </div>
  );
};

export default App;
