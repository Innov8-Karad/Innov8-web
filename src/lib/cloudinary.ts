// ═══════════════════════════════════════════════════════════════════════════════
// Cloudinary Upload Utility — Innov8 Web Admin Panel
// ═══════════════════════════════════════════════════════════════════════════════
// Primary cloud storage for images & documents.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Configuration ─────────────────────────────────────────────────────────────

const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Full response shape from Cloudinary's Upload API */
export interface CloudinaryApiResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: 'image' | 'video' | 'raw';
  created_at: string;
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
  original_filename: string;
  asset_id: string;
  etag: string;
}

/** Simplified result returned to callers */
export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  resourceType: string;
  originalFilename: string;
  provider: 'cloudinary';
}

/** Options for the uploader */
export interface UploadOptions {
  preset?: string;
  folder?: string;
  publicId?: string;
  onProgress?: (percentage: number) => void;
}

// ── Core Upload ───────────────────────────────────────────────────────────────

/**
 * Upload a file to Cloudinary using an unsigned preset.
 * Uses XMLHttpRequest internally to track upload progress.
 */
export function uploadToCloudinary(
  file: File,
  preset?: string,
  folder: string = 'innov8/uploads',
  options?: { publicId?: string; onProgress?: (pct: number) => void }
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // Determine resource type from file MIME
    const resourceType = file.type.startsWith('image/')
      ? 'image'
      : file.type === 'application/pdf'
        ? 'raw'
        : 'auto';

    if (!CLOUD_NAME) {
      return reject(new Error('Cloudinary Cloud Name is not configured in .env'));
    }

    const url = `${UPLOAD_URL}/${resourceType}/upload`;

    const timestamp = Math.round((new Date).getTime() / 1000);
    const generateSignature = httpsCallable(functions, 'generateCloudinarySignature');
    
    generateSignature({ folder, timestamp, public_id: options?.publicId }).then((signatureResponse) => {
      const signatureData = signatureResponse.data as { signature: string; apiKey: string };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signatureData.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signatureData.signature);
      formData.append('folder', folder);

      if (options?.publicId) {
        formData.append('public_id', options.publicId);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

    // Track upload progress
    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          options.onProgress!(pct);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: CloudinaryApiResponse = JSON.parse(xhr.responseText);
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            format: data.format,
            bytes: data.bytes,
            width: data.width || 0,
            height: data.height || 0,
            resourceType: data.resource_type,
            originalFilename: data.original_filename,
            provider: 'cloudinary',
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          console.error(`[Cloudinary Upload Error Details] (Preset: ${preset}):`, errData);
          reject(new Error(errData.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during Cloudinary upload'));
    });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.send(formData);
    }).catch((err) => {
      console.error('Error generating Cloudinary signature:', err);
      reject(new Error('Failed to generate secure upload signature.'));
    });
  });
}

// ── Delete (Stubbed — requires server-side api_secret) ────────────────────────

/**
 * Delete an asset from Cloudinary by publicId.
 *
 * ⚠️  STUB: Client-side deletion requires the `api_secret`, which must NOT
 * be exposed in frontend code. This function logs a warning and resolves.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  console.warn(
    `[Cloudinary] deleteFromCloudinary("${publicId}") — STUB. ` +
    `Server-side deletion via Cloud Function is required for production. ` +
    `The asset remains in Cloudinary storage.`
  );
}

// ── Cloudinary Upload Wrapper ───────────────────────────────────────────────────

/**
 * Upload to Cloudinary with error handling.
 */
export async function uploadWithFallback(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { preset = 'Innov8_unsigned', folder = 'innov8/uploads', publicId, onProgress } = options;

  if (!CLOUD_NAME) {
    throw new Error('Cloudinary is not properly configured. Check VITE_CLOUDINARY_CLOUD_NAME in .env');
  }

  return await uploadToCloudinary(file, preset, folder, { publicId, onProgress });
}

// ── URL Builders ──────────────────────────────────────────────────────────────

/** Generate a 200x200 face-cropped thumbnail */
export function getThumbnailUrl(publicId: string, version?: number): string {
  const v = version ? `v${version}/` : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_200,h_200,g_face,q_auto,f_auto/${v}${publicId}`;
}

/** Generate an optimized delivery URL */
export function getOptimizedUrl(publicId: string, version?: number): string {
  const v = version ? `v${version}/` : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${v}${publicId}`;
}

/** Generate a raw file (PDF/document) download URL */
export function getRawFileUrl(publicId: string, format: string = 'pdf'): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${publicId}.${format}`;
}

/**
 * Check if a URL is a Cloudinary URL.
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

/**
 * Transforms a full Cloudinary URL to include profile transformations on the fly.
 * Returns the original URL if not a Cloudinary image or already transformed.
 */
export function getOptimizedProfileUrl(url: string): string {
  if (!url || !isCloudinaryUrl(url)) {
    return url;
  }
  const transformations = 'c_fill,w_200,h_200,g_face,q_auto,f_auto';
  if (url.includes('c_fill')) {
    return url;
  }
  return url.replace('/upload/', `/upload/${transformations}/`);
}
