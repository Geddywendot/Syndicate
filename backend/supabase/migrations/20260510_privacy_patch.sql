-- Optional: Syndicate Hardening Patch (Cascades & Privacy)
-- Run this in your Supabase SQL Editor if you want to enforce strict cascading deletes and hide profiles.

-- 1. Enforce Cascading Deletions
-- This ensures that if a user deletes their account, or a discussion is deleted, all related data vanishes perfectly.
ALTER TABLE public.discussion_comments 
  DROP CONSTRAINT IF EXISTS discussion_comments_discussion_id_fkey,
  ADD CONSTRAINT discussion_comments_discussion_id_fkey 
  FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;

ALTER TABLE public.memories 
  DROP CONSTRAINT IF EXISTS memories_group_id_fkey,
  ADD CONSTRAINT memories_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_group_id_fkey,
  ADD CONSTRAINT messages_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- 2. Optional: Anti-Scraping / Profile Privacy
-- Currently, anyone can see all profiles. If you want to restrict this so you only see profiles of your followers/mutuals, use this:

DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Profiles viewable by self or mutual connections" ON public.profiles
FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.follows
    WHERE (follower_id = auth.uid() AND following_id = profiles.id AND status = 'accepted')
       OR (following_id = auth.uid() AND follower_id = profiles.id AND status = 'accepted')
  )
);
