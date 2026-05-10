import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Plus, 
  MessageSquare,
  Shield,
  Heart,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SyndicateAvatar from './SyndicateAvatar';

const SyndicateNetwork = ({ session }) => {
  const [activeSubTab, setActiveSubTab] = useState('friends'); // 'friends', 'groups', 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (session) {
      fetchNetworkData();
    }
    if (activeSubTab === 'requests') {
      markNotificationsAsRead();
    }
  }, [session, activeSubTab]);

  const markNotificationsAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('type', 'friend_request');
  };

  const fetchNetworkData = async () => {
    setLoading(true);
    // Fetch friends (accepted follows)
    const { data: followsData } = await supabase
      .from('follows')
      .select('*, profiles!follows_following_id_fkey(*)')
      .eq('follower_id', session.user.id)
      .eq('status', 'accepted');
    
    // Fetch pending requests
    const { data: requestsData } = await supabase
      .from('follows')
      .select('*, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', session.user.id)
      .eq('status', 'pending');

    // Fetch groups
    const { data: groupsData } = await supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', session.user.id);

    setFriends(followsData || []);
    setRequests(requestsData || []);
    setGroups(groupsData || []);
    
    // Calculate Suggestions
    calculateSuggestions(followsData || []);
    setLoading(false);
  };

  const calculateSuggestions = async (myFriends) => {
    // 1. Fetch all profiles and all accepted follows
    const { data: allProfiles, error: pError } = await supabase.from('profiles').select('*').neq('id', session.user.id);
    const { data: allFollows, error: fError } = await supabase.from('follows').select('*').eq('status', 'accepted');

    if (pError || fError) {
      console.error('Suggestions Fetch Error:', pError || fError);
      return;
    }

    const myFriendIds = new Set(myFriends.map(f => f.following_id));
    
    const suggestedUsers = allProfiles
      .filter(user => !myFriendIds.has(user.id)) // Filter out existing friends
      .map(user => {
        // Calculate Mutuals: Friends of mine who also follow this user
        const mutualFriends = allFollows.filter(f => 
          f.following_id === user.id && myFriendIds.has(f.follower_id)
        );

        // Calculate Popularity: Total followers this user has
        const followerCount = allFollows.filter(f => f.following_id === user.id).length;

        return {
          ...user,
          mutualCount: mutualFriends.length,
          popularity: followerCount,
          score: (mutualFriends.length * 2) + followerCount // Weighted score
        };
      })
      .filter(user => user.score > 0) // Only suggest if they have some connection
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setSuggestions(suggestedUsers);
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${query}%`)
      .neq('id', session.user.id)
      .limit(5);
    
    if (error) {
      console.error('Search Error:', error);
    }
    setSearchResults(data || []);
  };

  const sendFollowRequest = async (userId) => {
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: session.user.id, following_id: userId, status: 'pending' }]);
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation (409 Conflict)
        alert('You have already sent a request or are already connected to this user.');
      } else {
        console.error('Follow request error:', error);
      }
    }
    
    // Always remove from view to clean up UI
    setSearchResults(prev => prev.filter(u => u.id !== userId));
    setSuggestions(prev => prev.filter(u => u.id !== userId));
  };

  const acceptRequest = async (requestId) => {
    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    
    if (!error) {
      fetchNetworkData();
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: newGroupName, created_by: session.user.id }])
      .select()
      .single();

    if (!groupError) {
      await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: session.user.id }]);
      
      setNewGroupName('');
      setShowCreateGroup(false);
      fetchNetworkData();
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Syndicate Network</h1>
        <p className="text-text-muted text-sm font-medium">Manage your inner circles</p>
      </header>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
        <input 
          type="text"
          placeholder="Search for people by name..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-black/[0.03] rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/5 transition-all font-medium text-sm card-shadow"
          value={searchQuery}
          onChange={handleSearch}
        />
        
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] border border-black/[0.03] card-shadow overflow-hidden z-50 p-2"
            >
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-black/[0.02] rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <SyndicateAvatar src={user.avatar_url} name={user.full_name} size={40} />
                    <div>
                      <p className="text-sm font-bold">{user.full_name}</p>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Syndicate Member</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendFollowRequest(user.id)}
                    className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-all"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions Section */}
      <AnimatePresence>
        {suggestions.length > 0 && activeSubTab === 'friends' && searchQuery.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Suggested for you</h3>
              <TrendingUp size={14} className="text-primary" />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {suggestions.map(user => (
                <div key={user.id} className="min-w-[180px] bg-white p-6 rounded-[2.5rem] border border-black/[0.03] card-shadow space-y-4 text-center group">
                  <div className="relative mx-auto w-16 h-16">
                    <SyndicateAvatar src={user.avatar_url} name={user.full_name} size={64} />
                    {user.mutualCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-full border-2 border-white shadow-lg">
                        {user.mutualCount} MUTUAL
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate">{user.full_name}</p>
                    <p className="text-[10px] text-text-muted font-medium">
                      {user.popularity} members connected
                    </p>
                  </div>
                  <button 
                    onClick={() => sendFollowRequest(user.id)}
                    className="w-full py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary transition-all active:scale-95"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-black/[0.03] rounded-full card-shadow">
        {[
          { id: 'friends', label: 'Friends', icon: Users },
          { id: 'groups', label: 'Groups', icon: Shield },
          { id: 'requests', label: `Requests ${requests.length > 0 ? `(${requests.length})` : ''}`, icon: Heart }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-all ${activeSubTab === tab.id ? 'bg-black text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {activeSubTab === 'friends' && (
          <div className="grid grid-cols-1 gap-4">
            {friends.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <Users size={48} className="mx-auto text-black/5" />
                <p className="text-sm text-text-muted font-medium">Your circle is quiet. Start searching for friends!</p>
              </div>
            ) : (
              friends.map(follow => (
                <div key={follow.id} className="bg-white p-5 rounded-[2rem] border border-black/[0.03] card-shadow flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <SyndicateAvatar src={follow.profiles.avatar_url} name={follow.profiles.full_name} size={48} />
                    <div>
                      <p className="text-sm font-bold">{follow.profiles.full_name}</p>
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Connected</p>
                    </div>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-black/[0.03] flex items-center justify-center text-text-muted hover:bg-black/[0.05]">
                    <MessageSquare size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'groups' && (
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="w-full p-6 bg-primary/5 border border-primary/10 rounded-[2.5rem] flex items-center justify-center gap-3 text-primary font-bold hover:bg-primary/10 transition-all"
            >
              <Plus size={20} />
              <span>Create New Group</span>
            </button>
            
            {groups.map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-black/[0.03] card-shadow flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-black/20 group-hover:bg-primary group-hover:text-white transition-all">
                    <Shield size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{member.groups.name}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Secure Circle</p>
                  </div>
                </div>
                <ChevronRight className="text-text-muted" size={20} />
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'requests' && (
          <div className="grid grid-cols-1 gap-4">
            {requests.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <Heart size={48} className="mx-auto text-black/5" />
                <p className="text-sm text-text-muted font-medium">No pending requests.</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="bg-white p-5 rounded-[2rem] border border-black/[0.03] card-shadow flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <SyndicateAvatar src={req.profiles.avatar_url} name={req.profiles.full_name} size={48} />
                    <div>
                      <p className="text-sm font-bold">{req.profiles.full_name}</p>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Wants to connect</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => acceptRequest(req.id)}
                      className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20"
                    >
                      <Check size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setShowCreateGroup(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border border-black/[0.03]"
            >
              <h2 className="text-2xl font-extrabold tracking-tight mb-2">New Group</h2>
              <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-8">Establish a private circle</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2">Group Name</label>
                  <input 
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-6 py-4 bg-black/[0.03] border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-medium"
                    placeholder="e.g. Family, Close Friends"
                  />
                </div>
                <button 
                  onClick={createGroup}
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary transition-all shadow-xl"
                >
                  Create Circle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyndicateNetwork;
