import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Loader2 } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-bg-surface/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex justify-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-[0_0_20px_rgba(0,242,255,0.1)]"
          >
            <Shield className="text-primary w-12 h-12" />
          </motion.div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">
            Syndicate <span className="text-primary">Wall</span>
          </h1>
          <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
            Restricted Access Protocol
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
            <input
              type="email"
              placeholder="Email Protocol"
              required
              className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
            <input
              type="password"
              placeholder="Security Key"
              required
              className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Authenticate'}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-white/20 uppercase font-black tracking-[0.3em]">
          Syndicate Authorized Personnel Only
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
