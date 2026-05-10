import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image as ImageIcon, Trash2, Edit2, X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SyndicateAvatar from './SyndicateAvatar';
import { formatDistanceToNow } from 'date-fns';

const PrivateChat = ({ session, friend, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sorting IDs to create a consistent unique DM group name
  const sortedIds = [session.user.id, friend.profiles.id].sort();
  const dmGroupName = `DM_${sortedIds[0]}_${sortedIds[1]}`;

  useEffect(() => {
    let channel;
    
    const setup = async () => {
      setLoading(false);
      await fetchMessages();
      
      // Ensure we remove any existing channel with this name first
      const channelName = `dm-${dmGroupName}`;
      await supabase.removeChannel(supabase.channel(channelName));

      // Subscribe to new messages
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `group_id=is.null`
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
      .is('group_id', null)
      .like('text', `[${dmGroupName}]%`)
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true });
      
    setMessages(data || []);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !editingMsgId) return;
    
    if (editingMsgId) {
      await supabase
        .from('messages')
        .update({ text: `[${dmGroupName}]${inputText}` })
        .eq('id', editingMsgId)
        .eq('uploaded_by', session.user.id);
      setEditingMsgId(null);
    } else {
      await supabase.from('messages').insert([{ 
        text: `[${dmGroupName}]${inputText}`, 
        uploaded_by: session.user.id, 
        friend_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        group_id: null
      }]);
    }
    
    setInputText('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Cloudinary upload
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_CLOUDINARY_API_KEY is missing from environment variables');
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
      };

      // Fetch signature from Edge Function
      const { data: signData, error: signError } = await supabase.functions.invoke('cloudinary-sign', {
        body: { paramsToSign }
      });

      if (signError || !signData?.signature) {
        throw new Error('Failed to generate upload signature');
      }

      const { signature } = signData;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      // Save image URL as a special message format
      await supabase.from('messages').insert([{ 
        text: `[${dmGroupName}][IMAGE_URL:${data.secure_url}]`, 
        uploaded_by: session.user.id, 
        friend_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        group_id: null
      }]);
    } catch (err) {
      console.error('Image upload failed', err);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('messages').delete().eq('id', id).eq('uploaded_by', session.user.id);
  };

  const handleEdit = (msg) => {
    const rawText = msg.text.replace(`[${dmGroupName}]`, '');
    if (rawText.startsWith('[IMAGE_URL:')) return;
    setEditingMsgId(msg.id);
    setInputText(rawText);
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setInputText('');
  };

  const renderMessageContent = (text) => {
    const rawText = text.replace(`[${dmGroupName}]`, '');
    if (rawText.startsWith('[IMAGE_URL:') && rawText.endsWith(']')) {
      const url = rawText.replace('[IMAGE_URL:', '').replace(']', '');
      return <img src={url} alt="Sent image" className="max-w-[200px] rounded-xl shadow-md" />;
    }
    return <span className="break-words">{rawText}</span>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col"
    >
      <header className="flex items-center gap-4 p-4 border-b border-black/[0.03]">
        <button onClick={onClose} className="p-2 bg-black/5 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <SyndicateAvatar src={friend.profiles.avatar_url} name={friend.profiles.full_name} size={40} />
        <div className="flex-1">
          <h3 className="font-bold">{friend.profiles.full_name || friend.profiles.email.split('@')[0]}</h3>
          <p className="text-[10px] text-primary flex items-center gap-1 font-bold uppercase tracking-widest">
            <Clock size={10} /> Secure 24h DM
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/[0.02]">
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-pulse w-8 h-8 rounded-full bg-primary/20" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-text-muted mt-20">
            <Clock size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Messages will self-destruct after 24 hours.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.uploaded_by === session.user.id;
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 group">
                  {!isMe && <SyndicateAvatar name={msg.friend_name} size={24} />}
                  <div className={`p-3 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-black/[0.03] shadow-sm rounded-bl-sm'}`}>
                    {renderMessageContent(msg.text)}
                  </div>
                  {isMe && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pb-1">
                      {!msg.text.replace(`[${dmGroupName}]`, '').startsWith('[IMAGE_URL:') && (
                        <button onClick={() => handleEdit(msg)} className="p-1 text-text-muted hover:text-blue-500"><Edit2 size={12} /></button>
                      )}
                      <button onClick={() => handleDelete(msg.id)} className="p-1 text-text-muted hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-text-muted mt-1 opacity-50 px-8">
                  {formatDistanceToNow(new Date(msg.created_at))} ago
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-black/[0.03] space-y-2">
        {editingMsgId && (
          <div className="flex justify-between items-center text-xs text-blue-500 bg-blue-50 p-2 rounded-lg">
            <span>Editing message...</span>
            <button onClick={cancelEdit}><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-black/[0.03] text-text-muted rounded-full hover:bg-black/[0.08] transition-colors">
            <ImageIcon size={20} />
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a disappearing message..."
            className="flex-1 p-4 bg-black/[0.03] border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-primary/20 transition-all font-medium text-sm"
          />
          <button onClick={handleSend} disabled={!inputText.trim()} className="p-4 bg-primary text-white rounded-full disabled:opacity-50 disabled:bg-black/20 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
            <Send size={20} className={inputText.trim() ? "translate-x-0.5" : ""} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PrivateChat;
