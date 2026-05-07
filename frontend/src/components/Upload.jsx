import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  X,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  User
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const Upload = ({ onUploadSuccess, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [friendName, setFriendName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus('uploading');
    setError(null);

    try {
      const isVideo = file.type.startsWith('video');
      const resourceType = isVideo ? 'video' : 'image';
      let fileToUpload = file;

    if (!isVideo) {
        setStatus('compressing');
        const options = {
          maxSizeMB: 5,
          maxWidthOrHeight: 2048,
          useWebWorker: true
        };
        
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (err) {
          console.warn('Compression failed, trying original file:', err);
        }
      }

      // Final check for Cloudinary's 10MB limit (videos can be larger on some plans, but we'll stick to 10MB for free tier safety)
      if (fileToUpload.size > 10 * 1024 * 1024) {
        throw new Error('File is too large. Maximum is 10MB.');
      }

      setStatus('uploading');
      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Cloudinary Cloud Name missing');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed');
      }

      const { secure_url } = await res.json();

      // 2. Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('memories').insert([
        {
          image_url: secure_url,
          caption: caption,
          uploaded_by: user?.id,
          friend_name: friendName
        }
      ]);

      if (dbError) throw dbError;

      setStatus('success');
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Upload process failed:', err);
      setError(err.message);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl bg-bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header Decor */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors z-20"
        >
          <X size={24} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <UploadCloud className="text-primary w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Secure Upload</h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Protocol: Encrypted Memory Transfer</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center group ${preview ? 'border-primary/50' : 'border-white/5 hover:border-primary/30 hover:bg-white/5'
                }`}
            >
              {preview ? (
                <>
                  {file?.type.startsWith('video') ? (
                    <video src={preview} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold uppercase tracking-widest text-xs">Change Asset</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="text-white/20 w-8 h-8 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 font-bold">Select Visual Data</p>
                    <p className="text-white/30 text-xs">Images or Videos up to 10MB</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
              <input
                type="text"
                placeholder="Agent Name (Friend Name)"
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
              />
            </div>

            <div className="relative">
              <Hash className="absolute left-4 top-4 text-white/20 w-5 h-5" />
              <textarea
                placeholder="Intelligence caption... #metadata"
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all min-h-[120px] resize-none"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <button
              disabled={!file || uploading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${status === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-black hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] disabled:opacity-30 disabled:grayscale'
                }`}
            >
              {status === 'idle' && (
                <>
                  <span>Initiate Transfer</span>
                </>
              )}
              {status === 'uploading' && (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Processing...</span>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Secured</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span>Transfer Failed</span>
                </>
              )}
            </button>

            {error && (
              <p className="text-red-400 text-center text-xs font-bold uppercase tracking-widest">{error}</p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Upload;
