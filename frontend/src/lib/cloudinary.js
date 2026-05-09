/**
 * Cloudinary URL Optimizer
 * Transforms raw URLs into optimized, sized versions for performance.
 */
export const optimizeCloudinaryUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'center'
  } = options;

  // Split URL into base and path
  // Format: https://res.cloudinary.com/cloud_name/image/upload/v12345/path/to/image.jpg
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  const transformation = [
    width && `w_${width}`,
    height && `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`
  ].filter(Boolean).join(',');

  return `${parts[0]}/upload/${transformation}/${parts[1]}`;
};

export const getAvatarUrl = (url, name) => {
  if (url) return optimizeCloudinaryUrl(url, { width: 150, height: 150, gravity: 'face' });
  return null; // Fallback to boring-avatars handled in component
};
