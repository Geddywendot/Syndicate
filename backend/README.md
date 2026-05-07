# Syndicate Backend

This project uses **Supabase** as its backend provider.

## Database Schema

### `memories` Table
- `id`: uuid (primary key)
- `created_at`: timestamp with time zone (default: now())
- `image_url`: text (Cloudinary secure URL)
- `caption`: text (optional)
- `user_id`: uuid (foreign key to auth.users)

## Security Rules (RLS)
- **Enable RLS** on `memories`.
- **Policy**: `Allow public read access` for viewing the wall.
- **Policy**: `Allow authenticated insert access` for users to upload their own memories.

## Environment Variables
Ensure the following are set in your `.env` file (moved to `frontend/.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
