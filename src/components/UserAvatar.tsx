import React from 'react';

interface UserAvatarProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  alt, 
  className = "w-10 h-10 rounded-full object-cover", 
  referrerPolicy = "no-referrer" 
}) => {
  const [error, setError] = React.useState(false);
  
  const safeAlt = (typeof alt === 'string' && alt.trim()) ? alt.trim() : 'User';
  // Calculate initials from name (e.g. "Rajibul Islam" -> "RI")
  const initials = safeAlt
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  if (!src || error) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-950 text-white font-black text-[35%] tracking-tight border border-white/10`}
        title={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
};
