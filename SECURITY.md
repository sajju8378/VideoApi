# Security & Privacy Architecture

## 1. Zero Trust File Ingestion
- Uploads are strictly validated using magic bytes (first 12 bytes of the file) rather than trusted file extensions.
- Supported MIME types are limited to `image/jpeg`, `image/png`, and `image/webp`.
- Images are restricted to 25 MB and 8192x8192 max dimensions.
- Storage paths use non-sequential UUIDs: `uploads/{uuid}/input.{ext}`.
- All storage paths are sanitized against directory traversal attacks (`..`).

## 2. Shell Injection Protection
- The application never passes raw user strings into shell commands.
- FFmpeg invocations use safe `spawn` arguments arrays with strict type conversions.

## 3. Secret Management & Private Content
- No API keys or credentials are committed to version control.
- Videos and uploads are private by default, secured behind JWT session tokens.
- User passwords use cryptographic scrypt hashing with unique 16-byte random salts.
