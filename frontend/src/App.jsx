import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Plus, 
  Image as ImageIcon, 
  LogOut, 
  Clock, 
  Menu,
  Activity,
  User,
  Trash2,
  Handshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Auth from './components/Auth';
import Upload from './components/Upload';
import Avatar from "boring-avatars";
import { formatDistanceToNow } from 'date-fns';

const App = () => {
  const [activeTab, setActiveTab] = useState('gallery'); // Default to Gallery now
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [flashback, setFlashback] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const isAssetVideo = (url) => url?.includes('/video/') || url?.endsWith('.mp4') || url?.endsWith('.mov');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchMemories();
    fetchQuote();
    fetchMessages();

    return () => subscription.unsubscribe();
  }, []);

  const fetchQuote = async () => {
    const { data, error } = await supabase.from('quotes').select('*');
    if (!error && data?.length > 0) {
      setQuote(data[Math.floor(Math.random() * data.length)]);
    } else {
      // Fallback quote if table is empty
      setQuote({
        text: "The collective is only as strong as its memories.",
        author: "Syndicate Protocol"
      });
    }
  };

  const fetchMemories = async () => {
    const { data, error } = await supabase.from('memories').select('*').order('created_at', { ascending: false });
    if (!error) {
      const all = data || [];
      setMemories(all);
      calculateFlashback(all);
    }
  };

  const calculateFlashback = (all) => {
    if (all.length === 0) return;
    const today = new Date();
    const matches = all.filter(m => {
      const d = new Date(m.created_at);
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });
    setFlashback(matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : all[Math.floor(Math.random() * all.length)]);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setMessages(data || []);
  };

  const handleNewMessage = async (text) => {
    if (!text.trim()) return;
    
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      showToast('Session expired. Please log in.', 'error');
      return;
    }

    const friend_name = memories.find(m => m.uploaded_by === currentSession.user.id)?.friend_name || currentSession.user.email.split('@')[0];
    
    const { error } = await supabase.from('messages').insert([
      { text: text.trim(), friend_name, uploaded_by: currentSession.user.id }
    ]);

    if (!error) {
      fetchMessages();
      showToast('Message broadcasted.');
    } else {
      showToast('Security block: broadcast failed.', 'error');
    }
  };

  const handleDeleteMemory = async (id) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (!error) {
      fetchMemories();
      showToast('Memory decommissioned.');
    }
  };

  const handleDeleteMessage = async (id) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (!error) {
      fetchMessages();
      showToast('Transmission erased.');
    }
  };

  const renderHome = () => (
    <div className="space-y-8 pb-24">
      {quote && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-primary/10 border-l-4 border-primary rounded-r-2xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Intelligence</span>
          </div>
          <p className="text-xl font-medium text-white italic leading-relaxed">"{quote.text}"</p>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">— {quote.author}</p>
        </motion.div>
      )}

      {flashback && (
        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase tracking-tighter text-accent flex items-center gap-2">
            <Clock size={18} /> Flashback Protocol
          </h2>
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/5"
          >
            {isAssetVideo(flashback.image_url) ? (
              <video src={flashback.image_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={flashback.image_url} alt="Flashback" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-6">
               <p className="text-2xl font-black mb-1">{flashback.caption}</p>
               <p className="text-xs text-white/60">Stored {formatDistanceToNow(new Date(flashback.created_at))} ago</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderGallery = () => {
    const grouped = memories.reduce((acc, memory) => {
      const name = memory.friend_name || 'Unknown';
      if (!acc[name]) acc[name] = [];
      acc[name].push(memory);
      return acc;
    }, {});

    return (
      <div className="space-y-12 pb-24">
        {Object.entries(grouped).map(([name, items]) => (
          <div key={name} className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <Avatar size={32} name={name} variant="beam" colors={["#00f2ff", "#ffb800", "#ffffff"]} />
              <h3 className="font-black uppercase tracking-widest text-sm">{name}'s Archive</h3>
              <span className="ml-auto text-[10px] bg-white/5 px-2 py-1 rounded-full text-white/40">{items.length} Assets</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-2xl overflow-hidden bg-bg-surface border border-white/5 ${idx % 3 === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                >
                  {isAssetVideo(item.image_url) ? (
                    <video 
                      src={item.image_url} 
                      className="w-full h-full object-cover" 
                      muted 
                      loop 
                      autoPlay 
                      playsInline
                      onClick={() => setSelectedImageIndex(memories.findIndex(m => m.id === item.id))}
                    />
                  ) : (
                    <img 
                      src={item.image_url} 
                      className="w-full h-full object-cover" 
                      onClick={() => setSelectedImageIndex(memories.findIndex(m => m.id === item.id))}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                  
                  {item.uploaded_by === session?.user?.id && (
                    <button 
                      onClick={() => handleDeleteMemory(item.id)}
                      className="absolute top-3 right-3 p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all border border-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWall = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-bg-surface p-4 rounded-3xl border border-white/5">
        <textarea 
          placeholder="What's on your mind?"
          className="w-full bg-transparent border-none outline-none resize-none min-h-[100px] text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (e.target.value.trim()) {
                handleNewMessage(e.target.value);
                e.target.value = '';
              }
            }
          }}
        />
        <div className="flex justify-end mt-2">
          <p className="text-[10px] text-white/20 uppercase font-bold">Press Enter to Broadcast</p>
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={msg.id}
            className="p-5 bg-bg-surface/50 border border-white/5 rounded-3xl flex gap-4"
          >
            <Avatar size={40} name={msg.friend_name} variant="beam" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase text-primary">{msg.friend_name}</span>
                <span className="text-[9px] text-white/20">• {formatDistanceToNow(new Date(msg.created_at))} ago</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{msg.text}</p>
            </div>
            {msg.uploaded_by === session?.user?.id && (
              <button 
                onClick={() => handleDeleteMessage(msg.id)}
                className="self-start p-2 text-white/10 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => {
    const myMemories = memories.filter(m => m.uploaded_by === session?.user?.id);
    return (
      <div className="space-y-8 pb-24">
        <div className="flex flex-col items-center py-8 space-y-4">
          <Avatar size={100} name={session?.user?.email} variant="beam" />
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">{session?.user?.email.split('@')[0]}</h2>
            <p className="text-xs text-white/30 uppercase tracking-[0.2em] mt-1">Syndicate Agent</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-surface p-6 rounded-3xl border border-white/5 text-center">
            <p className="text-[10px] text-white/30 uppercase font-black mb-1">Uploads</p>
            <p className="text-2xl font-black text-primary">{myMemories.length}</p>
          </div>
          <div className="bg-bg-surface p-6 rounded-3xl border border-white/5 text-center">
            <p className="text-[10px] text-white/30 uppercase font-black mb-1">Messages</p>
            <p className="text-2xl font-black text-accent">{messages.filter(m => m.uploaded_by === session?.user?.id).length}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/20 px-2">Your Archive</h3>
          <div className="grid grid-cols-3 gap-2">
            {myMemories.map(m => (
              <div key={m.id} className="aspect-square rounded-xl overflow-hidden border border-white/5 bg-bg-surface">
                <img src={m.image_url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all"
        >
          Deactivate Session
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }}>
          <Handshake className="text-primary w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-bg-deep text-white selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg-deep/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake className="text-primary w-5 h-5" />
            <span className="font-black uppercase tracking-tighter text-lg">Syndicate</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-20 px-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'gallery' && renderGallery()}
            {activeTab === 'wall' && renderWall()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-surface/80 backdrop-blur-2xl border-t border-white/5 pb-8 pt-4 px-6">
        <div className="max-lg mx-auto flex justify-between items-center px-4">
          {[
            { id: 'gallery', icon: ImageIcon, label: 'Gallery' },
            { id: 'home', icon: Handshake, label: 'Home' },
            { id: 'wall', icon: Menu, label: 'Wall' },
            { id: 'settings', icon: User, label: 'Profile' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === item.id ? 'text-primary' : 'text-white/20'}`}
            >
              <item.icon size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {isModalOpen && <Upload onClose={() => setIsModalOpen(false)} onUploadSuccess={fetchMemories} />}
      
      {/* Lightbox / Swipe Gallery */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-none"
          >
            <button 
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-12 right-6 z-[110] w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md"
            >
              <Plus className="rotate-45" size={24} />
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
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full h-full flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-lg aspect-[3/4]">
                {isAssetVideo(memories[selectedImageIndex].image_url) ? (
                  <video 
                    src={memories[selectedImageIndex].image_url} 
                    className="w-full h-full object-contain rounded-2xl" 
                    controls 
                    autoPlay 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={memories[selectedImageIndex].image_url} 
                    className="w-full h-full object-contain rounded-2xl"
                    alt="Full view"
                  />
                )}
                <div className="absolute bottom-[-60px] left-0 right-0 text-center">
                  <p className="text-white font-black uppercase tracking-widest text-sm mb-1">
                    {memories[selectedImageIndex].friend_name}
                  </p>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {formatDistanceToNow(new Date(memories[selectedImageIndex].created_at))} ago
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Pagination Indicator */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
              {memories.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${i === selectedImageIndex ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`} 
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-primary px-6 py-3 rounded-full text-black text-xs font-black uppercase">
          {toast.message}
        </motion.div>
      )}
    </div>
  );
};

export default App;

