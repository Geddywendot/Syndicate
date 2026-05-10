import React, { useState, useRef, useEffect } from 'react';
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
  User,
  Heart,
  Shield
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const Upload = ({ onUploadSuccess, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('idle'); 
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(name)')
      .eq('user_id', user.id);
    
    setGroups(data || []);
  };

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
      if (caption.length > 1000) {
        throw new Error('Caption must be 1000 characters or less.');
      }

      // Strict MIME type validation
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');

      if (!isImage && !isVideo) {
        throw new Error('Invalid file type. Only images and videos are allowed.');
      }
      
      if (isImage && !allowedImageTypes.includes(file.type)) {
        throw new Error('Invalid image format. Use JPEG, PNG, WEBP, or GIF.');
      }

      if (isVideo && !allowedVideoTypes.includes(file.type)) {
        throw new Error('Invalid video format. Use MP4, MOV, or WEBM.');
      }

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

      const limit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (fileToUpload.size > limit) {
        throw new Error(`File too large. Max: ${isVideo ? '100MB' : '10MB'}`);
      }

      setStatus('uploading');
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_CLOUDINARY_API_KEY is missing from environment variables');
      }

      let uploadResult;
      
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

      if (isVideo && fileToUpload.size > 5 * 1024 * 1024) {
        const chunkSize = 5 * 1024 * 1024;
        const totalChunks = Math.ceil(fileToUpload.size / chunkSize);
        const uniqueUploadId = `id_${Date.now()}`;
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, fileToUpload.size);
          const chunk = fileToUpload.slice(start, end);
          
          const formData = new FormData();
          formData.append('file', chunk);
          formData.append('api_key', apiKey);
          formData.append('timestamp', timestamp);
          formData.append('signature', signature);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
            {
              method: 'POST',
              body: formData,
              headers: {
                'X-Unique-Upload-Id': uniqueUploadId,
                'Content-Range': `bytes ${start}-${end - 1}/${fileToUpload.size}`
              }
            }
          );

          if (!res.ok) throw new Error('Chunked upload failed');
          if (i === totalChunks - 1) uploadResult = await res.json();
        }
      } else {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          { method: 'POST', body: formData }
        );

        if (!res.ok) throw new Error('Upload failed');
        uploadResult = await res.json();
      }

      const imageUrl = uploadResult.secure_url;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('memories').insert([
        {
          image_url: imageUrl,
          caption: caption,
          uploaded_by: user?.id,
          group_id: selectedGroupId || null
        }
      ]);

      if (dbError) throw dbError;

      setStatus('success');
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-bg-deep rounded-[3rem] overflow-hidden shadow-2xl border border-white"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-text-muted hover:text-text-main transition-colors z-20 w-10 h-10 bg-white rounded-full flex items-center justify-center card-shadow border border-black/[0.03]"
        >
          <X size={20} />
        </button>

        <div className="p-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <UploadCloud size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Share a Moment</h2>
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Share with your friends</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-video rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center bg-white group ${preview ? 'border-primary' : 'border-black/[0.05] hover:border-primary/50'}`}
            >
              {preview ? (
                <>
                  {file?.type.startsWith('video') ? (
                    <video src={preview} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-bold uppercase tracking-widest text-xs">Change Media</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-bg-deep flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <ImageIcon className="text-text-muted w-8 h-8 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-text-main font-bold">Select Media</p>
                    <p className="text-text-muted text-xs font-medium">Drag & Drop or Click to browse</p>
                  </div>
                </div>
              )}
              <label htmlFor="mediaFile" className="sr-only">Select Media File</label>
              <input id="mediaFile" name="mediaFile" ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </div>

            <div className="grid grid-cols-1 gap-4">              {groups.length > 0 && (
                <div className="relative group">
                  <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
                  <label htmlFor="groupId" className="sr-only">Group</label>
                  <select
                    id="groupId"
                    name="groupId"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-black/[0.03] rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium text-sm card-shadow appearance-none"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">Private Archive (No Group)</option>
                    {groups.map(g => (
                      <option key={g.group_id} value={g.group_id}>{g.groups.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative group">
                <Hash className="absolute left-5 top-6 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
                <label htmlFor="storyCaption" className="sr-only">Story Caption</label>
                <textarea
                  id="storyCaption"
                  name="storyCaption"
                  placeholder="Tell the story..."
                  className="w-full pl-14 pr-6 py-6 bg-white border border-black/[0.03] rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium text-sm card-shadow min-h-[120px] resize-none"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={!file || uploading}
              className={`w-full py-5 rounded-2xl font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${status === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-black text-white hover:bg-primary hover:shadow-primary/20 disabled:opacity-20'
                }`}
            >
              {status === 'idle' && (
                <>
                  <span>Post Moment</span>
                  <Heart size={18} />
                </>
              )}
              {status === 'uploading' && (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Sharing...</span>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Shared!</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span>Failed to share</span>
                </>
              )}
            </button>

            {error && (
              <p className="text-accent text-center text-[10px] font-bold uppercase tracking-[0.2em]">{error}</p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Upload;
