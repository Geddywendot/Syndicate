import { create } from 'zustand';

const useAppStore = create((set) => ({
  session: null,
  activeTab: 'wall', // 'wall', 'network', 'profile', 'memories'
  unreadCount: 0,
  
  setSession: (session) => set({ session }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));

export default useAppStore;
