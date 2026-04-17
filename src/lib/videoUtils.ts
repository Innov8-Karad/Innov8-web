// ═══════════════════════════════════════════════════════════════════════════════
// Video URL Utilities — Innov8 Web Admin
// ═══════════════════════════════════════════════════════════════════════════════
// Pure utility module for detecting video platforms, extracting IDs,
// generating embed URLs and thumbnails. Zero external dependencies.
// ═══════════════════════════════════════════════════════════════════════════════

export type VideoPlatform = 'youtube' | 'vimeo' | 'cloudinary' | 'direct';

// ── Regex Patterns ────────────────────────────────────────────────────────────

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;
const CLOUDINARY_REGEX = /res\.cloudinary\.com\/.+\/video\/upload\//;
const DIRECT_VIDEO_REGEX = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

// ── Platform Detection ────────────────────────────────────────────────────────

/**
 * Auto-detect video platform from URL.
 * Returns null for unrecognized URLs.
 */
export function detectPlatform(url: string): VideoPlatform | null {
    if (!url) return null;
    try {
        const trimmed = url.trim();
        if (YOUTUBE_REGEX.test(trimmed)) return 'youtube';
        if (VIMEO_REGEX.test(trimmed)) return 'vimeo';
        if (CLOUDINARY_REGEX.test(trimmed)) return 'cloudinary';
        if (DIRECT_VIDEO_REGEX.test(trimmed)) return 'direct';
        return null;
    } catch {
        return null;
    }
}

// ── URL Validation ────────────────────────────────────────────────────────────

/**
 * Validate that a URL is a supported video URL.
 * Returns an error message string if invalid, null if valid.
 */
export function validateVideoUrl(url: string): string | null {
    if (!url || !url.trim()) return 'Video URL is required';

    try {
        new URL(url.trim());
    } catch {
        return 'Please enter a valid URL';
    }

    const platform = detectPlatform(url);
    if (!platform) {
        return 'Unsupported video URL. Please use YouTube, Vimeo, or a direct video link (.mp4, .webm, .ogg)';
    }

    return null;
}

// ── ID Extraction ─────────────────────────────────────────────────────────────

/**
 * Extract YouTube video ID from URL.
 * Handles: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 */
export function extractYouTubeId(url: string): string | null {
    const match = url.match(YOUTUBE_REGEX);
    return match ? match[1] : null;
}

/**
 * Extract Vimeo video ID from URL.
 * Handles: vimeo.com/{id}, vimeo.com/video/{id}, player.vimeo.com/video/{id}
 */
export function extractVimeoId(url: string): string | null {
    const match = url.match(VIMEO_REGEX);
    return match ? match[1] : null;
}

// ── Embed URLs ────────────────────────────────────────────────────────────────

/**
 * Generate an embeddable URL for a given video platform.
 * Returns the original URL if platform is unknown.
 */
export function getEmbedUrl(url: string, platform: VideoPlatform): string {
    switch (platform) {
        case 'youtube': {
            const videoId = extractYouTubeId(url);
            return videoId
                ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3`
                : url;
        }
        case 'vimeo': {
            const videoId = extractVimeoId(url);
            return videoId
                ? `https://player.vimeo.com/video/${videoId}?byline=0&portrait=0`
                : url;
        }
        case 'cloudinary':
        case 'direct':
            return url; // Play directly via <video> tag
        default:
            return url;
    }
}

// ── Thumbnail URLs ────────────────────────────────────────────────────────────

/**
 * Generate a thumbnail URL for a video.
 * YouTube: uses img.youtube.com (reliable, no API key needed)
 * Vimeo: returns null (requires API call - handled separately)
 * Cloudinary: uses Cloudinary video thumbnail transformation
 * Direct: returns null
 */
export function getThumbnailUrl(url: string, platform: VideoPlatform): string | null {
    switch (platform) {
        case 'youtube': {
            const videoId = extractYouTubeId(url);
            return videoId
                ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                : null;
        }
        case 'cloudinary': {
            // Transform video URL to get a thumbnail
            // Replace /video/upload/ with /video/upload/so_0,w_480,h_270,c_fill,f_jpg/
            return url.replace(
                /\/video\/upload\//,
                '/video/upload/so_0,w_480,h_270,c_fill,f_jpg/'
            ).replace(/\.\w+$/, '.jpg');
        }
        case 'vimeo':
        case 'direct':
        default:
            return null;
    }
}

// ── Display Helpers ───────────────────────────────────────────────────────────

/** Human-readable platform label */
export function getPlatformLabel(platform: VideoPlatform): string {
    const labels: Record<VideoPlatform, string> = {
        youtube: 'YouTube',
        vimeo: 'Vimeo',
        cloudinary: 'Cloudinary',
        direct: 'Direct Video',
    };
    return labels[platform] || platform;
}

/** Platform brand color for badges */
export function getPlatformColor(platform: VideoPlatform): string {
    const colors: Record<VideoPlatform, string> = {
        youtube: '#FF0000',
        vimeo: '#1AB7EA',
        cloudinary: '#3448C5',
        direct: '#10B981',
    };
    return colors[platform] || '#6B7280';
}
