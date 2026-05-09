import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import SyndicateAvatar from './SyndicateAvatar';
import { formatDistanceToNow } from 'date-fns';

const Wall = ({ messages, session, handleNewMessage, handleDeleteMessage }) => {
  return (
    <div className="space-y-8 pb-32">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Activity</h1>
        <p className="text-text-muted text-sm font-medium">Global broadcast network</p>
      </header>

      <div className="glass-panel p-6 rounded-[2rem] card-shadow border border-white">
        <textarea 
          placeholder="Broadcast a message to the syndicate..."
          className="w-full bg-transparent border-none outline-none resize-none min-h-[80px] text-sm font-medium placeholder:text-text-muted/50 text-text-main"
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
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/[0.03]">
          <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Shift + Enter for new line</p>
          <div className="flex gap-2">
            <span className="text-[10px] text-primary font-bold tracking-widest">Live</span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={msg.id}
            className="p-5 bg-white border border-black/[0.03] rounded-[2rem] card-shadow flex gap-4 group"
          >
            <div className="relative">
              <SyndicateAvatar name={msg.friend_name} size={44} variant="beam" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary border-2 border-white rounded-full" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight">{msg.friend_name}</span>
                  <span className="text-[10px] text-text-muted font-bold">• {formatDistanceToNow(new Date(msg.created_at))} ago</span>
                </div>
                {msg.uploaded_by === session?.user?.id && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-2 text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-text-main/80 leading-relaxed font-medium">{msg.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Wall;
