import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageProvider } from './storageProvider';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'));
    this.initDirs();
  }

  private initDirs() {
    const categories = ['uploads', 'outputs', 'thumbnails', 'temp'];
    for (const cat of categories) {
      const p = path.join(this.baseDir, cat);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }
  }

  private sanitizeStoragePath(storagePath: string): string {
    // Prevent path traversal attacks
    const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
    const absolute = path.resolve(this.baseDir, normalized);
    if (!absolute.startsWith(this.baseDir)) {
      throw new Error('SECURITY_ERROR: Access outside storage directory is forbidden');
    }
    return absolute;
  }

  async saveFile(
    category: 'uploads' | 'outputs' | 'thumbnails' | 'temp',
    fileId: string,
    filename: string,
    data: Buffer | Readable
  ): Promise<string> {
    const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const relDir = path.join(category, fileId);
    const targetDir = path.join(this.baseDir, relDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, sanitizedFilename);
    const relativeStoragePath = path.join(relDir, sanitizedFilename);

    if (Buffer.isBuffer(data)) {
      await fs.promises.writeFile(targetFile, data);
    } else {
      const outStream = fs.createWriteStream(targetFile);
      await new Promise<void>((resolve, reject) => {
        data.pipe(outStream);
        outStream.on('finish', () => resolve());
        outStream.on('error', (err) => reject(err));
      });
    }

    return relativeStoragePath;
  }

  getFilePath(storagePath: string): string {
    return this.sanitizeStoragePath(storagePath);
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    const absPath = this.sanitizeStoragePath(storagePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return fs.createReadStream(absPath);
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    const absPath = this.sanitizeStoragePath(storagePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return fs.promises.readFile(absPath);
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      const absPath = this.sanitizeStoragePath(storagePath);
      if (fs.existsSync(absPath)) {
        await fs.promises.unlink(absPath);
        // Clean parent dir if empty
        const parent = path.dirname(absPath);
        if (parent !== this.baseDir && fs.existsSync(parent) && (await fs.promises.readdir(parent)).length === 0) {
          await fs.promises.rmdir(parent);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const absPath = this.sanitizeStoragePath(storagePath);
      return fs.existsSync(absPath);
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{ totalFiles: number; totalSizeBytes: number }> {
    let totalFiles = 0;
    let totalSizeBytes = 0;

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          totalFiles++;
          try {
            totalSizeBytes += fs.statSync(full).size;
          } catch {}
        }
      }
    };

    walk(this.baseDir);
    return { totalFiles, totalSizeBytes };
  }
}

export const storage = new LocalStorageProvider();
