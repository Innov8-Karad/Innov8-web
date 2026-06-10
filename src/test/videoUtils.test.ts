import { describe, it, expect } from 'vitest';
import { 
  detectPlatform, 
  getEmbedUrl, 
  getThumbnailUrl, 
  validateVideoUrl, 
  getPlatformLabel, 
  getPlatformColor 
} from '../lib/videoUtils';

describe('videoUtils', () => {
  describe('detectPlatform', () => {
    it('should detect youtube URLs', () => {
      expect(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
      expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
      expect(detectPlatform('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('youtube');
    });

    it('should detect vimeo URLs', () => {
      expect(detectPlatform('https://vimeo.com/123456789')).toBe('vimeo');
    });

    it('should detect direct video URLs', () => {
      expect(detectPlatform('https://example.com/video.mp4')).toBe('direct');
    });
  });

  describe('validateVideoUrl', () => {
    it('should return error for empty URL', () => {
      expect(validateVideoUrl('')).toBe('Video URL is required');
    });

    it('should return error for invalid format', () => {
      expect(validateVideoUrl('not-a-url')).toBe('Please enter a valid URL');
    });

    it('should return error for unsupported platform', () => {
      expect(validateVideoUrl('https://google.com')).toContain('Unsupported video URL');
    });

    it('should return null for valid URL', () => {
      expect(validateVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXc1')).toBeNull();
    });
  });

  describe('getEmbedUrl', () => {
    it('should return youtube embed URL', () => {
      expect(getEmbedUrl('https://youtu.be/dQw4w9WgXc2', 'youtube')).toContain('youtube.com/embed/dQw4w9WgXc2');
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return youtube thumbnail', () => {
      expect(getThumbnailUrl('https://youtu.be/dQw4w9WgXc3', 'youtube')).toBe('https://img.youtube.com/vi/dQw4w9WgXc3/mqdefault.jpg');
    });

    it('should return cloudinary thumbnail with transformations', () => {
      const url = 'https://res.cloudinary.com/demo/video/upload/sample.mp4';
      const thumb = getThumbnailUrl(url, 'cloudinary');
      expect(thumb).toContain('so_0,w_480,h_270,c_fill,f_jpg');
      expect(thumb).toContain('.jpg');
    });
  });

  describe('display helpers', () => {
    it('getPlatformLabel should return human readable name', () => {
      expect(getPlatformLabel('youtube')).toBe('YouTube');
      expect(getPlatformLabel('direct')).toBe('Direct Video');
    });

    it('getPlatformColor should return hex code', () => {
      expect(getPlatformColor('youtube')).toBe('#FF0000');
    });
  });
});
