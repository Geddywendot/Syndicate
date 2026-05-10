import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';

const Gallery = ({ memories, session, setSelectedImageIndex, handleDeleteMemory, galleryFilter, setGalleryFilter, isAssetVideo, hasMore, loadMore }) => {
  const filteredMemories = galleryFilter === 'All' 
    ? memories 
    : memories.filter(m => {
        const date = new Date(m.created_at);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) === galleryFilter;
      });

  const categories = ['All', ...new Set(memories.map(m => {
    const date = new Date(m.created_at);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }))];

  return (
    <div className="space-y-8 pb-32">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Archive</h1>
          <p className="text-text-muted text-sm font-medium">Browse your collective history</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setGalleryFilter(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${galleryFilter === cat ? 'bg-black text-white shadow-lg' : 'bg-white text-text-muted border border-black/[0.03] card-shadow'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="columns-2 gap-4 space-y-4">
        {filteredMemories.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileTap={{ scale: 0.98 }}
            className="relative break-inside-avoid rounded-3xl overflow-hidden bg-white border border-black/[0.03] card-shadow cursor-pointer group"
            onClick={() => setSelectedImageIndex(memories.findIndex(m => m.id === item.id))}
          >
            {isAssetVideo(item.image_url) ? (
              <video src={item.image_url} className="w-full h-auto object-cover" muted />
            ) : (
              <img 
                src={optimizeCloudinaryUrl(item.image_url, { width: 400, quality: 'auto' })} 
                className="w-full h-auto object-cover" 
                alt="" 
                loading="lazy"
              />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-xs text-white font-bold truncate">{item.caption || 'No caption'}</p>
            </div>

            {item.uploaded_by === session?.user?.id && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMemory(item.id);
                }}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <button 
          onClick={loadMore}
          className="w-full py-6 bg-white border border-black/[0.03] rounded-[2.5rem] card-shadow text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main transition-colors mt-8"
        >
          Load More Memories
        </button>
      )}
    </div>
  );
};

export default Gallery;
