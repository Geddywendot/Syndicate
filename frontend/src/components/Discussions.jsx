import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  TrendingUp, 
  Globe, 
  Briefcase, 
  ShieldAlert, 
  Plus, 
  ChevronRight, 
  Search,
  MessageCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SyndicateAvatar from './SyndicateAvatar';
import { formatDistanceToNow } from 'date-fns';

const categories = [
  { id: 'all', label: 'All Intel', icon: Globe, color: 'bg-black' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'bg-blue-500' },
  { id: 'finance', label: 'Finance', icon: Briefcase, color: 'bg-emerald-500' },
  { id: 'politics', label: 'Frontline', icon: ShieldAlert, color: 'bg-rose-500' },
  { id: 'tech', label: 'Ops/Tech', icon: TrendingUp, color: 'bg-amber-500' }
];

const Discussions = ({ session }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchDiscussions();
  }, [activeCategory]);

  useEffect(() => {
    if (selectedDiscussion) {
      fetchComments(selectedDiscussion.id);
    }
  }, [selectedDiscussion]);

  const fetchDiscussions = async () => {
    setLoading(true);
    let query = supabase
      .from('discussions')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory);
    }

    const { data, error } = await query;
    if (!error) setDiscussions(data || []);
    setLoading(false);
  };

  const fetchComments = async (discussionId) => {
    const { data, error } = await supabase
      .from('discussion_comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });
    
    if (!error) setComments(data || []);
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) return;

    const { error } = await supabase.from('discussions').insert([{
      ...newDiscussion,
      user_id: session.user.id
    }]);

    if (!error) {
      setNewDiscussion({ title: '', content: '', category: 'general' });
      setShowCreate(false);
      fetchDiscussions();
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedDiscussion) return;

    const { error } = await supabase.from('discussion_comments').insert([{
      content: newComment,
      discussion_id: selectedDiscussion.id,
      user_id: session.user.id
    }]);

    if (!error) {
      setNewComment('');
      fetchComments(selectedDiscussion.id);
    }
  };

  const renderDiscussionList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">The Briefing</h1>
          <p className="text-text-muted text-sm font-medium">Public discourse & syndicate intelligence</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-primary transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-black text-white shadow-lg' : 'bg-white text-text-muted hover:text-text-main border border-black/[0.03]'}`}
          >
            <cat.icon size={14} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-black/[0.03] space-y-4">
            <MessageCircle size={48} className="mx-auto text-black/5" />
            <p className="text-sm text-text-muted font-medium">No discussions in this sector yet.</p>
          </div>
        ) : (
          discussions.map((thread, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={thread.id}
              onClick={() => setSelectedDiscussion(thread)}
              className="bg-white p-6 rounded-[2.5rem] border border-black/[0.03] card-shadow cursor-pointer hover:border-primary/20 hover:translate-y-[-2px] transition-all group"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <ArrowUpCircle size={20} className="text-text-muted hover:text-primary transition-colors" />
                  <span className="text-xs font-bold">12</span>
                  <ArrowDownCircle size={20} className="text-text-muted hover:text-accent transition-colors" />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white ${categories.find(c => c.id === thread.category)?.color || 'bg-black'}`}>
                      {thread.category}
                    </span>
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">
                      Posted by {thread.profiles?.full_name} • {formatDistanceToNow(new Date(thread.created_at))} ago
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-extrabold leading-tight group-hover:text-primary transition-colors">
                    {thread.title}
                  </h3>
                  
                  <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
                    {thread.content}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-text-muted font-bold text-[10px] uppercase tracking-widest">
                      <MessageSquare size={14} />
                      <span>Comments</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted font-bold text-[10px] uppercase tracking-widest">
                      <Filter size={14} />
                      <span>Share</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderDiscussionDetail = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <button 
        onClick={() => setSelectedDiscussion(null)}
        className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors"
      >
        <ChevronRight className="rotate-180" size={14} />
        <span>Back to Briefing</span>
      </button>

      <div className="bg-white p-8 rounded-[3rem] border border-black/[0.03] card-shadow space-y-6">
        <div className="flex items-center gap-3">
          <SyndicateAvatar src={selectedDiscussion.profiles?.avatar_url} name={selectedDiscussion.profiles?.full_name} size={40} />
          <div>
            <p className="text-sm font-bold">{selectedDiscussion.profiles?.full_name}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(selectedDiscussion.created_at))} ago</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${categories.find(c => c.id === selectedDiscussion.category)?.color || 'bg-black'}`}>
            {selectedDiscussion.category}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold leading-tight">
          {selectedDiscussion.title}
        </h1>

        <div className="text-text-main/90 leading-relaxed space-y-4 whitespace-pre-wrap font-medium">
          {selectedDiscussion.content}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-extrabold px-2">Intelligence Reports ({comments.length})</h3>
        
        <form onSubmit={handleAddComment} className="relative group">
          <label htmlFor="newComment" className="sr-only">Add a comment</label>
          <textarea
            id="newComment"
            name="newComment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add to the discussion..."
            className="w-full bg-white border border-black/[0.03] rounded-[2rem] p-6 pr-16 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium min-h-[120px] resize-none card-shadow"
          />
          <button 
            type="submit"
            className="absolute bottom-6 right-6 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-primary transition-all"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 p-4 border-l-2 border-black/[0.03] ml-4">
              <SyndicateAvatar src={comment.profiles?.avatar_url} name={comment.profiles?.full_name} size={32} />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold">{comment.profiles?.full_name}</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                </div>
                <p className="text-sm text-text-main/80 font-medium leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-32">
      {selectedDiscussion ? renderDiscussionDetail() : renderDiscussionList()}

      {/* Create Discussion Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setShowCreate(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border border-black/[0.03]"
            >
              <h2 className="text-2xl font-extrabold tracking-tight mb-2">New Thread</h2>
              <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-8">Broadcast to the syndicate</p>
              
              <form onSubmit={handleCreateDiscussion} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2">Category</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewDiscussion({ ...newDiscussion, category: cat.id })}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${newDiscussion.category === cat.id ? 'bg-black text-white' : 'bg-black/5 text-text-muted'}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label htmlFor="discussionTitle" className="sr-only">Thread Title</label>
                <input 
                  id="discussionTitle"
                  name="discussionTitle"
                  type="text"
                  placeholder="Thread Title"
                  value={newDiscussion.title}
                  onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                  className="w-full px-6 py-4 bg-black/[0.03] border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-sm"
                />

                <label htmlFor="discussionContent" className="sr-only">Intel content</label>
                <textarea 
                  id="discussionContent"
                  name="discussionContent"
                  placeholder="Intel content..."
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                  className="w-full px-6 py-4 bg-black/[0.03] border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-medium text-sm min-h-[150px] resize-none"
                />

                <button 
                  type="submit"
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary transition-all shadow-xl mt-4"
                >
                  Publish Briefing
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discussions;
