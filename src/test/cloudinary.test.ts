import { describe, it, expect } from 'vitest';
import { 
  isCloudinaryUrl, 
  getOptimizedProfileUrl, 
  getThumbnailUrl, 
  getOptimizedUrl, 
  getRawFileUrl 
} from '../lib/cloudinary';

describe('cloudinary utility', () => {
  describe('isCloudinaryUrl', () => {
    it('should return true for cloudinary domains', () => {
      expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(true);
    });

    it('should return false for other domains', () => {
      expect(isCloudinaryUrl('https://example.com/image.jpg')).toBe(false);
    });
  });

  describe('getOptimizedProfileUrl', () => {
    it('should add profile transformations to cloudinary URLs', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const optimized = getOptimizedProfileUrl(url);
      expect(optimized).toContain('c_fill,w_200,h_200,g_face,q_auto,f_auto');
    });

    it('should not change already transformed URLs', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/sample.jpg';
      expect(getOptimizedProfileUrl(url)).toBe(url);
    });
  });

  describe('getThumbnailUrl', () => {
    it('should build face-cropped thumbnail URL', () => {
      const thumb = getThumbnailUrl('sample_id');
      expect(thumb).toContain('/image/upload/c_fill,w_200,h_200,g_face,q_auto,f_auto/sample_id');
    });

    it('should include version if provided', () => {
      const thumb = getThumbnailUrl('sample_id', 12345);
      expect(thumb).toContain('/v12345/sample_id');
    });
  });

  describe('getOptimizedUrl', () => {
    it('should build optimized delivery URL', () => {
      const url = getOptimizedUrl('sample_id');
      expect(url).toContain('/image/upload/q_auto,f_auto/sample_id');
    });
  });

  describe('getRawFileUrl', () => {
    it('should build raw file URL with format', () => {
      const url = getRawFileUrl('resource_id', 'pdf');
      expect(url).toContain('/raw/upload/resource_id.pdf');
    });
  });
});
