# Syndicate 

A vibrant, friendship-focused platform for sharing and archiving memories.

## Overview

Syndicate is a modern social space built with React and Supabase. It prioritizes community, warmth, and seamless media sharing, moving away from restrictive security-centric designs to a welcoming, premium experience.

##  Key Features

- **Personal Collections**: Group your memories into beautiful, themed collections.
- **Global Archive**: A high-performance gallery to browse your entire history.
- **Broadcast Network**: Real-time messaging to stay connected with the syndicate.
- **Premium Profiles**: Customizable member profiles with functional settings (Account, Security, Storage).
- **Dynamic Media**: Support for high-quality images and video sharing with automatic compression.
- **Rich Aesthetics**: A custom-designed UI using Indigo/Violet tones, smooth animations, and premium typography.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS (v4), Framer Motion.
- **Backend**: Supabase (Authentication & Database).
- **Media**: Cloudinary (Image & Video Storage).
- **Icons**: Lucide React.
- **Avatars**: Boring Avatars & Custom User Uploads.

## Project Structure

- `frontend/src/App.jsx`: Main layout and state controller.
- `frontend/src/components/`:
  - `Auth.jsx`: Redesigned registration and login flow.
  - `Home.jsx`: Feed and collections view.
  - `Gallery.jsx`: Archival gallery with filtering.
  - `Wall.jsx`: Real-time chat/broadcast interface.
  - `Profile.jsx`: Comprehensive user settings and profile management.
  - `Upload.jsx`: High-performance media upload component.
  - `SyndicateAvatar.jsx`: Consistent avatar system (Custom + Generated).

##  Design Principles

1. **Friendship First**: Replaced all technical/security labels with community-focused terminology.
2. **Visual Excellence**: Deep focus on HSL color palettes, glassmorphism, and micro-animations.
3. **Responsive & Alive**: Optimized for mobile and desktop with touch-friendly interactions.

##  Environment Variables

To run Syndicate locally, ensure you have the following in your `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---
Built with love for the Syndicate community.
