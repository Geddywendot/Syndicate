import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  ImageIcon, 
  Heart, 
  ChevronLeft, 
  Camera,
  Mail,
  Shield,
  Cloud,
  Check,
  Loader2,
  Plus
} from 'lucide-react';
import SyndicateAvatar from './SyndicateAvatar';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

const Profile = ({ session, memories, messages }) => {
  const [subPage, setSubPage] = useState(null); 
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: fullName,
        avatar_url: avatarUrl
      }
    });
    if (!error) {
      setSubPage(null);
    }
    setUpdating(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // Upload to Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
      
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAvatarUrl(data.secure_url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const renderSubPage = () => {
    switch (subPage) {
      case 'edit':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <header className="flex items-center gap-4">
              <button onClick={() => setSubPage(null)} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Edit Profile</h2>
            </header>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl border border-black/[0.03] overflow-hidden ${uploadingAvatar ? 'opacity-50' : ''}`}>
                    <SyndicateAvatar src={avatarUrl} name={session?.user?.email} size={116} className="rounded-[2rem]" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-[2.5rem] backdrop-blur-sm">
                    <Camera className="text-white" size={24} />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="text-primary animate-spin" size={24} />
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </div>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Click to change picture</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-6 py-4 bg-white border border-black/[0.03] rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-medium"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2">Email (Read Only)</label>
                  <input 
                    type="email" 
                    value={session?.user?.email}
                    disabled
                    className="w-full px-6 py-4 bg-black/[0.02] border border-black/[0.01] rounded-2xl outline-none font-medium text-text-muted"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={updating || uploadingAvatar}
                className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary transition-all shadow-xl"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        );

      case 'info':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <header className="flex items-center gap-4">
              <button onClick={() => setSubPage(null)} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Account Info</h2>
            </header>
            <div className="bg-white rounded-[2.5rem] border border-black/[0.03] card-shadow overflow-hidden divide-y divide-black/[0.03]">
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Mail size={18} className="text-text-muted" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <span className="text-sm font-bold">{session?.user?.email}</span>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <User size={18} className="text-text-muted" />
                  <span className="text-sm font-medium">Display Name</span>
                </div>
                <span className="text-sm font-bold">{fullName}</span>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield size={18} className="text-text-muted" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-500/5 px-3 py-1 rounded-full uppercase tracking-widest">Active Member</span>
              </div>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <header className="flex items-center gap-4">
              <button onClick={() => setSubPage(null)} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Security</h2>
            </header>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[2rem] border border-black/[0.03] card-shadow flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold">Two-Factor Auth</p>
                  <p className="text-xs text-text-muted">Enhance your space's security</p>
                </div>
                <div className="w-12 h-6 bg-black/10 rounded-full relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-black/[0.03] card-shadow flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold">Encrypted Archive</p>
                  <p className="text-xs text-text-muted">AES-256 Memory Encryption</p>
                </div>
                <Check className="text-green-500" size={20} />
              </div>
            </div>
          </motion.div>
        );

      case 'network':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <header className="flex items-center gap-4">
              <button onClick={() => setSubPage(null)} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Syndicate Network</h2>
            </header>
            <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 space-y-4">
              <Heart className="text-primary" size={32} />
              <div className="space-y-2">
                <p className="text-lg font-bold">Global Transmission</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  The Syndicate uses a decentralized relay system to ensure your memories are shared safely with your chosen circles.
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'storage':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <header className="flex items-center gap-4">
              <button onClick={() => setSubPage(null)} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Cloud Storage</h2>
            </header>
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-black/[0.03] card-shadow space-y-6">
                <div className="flex items-center justify-between">
                  <Cloud className="text-primary" size={28} />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Unlimited Plan</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[15%]" />
                  </div>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                    1.2 GB of Unlimited used
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex flex-col items-center py-12 space-y-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-[3rem] bg-white p-1.5 shadow-2xl border border-black/[0.03]">
                  <SyndicateAvatar src={avatarUrl} name={session?.user?.email} size={116} className="rounded-[2.5rem]" />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white border-4 border-bg-deep shadow-xl"
                >
                  <Heart size={24} fill="currentColor" />
                </motion.div>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-text-main">{fullName || session?.user?.email.split('@')[0]}</h2>
                <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Syndicate Elite Member</p>
              </div>
              <button 
                onClick={() => setSubPage('edit')} 
                className="px-10 py-4 bg-black text-white rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-primary/20"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Memories', value: memories.filter(m => m.uploaded_by === session?.user?.id).length },
                { label: 'Messages', value: messages.filter(m => m.uploaded_by === session?.user?.id).length },
                { label: 'Trust', value: '100%' }
              ].map(stat => (
                <div key={stat.label} className="bg-white/50 backdrop-blur-sm p-5 rounded-[2.5rem] border border-white card-shadow text-center">
                  <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl font-extrabold text-text-main">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted px-4">Workspace Settings</h3>
              <div className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-white card-shadow overflow-hidden">
                {[
                  { id: 'info', label: 'Account Information', icon: User },
                  { id: 'security', label: 'Security & Privacy', icon: Lock },
                  { id: 'network', label: 'Global Network', icon: Heart },
                  { id: 'storage', label: 'Cloud Storage', icon: ImageIcon }
                ].map((item, idx) => (
                  <button 
                    key={item.id}
                    onClick={() => setSubPage(item.id)}
                    className={`w-full flex items-center justify-between p-7 hover:bg-black/[0.02] transition-colors group ${idx !== 3 ? 'border-b border-black/[0.01]' : ''}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center text-text-main group-hover:bg-primary group-hover:text-white transition-all">
                        <item.icon size={20} />
                      </div>
                      <span className="text-sm font-bold tracking-tight text-text-main">{item.label}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-black/[0.02] flex items-center justify-center">
                      <Plus className="rotate-45 text-text-muted" size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full py-6 bg-red-50 text-red-500 border border-red-100 rounded-[2.5rem] font-bold uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all card-shadow mt-8"
            >
              Deactivate Session
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="pb-32">
      <AnimatePresence mode="wait">
        {renderSubPage()}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
