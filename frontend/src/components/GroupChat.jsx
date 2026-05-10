import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image as ImageIcon, Trash2, Edit2, X, Clock, UserPlus, Users, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SyndicateAvatar from './SyndicateAvatar';
import { formatDistanceToNow } from 'date-fns';

const GroupChat = ({ session, group, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let channel;
    
    const setup = async () => {
      setLoading(false);
      await fetchMessages();
      await fetchMembers();
      
      const channelName = `group-${group.id}`;
      await supabase.removeChannel(supabase.channel(channelName));

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `group_id=eq.${group.id}`
        }, () => {
          fetchMessages();
        })
        .subscribe();
    };
    
    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', group.id)
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true });
      
    setMessages(data || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id);
    
    setGroupMembers(data?.map(m => m.user_id) || []);
  };

  const fetchFriendsToInvite = async () => {
    // Refresh group members first to ensure filter is accurate
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id);
    
    const currentMemberIds = memberData?.map(m => m.user_id) || [];
    setGroupMembers(currentMemberIds);

    const { data: followsData1 } = await supabase
      .from('follows')
      .select('*, profiles!follows_following_id_fkey(*)')
      .eq('follower_id', session.user.id)
      .eq('status', 'accepted');
      
    const { data: followsData2 } = await supabase
      .from('follows')
      .select('*, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', session.user.id)
      .eq('status', 'accepted');
      
    const allFriends = [...(followsData1 || []), ...(followsData2 || [])];
    const uniqueFriends = [];
    const seen = new Set();
    allFriends.forEach(f => {
      if (f.profiles && !seen.has(f.profiles.id)) {
        seen.add(f.profiles.id);
        uniqueFriends.push(f);
      }
    });
    setFriends(uniqueFriends.filter(f => !currentMemberIds.includes(f.profiles.id)));
  };

  const handleInvite = async (userId) => {
    // We use the edge function to bypass RLS and securely verify admin rights
    const { data, error } = await supabase.functions.invoke('add-group-member', {
      body: {
        group_id: group.id,
        user_id: userId,
        admin_id: session.user.id
      }
    });

    if (!error) {
      setGroupMembers([...groupMembers, userId]);
      setFriends(friends.filter(f => f.profiles.id !== userId));
    } else {
      console.error(error);
      alert("Error adding member. Ensure the add-group-member edge function is deployed.");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this circle?')) return;
    
    const { error } = await supabase.functions.invoke('leave-group', {
      body: {
        group_id: group.id,
        user_id: session.user.id
      }
    });

    if (!error) {
      onClose(); // Parent component will refetch groups when modal closes or eventually
      // To immediately reflect it, we can trigger a reload.
      window.location.reload(); 
    } else {
      console.error(error);
      alert("Error leaving group.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to permanently delete this circle? This cannot be undone.')) return;

    const { error } = await supabase.functions.invoke('delete-group', {
      body: {
        group_id: group.id,
        admin_id: session.user.id
      }
    });

    if (!error) {
      onClose();
      window.location.reload();
    } else {
      console.error(error);
      alert("Error deleting group.");
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !editingMsgId) return;
    
    if (editingMsgId) {
      await supabase
        .from('messages')
        .update({ text: inputText })
        .eq('id', editingMsgId)
        .eq('uploaded_by', session.user.id);
      setEditingMsgId(null);
    } else {
      await supabase.from('messages').insert([{ 
        text: inputText, 
        uploaded_by: session.user.id, 
        friend_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        group_id: group.id
      }]);
    }
    
    setInputText('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_CLOUDINARY_API_KEY is missing');
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const { data: signData, error: signError } = await supabase.functions.invoke('cloudinary-sign', {
        body: { paramsToSign: { timestamp } }
      });

      if (signError || !signData?.signature) throw new Error('Failed signature');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signData.signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      await supabase.from('messages').insert([{ 
        text: `[IMAGE_URL:${data.secure_url}]`, 
        uploaded_by: session.user.id, 
        friend_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        group_id: group.id
      }]);
    } catch (err) {
      console.error('Image upload failed', err);
      alert('Failed to upload image');
    }
  };

  const handleEdit = (msg) => {
    if (msg.text.startsWith('[IMAGE_URL:')) return;
    setEditingMsgId(msg.id);
    setInputText(msg.text);
  };

  const handleDelete = async (id) => {
    await supabase.from('messages').delete().eq('id', id).eq('uploaded_by', session.user.id);
  };

  const renderMessageContent = (text) => {
    if (text.startsWith('[IMAGE_URL:') && text.endsWith(']')) {
      const url = text.replace('[IMAGE_URL:', '').replace(']', '');
      return <img src={url} alt="Sent" className="max-w-[200px] rounded-xl shadow-md" />;
    }
    return <span className="break-words">{text}</span>;
  };

  const isAdmin = group.created_by === session.user.id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col md:relative md:h-[600px] md:w-[400px] md:mx-auto md:rounded-[3rem] md:shadow-2xl md:border md:border-black/[0.03] overflow-hidden"
    >
      {/* Header */}
      <div className="h-20 border-b border-black/[0.03] flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center text-black/40">
              <Users size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm">{group.name}</h2>
              <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                <Clock size={10} /> 24H Auto-Delete
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => {
                setShowAddMember(true);
                fetchFriendsToInvite();
              }}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
              title="Add Member"
            >
              <UserPlus size={20} />
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={handleDeleteGroup}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
              title="Delete Circle"
            >
              <Trash2 size={20} />
            </button>
          )}
          {!isAdmin && (
            <button 
              onClick={handleLeaveGroup}
              className="p-2 text-text-muted hover:bg-black/5 rounded-full transition-colors"
              title="Leave Circle"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg-deep relative">
        {messages.map((msg, idx) => {
          const isMe = msg.uploaded_by === session.user.id;
          const showName = !isMe && (idx === 0 || messages[idx - 1].uploaded_by !== msg.uploaded_by);
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] group ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1 ml-1">{msg.friend_name}</p>
                )}
                <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-4 rounded-2xl relative ${
                    msg.text.startsWith('[IMAGE_URL:') 
                      ? 'bg-transparent p-0' 
                      : isMe 
                        ? 'bg-primary text-white rounded-tr-sm' 
                        : 'bg-white text-text-main border border-black/[0.03] card-shadow rounded-tl-sm'
                  }`}>
                    <p className="text-sm font-medium">{renderMessageContent(msg.text)}</p>
                  </div>
                  {isMe && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pb-1">
                      {!msg.text.startsWith('[IMAGE_URL:') && (
                        <button onClick={() => handleEdit(msg)} className="p-1 text-text-muted hover:text-blue-500"><Edit2 size={12} /></button>
                      )}
                      <button onClick={() => handleDelete(msg.id)} className="p-1 text-text-muted hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-black/[0.03] shrink-0">
        {editingMsgId && (
          <div className="flex items-center justify-between mb-2 text-xs text-primary font-bold bg-primary/5 p-2 rounded-lg">
            <span>Editing message...</span>
            <button onClick={() => { setEditingMsgId(null); setInputText(''); }}><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-text-muted">
            <ImageIcon size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Secure transmission..."
            className="flex-1 bg-black/[0.03] border-none rounded-full px-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() && !editingMsgId}
            className="p-3 bg-primary text-white rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-lg">Add Members</h3>
                <button onClick={() => setShowAddMember(false)} className="p-2"><X size={20}/></button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {friends.length === 0 ? (
                  <p className="text-center text-xs text-text-muted py-4">No eligible friends to invite.</p>
                ) : (
                  friends.map(f => (
                    <div key={f.profiles.id} className="flex justify-between items-center p-2 hover:bg-black/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <SyndicateAvatar src={f.profiles.avatar_url} name={f.profiles.full_name} size={32} />
                        <span className="text-sm font-bold">{f.profiles.full_name}</span>
                      </div>
                      <button onClick={() => handleInvite(f.profiles.id)} className="text-xs bg-black text-white px-3 py-1.5 rounded-full font-bold">Invite</button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GroupChat;
