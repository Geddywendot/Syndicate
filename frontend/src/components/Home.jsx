import React from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Heart } from 'lucide-react';

const Home = ({ memories }) => {
  const grouped = memories.reduce((acc, memory) => {
    // Priority: Group Name (if we had it) > Friend Name > General
    const name = memory.friend_name || 'General';
    if (!acc[name]) acc[name] = [];
    acc[name].push(memory);
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-32">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Collections</h1>
        <p className="text-text-muted text-sm font-medium">Capture and relive every moment</p>
      </header>

      {Object.entries(grouped).length === 0 ? (
        <div className="py-20 text-center space-y-6">
          <div className="relative w-48 h-48 mx-auto">
            <motion.div 
              animate={{ rotate: -10, y: 10 }}
              className="absolute inset-0 bg-gray-200 rounded-3xl transform -rotate-6" 
            />
            <motion.div 
              animate={{ rotate: 5, y: -5 }}
              className="absolute inset-0 bg-gray-100 rounded-3xl transform rotate-3" 
            />
            <div className="absolute inset-0 bg-white rounded-3xl border border-black/5 flex items-center justify-center shadow-sm">
              <ImageIcon size={40} className="text-gray-300" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">It starts with a collection</h3>
            <p className="text-text-muted text-sm">Create one to start sharing memories</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {Object.entries(grouped).map(([name, items]) => (
            <motion.div 
              key={name}
              whileTap={{ scale: 0.98 }}
              className="relative group cursor-pointer"
            >
              <div className="relative aspect-[4/3] w-full">
                {/* Stack Effect */}
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0 bg-white rounded-[2rem] border border-black/[0.03] card-shadow transition-transform duration-500 group-hover:translate-y-[-8px]"
                    style={{ 
                      transform: `rotate(${(i - 1) * 3}deg) translateY(${i * 2}px)`,
                      zIndex: 3 - i,
                      opacity: 1 - (i * 0.2)
                    }}
                  >
                    {i === 0 && (
                      <img 
                        src={items[0].image_url} 
                        className="w-full h-full object-cover rounded-[2rem]" 
                        alt=""
                      />
                    )}
                  </div>
                ))}
                
                <div className="absolute bottom-6 left-6 z-10 text-white drop-shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                    {items.length} Memories
                  </p>
                  <h3 className="text-2xl font-extrabold tracking-tight">{name}</h3>
                </div>

                <div className="absolute top-6 right-6 z-10">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                    <Heart size={18} className="fill-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
