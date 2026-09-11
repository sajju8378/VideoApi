import { Readable } from 'stream';

export interface FileMetadata {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  storagePath: string;
}

export interface StorageProvider {
  saveFile(category: 'uploads' | 'outputs' | 'thumbnails' | 'temp', fileId: string, filename: string, data: Buffer | Readable): Promise<string>;
  getFilePath(storagePath: string): string;
  getFileStream(storagePath: string): Promise<Readable>;
  getFileBuffer(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<boolean>;
  fileExists(storagePath: string): Promise<boolean>;
  getStats(): Promise<{ totalFiles: number; totalSizeBytes: number }>;
}
