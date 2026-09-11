import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PreprocessedImage {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  aspectRatio: string;
  checksumSha256: string;
}

export class ImagePreprocessor {
  private allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private maxSizeBytes = (parseInt(process.env.MAX_UPLOAD_MB || '25', 10)) * 1024 * 1024;

  /**
   * Validates magic bytes to prevent spoofed extensions
   */
  private detectMimeFromMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WEBP: RIFF .... WEBP
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Parses dimensions from PNG, JPEG, WEBP headers
   */
  private extractDimensions(buffer: Buffer, mime: string): { width: number; height: number } {
    try {
      if (mime === 'image/png' && buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
      }

      if (mime === 'image/jpeg') {
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xff) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          // SOF0 - SOF3, SOF5 - SOF7, SOF9 - SOF11, SOF13 - SOF15
          if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            if (width > 0 && height > 0) return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }

      if (mime === 'image/webp' && buffer.length >= 30) {
        // VP8 or VP8L or VP8X
        const chunk = buffer.subarray(12, 16).toString('ascii');
        if (chunk === 'VP8 ') {
          const width = (buffer.readUInt16LE(26) & 0x3fff);
          const height = (buffer.readUInt16LE(28) & 0x3fff);
          if (width > 0 && height > 0) return { width, height };
        } else if (chunk === 'VP8L') {
          const b1 = buffer[21];
          const b2 = buffer[22];
          const b3 = buffer[23];
          const b4 = buffer[24];
          const width = 1 + (((b2 & 0x3f) << 8) | b1);
          const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
          if (width > 0 && height > 0) return { width, height };
        } else if (chunk === 'VP8X') {
          const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
          const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
          if (width > 0 && height > 0) return { width, height };
        }
      }
    } catch {
      // Fallback
    }

    // Default fallback dimensions if header extraction was ambiguous
    return { width: 1024, height: 1024 };
  }

  calculateAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) < 0.15) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.15) return '9:16';
    if (Math.abs(ratio - 1) < 0.15) return '1:1';
    if (Math.abs(ratio - 4 / 3) < 0.15) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.15) return '3:4';
    return ratio > 1 ? '16:9' : '9:16';
  }

  /**
   * Validates raw uploaded image and returns safe metadata
   */
  validate(buffer: Buffer, originalFilename: string): {
    mimeType: string;
    width: number;
    height: number;
    aspectRatio: string;
    checksumSha256: string;
  } {
    if (!buffer || buffer.length === 0) {
      throw new Error('INVALID_IMAGE: Uploaded file is empty');
    }

    if (buffer.length > this.maxSizeBytes) {
      throw new Error(`FILE_TOO_LARGE: File size exceeds ${this.maxSizeBytes / (1024 * 1024)}MB limit`);
    }

    const detectedMime = this.detectMimeFromMagicBytes(buffer);
    if (!detectedMime || !this.allowedMimeTypes.includes(detectedMime)) {
      throw new Error('UNSUPPORTED_FORMAT: Allowed formats are JPG, PNG, and WEBP');
    }

    const { width, height } = this.extractDimensions(buffer, detectedMime);

    if (width < 64 || height < 64) {
      throw new Error('CORRUPTED_OR_TOO_SMALL: Image dimensions must be at least 64x64 pixels');
    }

    if (width > 8192 || height > 8192) {
      throw new Error('IMAGE_DIMENSION_TOO_LARGE: Maximum supported image resolution is 8192x8192');
    }

    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const aspectRatio = this.calculateAspectRatio(width, height);

    return {
      mimeType: detectedMime,
      width,
      height,
      aspectRatio,
      checksumSha256,
    };
  }

  /**
   * Determines target resolution dimensions based on selected resolution and aspect ratio
   */
  getTargetDimensions(resolution: string, aspectRatio: string): { width: number; height: number } {
    let base = 720;
    if (resolution === '512p') base = 512;
    else if (resolution === '1080p') base = 1080;

    switch (aspectRatio) {
      case '16:9':
        return {
          width: Math.round((base * 16) / 9 / 2) * 2,
          height: base,
        };
      case '9:16':
        return {
          width: base,
          height: Math.round((base * 16) / 9 / 2) * 2,
        };
      case '1:1':
        return { width: base, height: base };
      case '4:3':
        return {
          width: Math.round((base * 4) / 3 / 2) * 2,
          height: base,
        };
      default:
        return { width: 1280, height: 720 };
    }
  }
}

export const imagePreprocessor = new ImagePreprocessor();
