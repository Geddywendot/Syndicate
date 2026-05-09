import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, Loader2, Heart, UserPlus, LogIn, User } from 'lucide-react';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
            }
          }
        });
        if (error) throw error;
        setSuccess('Account created! You can now log in.');
        setIsRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          console.error('Supabase Auth Error:', error);
          throw error;
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Catch Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-10 rounded-[3rem] card-shadow relative z-10 border border-white"
      >
        <div className="flex justify-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20"
          >
            <Heart size={32} className="fill-white/20" />
          </motion.div>
        </div>

        <div className="text-center mb-10 space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-text-main">
            Syndicate
          </h1>
          <p className="text-text-muted text-sm font-semibold uppercase tracking-[0.2em]">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-accent/5 border border-accent/10 rounded-2xl text-accent text-xs font-bold text-center"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-green-600 text-xs font-bold text-center"
          >
            {success}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="w-full pl-14 pr-6 py-5 bg-black/[0.03] border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-main"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                required
                className="w-full pl-14 pr-6 py-5 bg-black/[0.03] border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-main"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full pl-14 pr-6 py-5 bg-black/[0.03] border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-main"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-black text-white font-bold rounded-[1.5rem] hover:bg-primary transition-all flex items-center justify-center gap-3 text-sm mt-4 shadow-xl shadow-black/10 hover:shadow-primary/20"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                <span>{isRegistering ? 'Join the Syndicate' : 'Enter Space'}</span>
                {isRegistering ? <UserPlus size={16} /> : <LogIn size={16} />}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {isRegistering ? (
              <>
                <LogIn size={14} />
                <span>Already a member? Log in</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>New here? Register a new account</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-black/[0.03] text-center">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            Syndicate Space v4.2 • Public Access Enabled
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
