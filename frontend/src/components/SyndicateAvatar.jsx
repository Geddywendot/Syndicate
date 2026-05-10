import React from 'react';
import Avatar from "boring-avatars";
import { optimizeCloudinaryUrl } from '../lib/cloudinary';

const SyndicateAvatar = ({ src, name, size = 40, variant = "beam", className = "" }) => {
  const safeName = name || "Unknown User";

  if (src) {
    const optimizedSrc = optimizeCloudinaryUrl(src, { 
      width: size * 2, // Double for retina displays
      height: size * 2, 
      gravity: 'face',
      crop: 'fill' 
    });
    return (
      <img 
        src={optimizedSrc} 
        alt={safeName} 
        className={`rounded-full object-cover ${className}`} 
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <div className={className}>
      <Avatar size={size} name={safeName} variant={variant} />
    </div>
  );
};

export default SyndicateAvatar;
