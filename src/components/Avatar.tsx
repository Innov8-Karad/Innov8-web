interface AvatarProps {
    src?: string | null;
    alt?: string;
    fallback?: string;
    fallbackIcon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    upload?: boolean;
    className?: string;
}

export default function Avatar({ src, alt, fallback, fallbackIcon, size = 'sm', upload, className = '' }: AvatarProps) {
    const sizeClass = `avatar-${size}`;

    const isLocalFile = src?.startsWith('file://');

    return (
        <div className={`avatar ${sizeClass} ${upload ? 'avatar-upload' : ''} ${className}`}
             style={{ backgroundColor: 'var(--bg-card-accent)' }}>
            {src && !isLocalFile ? (
                <img src={src} alt={alt || 'Avatar'} />
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
