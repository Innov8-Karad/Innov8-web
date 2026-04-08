interface AvatarProps {
    src?: string | null;
    alt?: string;
    fallback?: string;
    fallbackIcon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    upload?: boolean;
    className?: string;
}

import { getOptimizedProfileUrl } from '../lib/cloudinary';

export default function Avatar({ src, alt, fallback, fallbackIcon, size = 'sm', upload, className = '' }: AvatarProps) {
    const sizeClass = `avatar-${size}`;

    return (
        <div className={`avatar ${sizeClass} ${upload ? 'avatar-upload' : ''} ${className}`}
             style={{ backgroundColor: 'var(--bg-card-accent)' }}>
            {src ? (
                <img src={getOptimizedProfileUrl(src)} alt={alt || 'Avatar'} />
            ) : fallbackIcon ? (
                fallbackIcon
            ) : (
                <span className="avatar-fallback" style={size === 'md' ? { fontSize: '2rem', color: 'var(--primary)', fontWeight: 600 } : undefined}>
                    {fallback || '?'}
                </span>
            )}
        </div>
    );
}
