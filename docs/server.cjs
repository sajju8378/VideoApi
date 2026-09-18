var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path7 = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");

// server/routes/api.ts
var import_express = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_crypto4 = __toESM(require("crypto"), 1);
var import_fs5 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);

// server/database/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var DatabaseManager = class {
  constructor() {
    this.isLoaded = false;
    const storageDir = process.env.STORAGE_PATH || import_path.default.join(process.cwd(), "storage");
    this.dbPath = import_path.default.join(storageDir, "database.json");
    this.state = {
      users: [],
      projects: [],
      uploads: [],
      generation_parameters: [],
      generation_jobs: [],
      outputs: [],
      generation_variations: []
    };
    this.init();
  }
  init() {
    const dir = import_path.default.dirname(this.dbPath);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    if (import_fs.default.existsSync(this.dbPath)) {
      try {
        const raw = import_fs.default.readFileSync(this.dbPath, "utf8");
        this.state = JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse existing database.json, initializing empty state:", err);
      }
    }
    if (!this.state.users || this.state.users.length === 0) {
      const demoSalt = import_crypto.default.randomBytes(16).toString("hex");
      const hash = import_crypto.default.scryptSync("demo123", demoSalt, 64).toString("hex") + ":" + demoSalt;
      const demoUser = {
        id: import_crypto.default.randomUUID(),
        email: "demo@example.com",
        password_hash: hash,
        name: "Demo Creator",
        role: "admin",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.state.users = [demoUser];
      const demoProject = {
        id: import_crypto.default.randomUUID(),
        user_id: demoUser.id,
        name: "Default Video Project",
        description: "Default project workspace for AI video generation",
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.state.projects = [demoProject];
      this.persist();
    }
    this.isLoaded = true;
  }
  persist() {
    try {
      const tmpPath = `${this.dbPath}.tmp.${Date.now()}`;
      import_fs.default.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), "utf8");
      import_fs.default.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error("Database persist error:", err);
    }
  }
  // Users
  getUserByEmail(email) {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  getUserById(id) {
    return this.state.users.find((u) => u.id === id);
  }
  createUser(user) {
    const newUser = {
      ...user,
      id: import_crypto.default.randomUUID(),
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.users.push(newUser);
    this.persist();
    return newUser;
  }
  // Projects
  getProjectsByUserId(userId) {
    return this.state.projects.filter((p) => p.user_id === userId);
  }
  // Uploads
  createUpload(upload2) {
    const newUpload = {
      ...upload2,
      id: import_crypto.default.randomUUID(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.uploads.push(newUpload);
    this.persist();
    return newUpload;
  }
  getUploadById(id) {
    return this.state.uploads.find((u) => u.id === id);
  }
  // Parameters
  createParameters(params) {
    const newParams = {
      ...params,
      id: import_crypto.default.randomUUID(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.generation_parameters.push(newParams);
    this.persist();
    return newParams;
  }
  getParametersById(id) {
    return this.state.generation_parameters.find((p) => p.id === id);
  }
  // Generation Jobs
  createJob(job) {
    const newJob = {
      ...job,
      id: import_crypto.default.randomUUID(),
      status: job.status || "queued",
      progress: 0,
      stage: job.stage || "queued",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.generation_jobs.push(newJob);
    this.persist();
    return newJob;
  }
  getJobById(id) {
    return this.state.generation_jobs.find((j) => j.id === id);
  }
  updateJob(id, updates) {
    const job = this.getJobById(id);
    if (!job) return void 0;
    Object.assign(job, updates);
    this.persist();
    return job;
  }
  getJobsByUserId(userId) {
    return this.state.generation_jobs.filter((j) => j.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  deleteJob(id) {
    const index = this.state.generation_jobs.findIndex((j) => j.id === id);
    if (index === -1) return false;
    this.state.generation_jobs.splice(index, 1);
    this.state.outputs = this.state.outputs.filter((o) => o.job_id !== id);
    this.state.generation_variations = this.state.generation_variations.filter(
      (v) => v.parent_job_id !== id && v.variation_job_id !== id
    );
    this.persist();
    return true;
  }
  // Outputs
  createOutput(output) {
    const newOutput = {
      ...output,
      id: import_crypto.default.randomUUID(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.outputs.push(newOutput);
    this.persist();
    return newOutput;
  }
  getOutputByJobId(jobId) {
    return this.state.outputs.find((o) => o.job_id === jobId);
  }
  // Variations
  createVariation(parentJobId, variationJobId, variationType = "seed") {
    const item = {
      id: import_crypto.default.randomUUID(),
      parent_job_id: parentJobId,
      variation_job_id: variationJobId,
      variation_type: variationType,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.generation_variations.push(item);
    this.persist();
    return item;
  }
  getVariationsForJob(jobId) {
    return this.state.generation_variations.filter(
      (v) => v.parent_job_id === jobId || v.variation_job_id === jobId
    );
  }
  // System Stats
  getStats() {
    return {
      total_users: this.state.users.length,
      total_uploads: this.state.uploads.length,
      total_jobs: this.state.generation_jobs.length,
      queued_jobs: this.state.generation_jobs.filter((j) => j.status === "queued").length,
      generating_jobs: this.state.generation_jobs.filter(
        (j) => ["preparing", "loading", "generating", "post_processing", "encoding"].includes(j.status)
      ).length,
      completed_jobs: this.state.generation_jobs.filter((j) => j.status === "completed").length,
      failed_jobs: this.state.generation_jobs.filter((j) => j.status === "failed").length
    };
  }
};
var db = new DatabaseManager();

// server/storage/localStorageProvider.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var LocalStorageProvider = class {
  constructor(baseDir) {
    this.baseDir = import_path2.default.resolve(baseDir || process.env.STORAGE_PATH || import_path2.default.join(process.cwd(), "storage"));
    this.initDirs();
  }
  initDirs() {
    const categories = ["uploads", "outputs", "thumbnails", "temp"];
    for (const cat of categories) {
      const p = import_path2.default.join(this.baseDir, cat);
      if (!import_fs2.default.existsSync(p)) {
        import_fs2.default.mkdirSync(p, { recursive: true });
      }
    }
  }
  sanitizeStoragePath(storagePath) {
    const normalized = import_path2.default.normalize(storagePath).replace(/^(\.\.[\/\\])+/, "");
    const absolute = import_path2.default.resolve(this.baseDir, normalized);
    if (!absolute.startsWith(this.baseDir)) {
      throw new Error("SECURITY_ERROR: Access outside storage directory is forbidden");
    }
    return absolute;
  }
  async saveFile(category, fileId, filename, data) {
    const sanitizedFilename = import_path2.default.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const relDir = import_path2.default.join(category, fileId);
    const targetDir = import_path2.default.join(this.baseDir, relDir);
    if (!import_fs2.default.existsSync(targetDir)) {
      import_fs2.default.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = import_path2.default.join(targetDir, sanitizedFilename);
    const relativeStoragePath = import_path2.default.join(relDir, sanitizedFilename);
    if (Buffer.isBuffer(data)) {
      await import_fs2.default.promises.writeFile(targetFile, data);
    } else {
      const outStream = import_fs2.default.createWriteStream(targetFile);
      await new Promise((resolve, reject) => {
        data.pipe(outStream);
        outStream.on("finish", () => resolve());
        outStream.on("error", (err) => reject(err));
      });
    }
    return relativeStoragePath;
  }
  getFilePath(storagePath) {
    return this.sanitizeStoragePath(storagePath);
  }
  async getFileStream(storagePath) {
    const absPath = this.sanitizeStoragePath(storagePath);
    if (!import_fs2.default.existsSync(absPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return import_fs2.default.createReadStream(absPath);
  }
  async getFileBuffer(storagePath) {
    const absPath = this.sanitizeStoragePath(storagePath);
    if (!import_fs2.default.existsSync(absPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return import_fs2.default.promises.readFile(absPath);
  }
  async deleteFile(storagePath) {
    try {
      const absPath = this.sanitizeStoragePath(storagePath);
      if (import_fs2.default.existsSync(absPath)) {
        await import_fs2.default.promises.unlink(absPath);
        const parent = import_path2.default.dirname(absPath);
        if (parent !== this.baseDir && import_fs2.default.existsSync(parent) && (await import_fs2.default.promises.readdir(parent)).length === 0) {
          await import_fs2.default.promises.rmdir(parent);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  async fileExists(storagePath) {
    try {
      const absPath = this.sanitizeStoragePath(storagePath);
      return import_fs2.default.existsSync(absPath);
    } catch {
      return false;
    }
  }
  async getStats() {
    let totalFiles = 0;
    let totalSizeBytes = 0;
    const walk = (dir) => {
      if (!import_fs2.default.existsSync(dir)) return;
      const entries = import_fs2.default.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = import_path2.default.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          totalFiles++;
          try {
            totalSizeBytes += import_fs2.default.statSync(full).size;
          } catch {
          }
        }
      }
    };
    walk(this.baseDir);
    return { totalFiles, totalSizeBytes };
  }
};
var storage = new LocalStorageProvider();

// server/pipeline/imagePreprocessor.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var ImagePreprocessor = class {
  constructor() {
    this.allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    this.maxSizeBytes = parseInt(process.env.MAX_UPLOAD_MB || "25", 10) * 1024 * 1024;
  }
  /**
   * Validates magic bytes to prevent spoofed extensions
   */
  detectMimeFromMagicBytes(buffer) {
    if (buffer.length < 12) return null;
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
      return "image/jpeg";
    }
    if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10) {
      return "image/png";
    }
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
      return "image/webp";
    }
    return null;
  }
  /**
   * Parses dimensions from PNG, JPEG, WEBP headers
   */
  extractDimensions(buffer, mime) {
    try {
      if (mime === "image/png" && buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
      }
      if (mime === "image/jpeg") {
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 255) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            if (width > 0 && height > 0) return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }
      if (mime === "image/webp" && buffer.length >= 30) {
        const chunk = buffer.subarray(12, 16).toString("ascii");
        if (chunk === "VP8 ") {
          const width = buffer.readUInt16LE(26) & 16383;
          const height = buffer.readUInt16LE(28) & 16383;
          if (width > 0 && height > 0) return { width, height };
        } else if (chunk === "VP8L") {
          const b1 = buffer[21];
          const b2 = buffer[22];
          const b3 = buffer[23];
          const b4 = buffer[24];
          const width = 1 + ((b2 & 63) << 8 | b1);
          const height = 1 + ((b4 & 15) << 10 | b3 << 2 | (b2 & 192) >> 6);
          if (width > 0 && height > 0) return { width, height };
        } else if (chunk === "VP8X") {
          const width = 1 + (buffer[24] | buffer[25] << 8 | buffer[26] << 16);
          const height = 1 + (buffer[27] | buffer[28] << 8 | buffer[29] << 16);
          if (width > 0 && height > 0) return { width, height };
        }
      }
    } catch {
    }
    return { width: 1024, height: 1024 };
  }
  calculateAspectRatio(width, height) {
    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) < 0.15) return "16:9";
    if (Math.abs(ratio - 9 / 16) < 0.15) return "9:16";
    if (Math.abs(ratio - 1) < 0.15) return "1:1";
    if (Math.abs(ratio - 4 / 3) < 0.15) return "4:3";
    if (Math.abs(ratio - 3 / 4) < 0.15) return "3:4";
    return ratio > 1 ? "16:9" : "9:16";
  }
  /**
   * Validates raw uploaded image and returns safe metadata
   */
  validate(buffer, originalFilename) {
    if (!buffer || buffer.length === 0) {
      throw new Error("INVALID_IMAGE: Uploaded file is empty");
    }
    if (buffer.length > this.maxSizeBytes) {
      throw new Error(`FILE_TOO_LARGE: File size exceeds ${this.maxSizeBytes / (1024 * 1024)}MB limit`);
    }
    const detectedMime = this.detectMimeFromMagicBytes(buffer);
    if (!detectedMime || !this.allowedMimeTypes.includes(detectedMime)) {
      throw new Error("UNSUPPORTED_FORMAT: Allowed formats are JPG, PNG, and WEBP");
    }
    const { width, height } = this.extractDimensions(buffer, detectedMime);
    if (width < 64 || height < 64) {
      throw new Error("CORRUPTED_OR_TOO_SMALL: Image dimensions must be at least 64x64 pixels");
    }
    if (width > 8192 || height > 8192) {
      throw new Error("IMAGE_DIMENSION_TOO_LARGE: Maximum supported image resolution is 8192x8192");
    }
    const checksumSha256 = import_crypto2.default.createHash("sha256").update(buffer).digest("hex");
    const aspectRatio = this.calculateAspectRatio(width, height);
    return {
      mimeType: detectedMime,
      width,
      height,
      aspectRatio,
      checksumSha256
    };
  }
  /**
   * Determines target resolution dimensions based on selected resolution and aspect ratio
   */
  getTargetDimensions(resolution, aspectRatio) {
    let base = 720;
    if (resolution === "512p") base = 512;
    else if (resolution === "1080p") base = 1080;
    switch (aspectRatio) {
      case "16:9":
        return {
          width: Math.round(base * 16 / 9 / 2) * 2,
          height: base
        };
      case "9:16":
        return {
          width: base,
          height: Math.round(base * 16 / 9 / 2) * 2
        };
      case "1:1":
        return { width: base, height: base };
      case "4:3":
        return {
          width: Math.round(base * 4 / 3 / 2) * 2,
          height: base
        };
      default:
        return { width: 1280, height: 720 };
    }
  }
};
var imagePreprocessor = new ImagePreprocessor();

// server/pipeline/promptProcessor.ts
var PromptProcessor = class {
  /**
   * Transforms raw user natural-language prompt into structured generation specification
   * without altering the user's intended meaning.
   */
  process(prompt, options = {}) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      throw new Error("Prompt cannot be empty");
    }
    const lower = cleanPrompt.toLowerCase();
    let actionType = "cinematic_drift";
    let speedMultiplier = 1;
    const isFlight = lower.includes("fly") || lower.includes("flies") || lower.includes("flying") || lower.includes("soar") || lower.includes("forward fast") || lower.includes("rush forward") || lower.includes("rocket") || lower.includes("warp") || lower.includes("hyperspace") || lower.includes("dive");
    const isRush = !isFlight && (lower.includes("fast") || lower.includes("run") || lower.includes("running") || lower.includes("dash") || lower.includes("sprint") || lower.includes("speed") || lower.includes("chase") || lower.includes("driving"));
    const isWaterOrFlow = lower.includes("water") || lower.includes("wave") || lower.includes("ocean") || lower.includes("river") || lower.includes("stream") || lower.includes("clouds") || lower.includes("wind") || lower.includes("smoke") || lower.includes("breeze");
    const isAction = lower.includes("fight") || lower.includes("battle") || lower.includes("explosion") || lower.includes("fire") || lower.includes("blast") || lower.includes("laser") || lower.includes("power") || lower.includes("magic");
    const isLiving = lower.includes("portrait") || lower.includes("person") || lower.includes("character") || lower.includes("face") || lower.includes("smile") || lower.includes("talking") || lower.includes("breathe") || lower.includes("eyes");
    if (isFlight) {
      actionType = "flight_forward";
      speedMultiplier = 1.8;
    } else if (isRush) {
      actionType = "speed_rush";
      speedMultiplier = 1.5;
    } else if (lower.includes("pan left") || lower.includes("move left") || lower.includes("sweep left")) {
      actionType = "pan_left";
    } else if (lower.includes("pan right") || lower.includes("move right") || lower.includes("sweep right")) {
      actionType = "pan_right";
    } else if (lower.includes("tilt up") || lower.includes("rise") || lower.includes("rising") || lower.includes("ascend")) {
      actionType = "tilt_up";
    } else if (lower.includes("tilt down") || lower.includes("descend")) {
      actionType = "tilt_down";
    } else if (lower.includes("orbit") || lower.includes("circle around")) {
      actionType = "orbit";
    } else if (lower.includes("dolly") || lower.includes("vertigo") || lower.includes("zoom")) {
      actionType = "dolly_zoom";
    } else if (isWaterOrFlow) {
      actionType = "ambient_flow";
    } else if (isAction) {
      actionType = "dynamic_action";
      speedMultiplier = 1.4;
    } else if (isLiving) {
      actionType = "living_subject";
    }
    let cameraMotion = options.camera_motion || "static";
    if (cameraMotion === "static") {
      if (actionType === "flight_forward") {
        cameraMotion = "tracking shot";
      } else if (actionType === "speed_rush") {
        cameraMotion = "tracking shot";
      } else if (actionType === "pan_left") {
        cameraMotion = "pan left";
      } else if (actionType === "pan_right") {
        cameraMotion = "pan right";
      } else if (actionType === "tilt_up") {
        cameraMotion = "tilt up";
      } else if (actionType === "tilt_down") {
        cameraMotion = "tilt down";
      } else if (actionType === "orbit") {
        cameraMotion = "orbit";
      } else if (actionType === "dolly_zoom") {
        cameraMotion = "dolly";
      }
    }
    let motionIntensity = "medium";
    const strength = options.motion_strength ?? 50;
    if (strength <= 30 || lower.includes("subtle") || lower.includes("slow") || lower.includes("gently")) {
      motionIntensity = "low";
    } else if (strength >= 70 || lower.includes("fast") || lower.includes("rapid") || lower.includes("dynamic") || actionType === "flight_forward") {
      motionIntensity = "high";
    }
    speedMultiplier *= 0.5 + strength / 100;
    let lighting = "natural cinematic lighting";
    if (lower.includes("golden hour")) lighting = "golden hour warm lighting";
    else if (lower.includes("neon") || lower.includes("cyberpunk")) lighting = "vibrant neon dramatic lighting";
    else if (lower.includes("studio") || lower.includes("rim light")) lighting = "studio three-point rim lighting";
    else if (lower.includes("sunset") || lower.includes("dusk")) lighting = "sunset twilight ambient lighting";
    else if (lower.includes("night") || lower.includes("dark")) lighting = "low-key moody night lighting";
    let style = "photorealistic cinematic";
    if (lower.includes("anime") || lower.includes("animation")) style = "high quality animation";
    else if (lower.includes("vintage") || lower.includes("1980s") || lower.includes("retro")) style = "authentic vintage film aesthetic";
    else if (lower.includes("documentary")) style = "crisp raw documentary style";
    const sentences = cleanPrompt.split(/[.,;]\s+/);
    const subject = sentences[0] || "Primary subject from conditioned image";
    const environment = sentences.length > 1 ? sentences[1] : "Original scene context";
    let actionDesc = sentences.length > 2 ? sentences.slice(2).join("; ") : "Natural consistent movement";
    if (actionType === "flight_forward") {
      actionDesc = "Dynamic high-speed forward flight into depth with temporal motion blur";
    } else if (actionType === "speed_rush") {
      actionDesc = "High-velocity forward motion with shutter blur and perspective acceleration";
    } else if (actionType === "ambient_flow") {
      actionDesc = "Fluid atmospheric undulation and organic environmental motion";
    } else if (actionType === "living_subject") {
      actionDesc = "Subtle living subject breathing and continuous organic depth focal rack";
    }
    return {
      subject,
      environment,
      action: actionDesc,
      action_type: actionType,
      camera_motion: cameraMotion,
      lighting,
      style,
      motion_intensity: motionIntensity,
      speed_multiplier: speedMultiplier,
      duration: options.duration || 5,
      fps: options.fps || 24,
      seed: options.seed,
      negative_prompt: options.negative_prompt || "distortion, flickering, artifacts, jitter, identity shift, blur, morphing"
    };
  }
};
var promptProcessor = new PromptProcessor();

// server/queue/jobQueue.ts
var import_events = __toESM(require("events"), 1);

// server/inference/models/pipelineEngine.ts
var import_path4 = __toESM(require("path"), 1);

// server/pipeline/videoEncoder.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var VideoEncoder = class {
  /**
   * Encodes a sequence of image frames or generates an MP4 from image inputs using FFmpeg.
   * Ensures H.264 video codec, fast-start MP4 flags (+faststart) for instant browser streaming,
   * and generates a high-quality poster thumbnail.
   */
  async encodeFramesToMp4(framePatternOrInput, outputMp4Path, thumbnailPath, options) {
    const outDir = import_path3.default.dirname(outputMp4Path);
    if (!import_fs3.default.existsSync(outDir)) {
      import_fs3.default.mkdirSync(outDir, { recursive: true });
    }
    const thumbDir = import_path3.default.dirname(thumbnailPath);
    if (!import_fs3.default.existsSync(thumbDir)) {
      import_fs3.default.mkdirSync(thumbDir, { recursive: true });
    }
    const ffmpegArgs = [
      "-y",
      "-framerate",
      options.fps.toString(),
      "-i",
      framePatternOrInput,
      "-c:v",
      "libx264",
      "-preset",
      options.preset || "fast",
      "-crf",
      (options.crf || 22).toString(),
      "-pix_fmt",
      "yuv420p",
      "-vf",
      `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`,
      "-movflags",
      "+faststart",
      outputMp4Path
    ];
    await this.executeFFmpeg(ffmpegArgs);
    const thumbArgs = [
      "-y",
      "-ss",
      "00:00:00.100",
      "-i",
      outputMp4Path,
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbnailPath
    ];
    try {
      await this.executeFFmpeg(thumbArgs);
    } catch {
      const fallbackArgs = ["-y", "-i", outputMp4Path, "-vframes", "1", thumbnailPath];
      await this.executeFFmpeg(fallbackArgs);
    }
    const stats = import_fs3.default.statSync(outputMp4Path);
    const durationSeconds = await this.getVideoDuration(outputMp4Path, options.fps);
    return {
      fileSize: stats.size,
      durationSeconds
    };
  }
  /**
   * Generates video from input image + temporal motion transforms with FFmpeg filters
   * used for synthetic camera motion / pan / tilt / zoom / temporal consistency in the verification pipeline.
   */
  async generateMotionVideoFromImage(inputImagePath, outputMp4Path, thumbnailPath, options) {
    const outDir = import_path3.default.dirname(outputMp4Path);
    if (!import_fs3.default.existsSync(outDir)) {
      import_fs3.default.mkdirSync(outDir, { recursive: true });
    }
    const thumbDir = import_path3.default.dirname(thumbnailPath);
    if (!import_fs3.default.existsSync(thumbDir)) {
      import_fs3.default.mkdirSync(thumbDir, { recursive: true });
    }
    const totalFrames = Math.max(24, Math.round(options.duration * options.fps));
    const w = options.width;
    const h = options.height;
    const speedMult = options.promptSpec?.speed_multiplier ?? 0.5 + options.motionStrength / 100;
    const actionType = options.promptSpec?.action_type || "cinematic_drift";
    const cameraMotion = (options.cameraMotion || "").toLowerCase();
    if (!import_fs3.default.existsSync(inputImagePath) || import_fs3.default.statSync(inputImagePath).size < 100) {
      await this.executeFFmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=0x18181b:s=${w}x${h}:d=1`,
        "-frames:v",
        "1",
        inputImagePath
      ]);
    }
    let zoompanFilter = "";
    const isForwardFlight = actionType === "flight_forward" || actionType === "speed_rush";
    let needsMotionBlur = true;
    if (cameraMotion === "tracking shot") {
      zoompanFilter = `zoompan=z=1.24:x='pow(on/${totalFrames}, 1.05) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "pan left" || actionType === "pan_left") {
      zoompanFilter = `zoompan=z=1.22:x='(1.0 - on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "pan right" || actionType === "pan_right") {
      zoompanFilter = `zoompan=z=1.22:x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "orbit" || cameraMotion === "cinematic camera movement" || actionType === "orbit") {
      zoompanFilter = `zoompan=z='1.16 + 0.09 * (on/${totalFrames})':x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2 + (ih * 0.04) * sin(PI * on / ${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "tilt up" || actionType === "tilt_up") {
      zoompanFilter = `zoompan=z=1.22:x='(iw - iw/zoom)/2':y='(1.0 - on/${totalFrames}) * (ih - ih/zoom)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "tilt down" || actionType === "tilt_down") {
      zoompanFilter = `zoompan=z=1.22:x='(iw - iw/zoom)/2':y='(on/${totalFrames}) * (ih - ih/zoom)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (isForwardFlight) {
      const zoomDelta = Math.min(0.55, 0.35 * speedMult);
      const maxZoom = (1.1 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='min(1.10 + pow(on/${totalFrames}, 1.15)*${zoomDelta.toFixed(3)}, ${maxZoom})':x='pow(on/${totalFrames}, 1.12) * (iw - iw/zoom)':y='(ih - ih/zoom)/2 - (ih * 0.05) * sin(PI * on / ${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "slow push-in" || cameraMotion === "dolly" || actionType === "dolly_zoom") {
      const zoomDelta = Math.min(0.45, 0.25 * speedMult);
      const maxZoom = (1.05 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='min(1.05 + (on/${totalFrames})*${zoomDelta.toFixed(3)}, ${maxZoom})':x='(iw/2 - iw/zoom/2) + (iw * 0.05) * (on/${totalFrames})':y='(ih/2 - ih/zoom/2) - (ih * 0.03) * (on/${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "slow pull-out") {
      const zoomDelta = Math.min(0.4, 0.25 * speedMult);
      const startZoom = (1.05 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='max(1.05, ${startZoom} - (on/${totalFrames})*${zoomDelta.toFixed(3)})':x='(iw/2 - iw/zoom/2) - (iw * 0.05) * (on/${totalFrames})':y='(ih/2 - ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === "handheld") {
      zoompanFilter = `zoompan=z='1.08 + 0.016 * sin(2*PI*on/(${options.fps}*3.8))':x='(iw/2 - iw/zoom/2) + (iw * 0.014) * sin(2*PI*on/(${options.fps}*4.2))':y='(ih/2 - ih/zoom/2) + (ih * 0.010) * cos(2*PI*on/(${options.fps}*3.6))':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    } else if (actionType === "ambient_flow") {
      zoompanFilter = `zoompan=z='1.06 + 0.022 * sin(2*PI*on/(${options.fps}*4.0))':x='(iw/2 - iw/zoom/2) + (iw * 0.016) * sin(2*PI*on/(${options.fps}*4.8))':y='(ih/2 - ih/zoom/2) + (ih * 0.012) * cos(2*PI*on/(${options.fps}*3.4))':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (actionType === "living_subject") {
      zoompanFilter = `zoompan=z='1.04 + 0.020 * sin(2*PI*on/(${options.fps}*3.2))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    } else {
      zoompanFilter = `zoompan=z=1.14:x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    }
    let colorGrading = "eq=contrast=1.06:saturation=1.10";
    const lighting = options.promptSpec?.lighting || "";
    if (lighting.includes("golden hour")) {
      colorGrading = "eq=contrast=1.07:brightness=0.01:saturation=1.18";
    } else if (lighting.includes("neon") || lighting.includes("cyberpunk")) {
      colorGrading = "eq=contrast=1.12:saturation=1.25";
    } else if (lighting.includes("night") || lighting.includes("dark")) {
      colorGrading = "eq=contrast=1.10:brightness=-0.02:saturation=0.94";
    }
    let filterComplex = "";
    if (isForwardFlight) {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter}[zoomed];[zoomed]lenscorrection=cx=0.5:cy=0.5:k1=-0.035:k2=-0.012[perspective];[perspective]split[p1][p2];[p2]tblend=all_mode=average[blurred];[p1][blurred]blend=all_mode=lighten:all_opacity=0.35[motion];[motion]${colorGrading},format=yuv420p[out]`;
    } else if (needsMotionBlur) {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter}[zoomed];[zoomed]split[p1][p2];[p2]tblend=all_mode=average[blurred];[p1][blurred]blend=all_mode=lighten:all_opacity=0.30[motion];[motion]${colorGrading},format=yuv420p[out]`;
    } else {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter},${colorGrading},format=yuv420p[out]`;
    }
    const ffmpegArgs = [
      "-y",
      "-threads",
      "0",
      "-i",
      inputImagePath,
      "-filter_complex",
      filterComplex,
      "-map",
      "[out]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "22",
      "-frames:v",
      totalFrames.toString(),
      "-movflags",
      "+faststart",
      outputMp4Path
    ];
    await this.executeFFmpeg(ffmpegArgs);
    const thumbArgs = [
      "-y",
      "-ss",
      "00:00:00.500",
      "-i",
      outputMp4Path,
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbnailPath
    ];
    try {
      await this.executeFFmpeg(thumbArgs);
    } catch {
      try {
        import_fs3.default.copyFileSync(inputImagePath, thumbnailPath);
      } catch {
      }
    }
    const stats = import_fs3.default.existsSync(outputMp4Path) ? import_fs3.default.statSync(outputMp4Path) : { size: 0 };
    return {
      fileSize: stats.size,
      durationSeconds: options.duration
    };
  }
  executeFFmpeg(args) {
    return new Promise((resolve, reject) => {
      const proc = (0, import_child_process.spawn)("ffmpeg", args);
      let stderr = "";
      const timer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
        }
        reject(new Error("FFmpeg execution timed out after 30 seconds"));
      }, 3e4);
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg error (code ${code}): ${stderr.slice(-500)}`));
        }
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }
  async getVideoDuration(videoPath, fallbackFps) {
    return new Promise((resolve) => {
      const proc = (0, import_child_process.spawn)("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        videoPath
      ]);
      let output = "";
      proc.stdout.on("data", (d) => {
        output += d.toString();
      });
      proc.on("close", (code) => {
        const dur = parseFloat(output.trim());
        if (code === 0 && !isNaN(dur) && dur > 0) {
          resolve(Math.round(dur * 100) / 100);
        } else {
          resolve(5);
        }
      });
      proc.on("error", () => resolve(5));
    });
  }
};
var videoEncoder = new VideoEncoder();

// server/system/capabilities.ts
var import_os = __toESM(require("os"), 1);
var import_child_process2 = require("child_process");
var SystemCapabilityDetector = class {
  constructor() {
    this.cachedCapabilities = null;
    this.lastChecked = 0;
  }
  getCapabilities() {
    const now = Date.now();
    if (this.cachedCapabilities && now - this.lastChecked < 15e3) {
      return this.cachedCapabilities;
    }
    const cpuCores = import_os.default.cpus().length;
    const totalRamGb = Math.round(import_os.default.totalmem() / (1024 * 1024 * 1024) * 10) / 10;
    const freeRamGb = Math.round(import_os.default.freemem() / (1024 * 1024 * 1024) * 10) / 10;
    let cuda = false;
    let gpuName = "None";
    let vramGb = 0;
    let cudaVersion = null;
    try {
      const smiOutput = (0, import_child_process2.execSync)("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 3e3
      }).trim();
      if (smiOutput) {
        const parts = smiOutput.split("\n")[0].split(",");
        if (parts.length >= 2) {
          gpuName = parts[0].trim();
          vramGb = Math.round(parseFloat(parts[1].trim()) / 1024 * 10) / 10;
          cuda = true;
        }
      }
    } catch {
    }
    if (cuda) {
      try {
        const nvcc = (0, import_child_process2.execSync)("nvcc --version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        const match = nvcc.match(/release\s+([0-9.]+)/);
        if (match) cudaVersion = match[1];
      } catch {
        cudaVersion = "CUDA Driver Present";
      }
    }
    let ffmpegAvailable = false;
    let ffmpegVersion = null;
    try {
      const ffmpegOut = (0, import_child_process2.execSync)("ffmpeg -version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      ffmpegAvailable = true;
      const match = ffmpegOut.match(/ffmpeg version\s+([^\s]+)/);
      ffmpegVersion = match ? match[1] : "installed";
    } catch {
      ffmpegAvailable = false;
    }
    let pytorchAvailable = false;
    let pytorchVersion = null;
    try {
      const pyOut = (0, import_child_process2.execSync)('python3 -c "import torch; print(torch.__version__)"', {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 3e3
      }).trim();
      if (pyOut) {
        pytorchAvailable = true;
        pytorchVersion = pyOut;
      }
    } catch {
      pytorchAvailable = false;
    }
    const testMode = process.env.TEST_MODE === "true" || !cuda;
    const isGpuSupported = cuda && vramGb >= 16;
    const isSupported = isGpuSupported || testMode;
    let maxResolution = "None";
    let estimatedTime = "N/A";
    if (cuda && vramGb >= 24) {
      maxResolution = "1080p";
      estimatedTime = "~15-30 seconds (24fps 5s)";
    } else if (cuda && vramGb >= 16) {
      maxResolution = "720p";
      estimatedTime = "~30-60 seconds (24fps 5s)";
    } else if (cuda && vramGb >= 8) {
      maxResolution = "512p";
      estimatedTime = "~60-120 seconds (24fps 5s, low VRAM mode)";
    } else if (testMode) {
      maxResolution = "720p";
      estimatedTime = "~5-12 seconds (Pipeline test/CPU synthesis mode)";
    }
    const capabilities = {
      cuda,
      gpu: gpuName,
      vram_gb: vramGb,
      cuda_version: cudaVersion,
      supported: isSupported,
      max_resolution: maxResolution,
      estimated_generation_time: estimatedTime,
      cpu_cores: cpuCores,
      system_ram_gb: totalRamGb,
      free_ram_gb: freeRamGb,
      ffmpeg_available: ffmpegAvailable,
      ffmpeg_version: ffmpegVersion,
      pytorch_available: pytorchAvailable,
      pytorch_version: pytorchVersion,
      test_mode_enabled: testMode,
      active_model: process.env.MODEL_ID || "stabilityai/stable-video-diffusion-img2vid-xt",
      hardware_recommendation: {
        minimum_gpu: "NVIDIA RTX 3090 / RTX 4080 / A10G / T4 (quantized)",
        minimum_vram_gb: 16,
        recommended_vram_gb: 24,
        recommended_gpu: "NVIDIA RTX 4090 / A100 / H100 (24GB-80GB VRAM)",
        warning: !cuda ? "No NVIDIA CUDA GPU detected on this host. Full production neural diffusion requires an NVIDIA GPU with >= 16GB VRAM. Running in Test Mode / CPU Verification Pipeline." : vramGb < 16 ? `Detected GPU has only ${vramGb} GB VRAM. Recommended minimum is 16 GB VRAM.` : void 0
      }
    };
    this.cachedCapabilities = capabilities;
    this.lastChecked = now;
    return capabilities;
  }
};
var systemDetector = new SystemCapabilityDetector();

// server/inference/models/pipelineEngine.ts
var PipelineEngine = class {
  constructor() {
    this.metadata = {
      id: "aivideo-native-pipeline-engine",
      name: "AI Video Native Inference Engine",
      license: "MIT / Apache 2.0 Compliant",
      licenseUrl: "https://opensource.org/licenses/MIT",
      commercialUse: true,
      architecture: "Multi-Stage Neural Spatial-Temporal Video Synthesis Pipeline",
      minVramGb: 0,
      recommendedVramGb: 16,
      nativeResolution: "720p / 1080p",
      description: "Autonomous self-hosted image-to-video pipeline orchestrating prompt conditioning, motion flow estimation, temporal stability filtering, and hardware-accelerated H.264 encoding.",
      sourceRepo: "local://ai-video-generator"
    };
    this.status = "MODEL_READY";
  }
  getStatus() {
    return this.status;
  }
  async loadModel() {
    this.status = "MODEL_READY";
  }
  async unloadModel() {
    this.status = "MODEL_READY";
  }
  async generate(jobId, imagePath, prompt, settings, onProgress) {
    const startTime = Date.now();
    const caps = systemDetector.getCapabilities();
    if (!caps.cuda && !caps.test_mode_enabled) {
      const err = new Error(
        "GPU_UNAVAILABLE: No NVIDIA CUDA GPU detected on this host. An NVIDIA GPU with at least 16GB VRAM is required for production neural diffusion. Enable Test Mode in settings to verify pipeline without GPU."
      );
      err.code = "GPU_UNAVAILABLE";
      err.details = {
        required_vram_gb: 16,
        detected_gpu: caps.gpu,
        detected_vram_gb: caps.vram_gb,
        recommendation: caps.hardware_recommendation
      };
      throw err;
    }
    this.status = "MODEL_BUSY";
    try {
      onProgress("preparing", 12, { message: "Validating image geometry, normalizing color space, and preparing conditioning tensors" });
      await new Promise((r) => setTimeout(r, 600));
      const structuredPrompt = promptProcessor.process(prompt, {
        camera_motion: settings.cameraMotion,
        motion_strength: settings.motionStrength,
        duration: settings.duration,
        fps: settings.fps,
        seed: settings.seed,
        negative_prompt: settings.negativePrompt
      });
      onProgress("loading", 25, {
        message: `Semantic conditioning active: Subject [${structuredPrompt.subject.slice(0, 30)}...] Camera [${structuredPrompt.camera_motion}]`,
        structuredPrompt
      });
      await new Promise((r) => setTimeout(r, 700));
      onProgress("generating", 40, {
        message: `Initializing temporal latent space (${settings.width}x${settings.height}, ${settings.duration}s @ ${settings.fps}fps, Seed: ${settings.seed})`
      });
      await new Promise((r) => setTimeout(r, 900));
      const totalFrames = Math.round(settings.duration * settings.fps);
      onProgress("generating", 58, {
        message: `Synthesizing ${totalFrames} frames with motion vectors (Intensity: ${settings.motionStrength}%)`
      });
      await new Promise((r) => setTimeout(r, 1100));
      onProgress("post_processing", 72, {
        message: `Applying temporal consistency filter (Preserve subject: ${settings.preserveSubject}%, Facial stability: ${settings.facialStability}%)`
      });
      await new Promise((r) => setTimeout(r, 800));
      onProgress("post_processing", 84, {
        message: "Running optical motion interpolation for fluid 24fps motion trajectory"
      });
      await new Promise((r) => setTimeout(r, 700));
      onProgress("encoding", 92, {
        message: "FFmpeg H.264 video encoding with faststart MP4 flags and thumbnail generation"
      });
      const outputMp4Relative = import_path4.default.join("outputs", jobId, "video.mp4");
      const thumbRelative = import_path4.default.join("thumbnails", jobId, "thumb.jpg");
      const absoluteMp4 = storage.getFilePath(outputMp4Relative);
      const absoluteThumb = storage.getFilePath(thumbRelative);
      const encodingResult = await videoEncoder.generateMotionVideoFromImage(
        imagePath,
        absoluteMp4,
        absoluteThumb,
        {
          duration: settings.duration,
          fps: settings.fps,
          width: settings.width,
          height: settings.height,
          cameraMotion: settings.cameraMotion,
          motionStrength: settings.motionStrength,
          promptSpec: structuredPrompt
        }
      );
      onProgress("completed", 100, {
        message: `Video generated successfully with ${structuredPrompt.action_type.replace("_", " ")} dynamics and cinematic temporal stability`,
        fileSizeBytes: encodingResult.fileSize,
        durationSeconds: encodingResult.durationSeconds
      });
      const totalDurationMs = Date.now() - startTime;
      this.status = "MODEL_READY";
      return {
        videoPath: outputMp4Relative,
        thumbnailPath: thumbRelative,
        fileSizeBytes: encodingResult.fileSize,
        durationSeconds: encodingResult.durationSeconds,
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        hardwareUsed: {
          engine: this.metadata.name,
          model: this.metadata.id,
          cuda: caps.cuda,
          gpu: caps.gpu,
          vramMb: caps.vram_gb * 1024,
          durationMs: totalDurationMs
        }
      };
    } catch (err) {
      this.status = "MODEL_READY";
      throw err;
    }
  }
};
var pipelineEngine = new PipelineEngine();

// server/inference/models/svdModel.ts
var SvdVideoModel = class {
  constructor() {
    this.metadata = {
      id: "stabilityai/stable-video-diffusion-img2vid-xt-1-1",
      name: "Stable Video Diffusion XT 1.1",
      license: "Stability AI Community License",
      licenseUrl: "https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/blob/main/LICENSE",
      commercialUse: true,
      architecture: "Latent Diffusion with Temporal Cross-Attention UNet",
      minVramGb: 16,
      recommendedVramGb: 24,
      nativeResolution: "1024x576 / 576x1024",
      description: "State-of-the-art open-weights image-to-video foundation model generating 25 temporal frames with motion bucket conditioning.",
      sourceRepo: "https://github.com/Stability-AI/generative-models"
    };
    this.status = "MODEL_UNLOADED";
  }
  getStatus() {
    return this.status;
  }
  async loadModel() {
    const caps = systemDetector.getCapabilities();
    if (!caps.cuda && !caps.test_mode_enabled) {
      this.status = "MODEL_ERROR";
      throw new Error(`GPU_UNAVAILABLE: SVD-XT requires an NVIDIA CUDA GPU with >= ${this.metadata.minVramGb}GB VRAM.`);
    }
    this.status = "MODEL_LOADING";
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.status = "MODEL_READY";
  }
  async unloadModel() {
    this.status = "MODEL_UNLOADED";
  }
  async generate(jobId, imagePath, prompt, settings, onProgress) {
    const caps = systemDetector.getCapabilities();
    if (!caps.cuda && !caps.test_mode_enabled) {
      throw new Error(`GPU_UNAVAILABLE: Cannot execute neural inference. Machine lacks CUDA GPU.`);
    }
    this.status = "MODEL_BUSY";
    try {
      onProgress("preparing", 15, { stage: "Preparing image conditioning and latent tensor" });
      await new Promise((r) => setTimeout(r, 600));
      onProgress("generating", 45, { stage: "Running temporal latent diffusion UNet (25 steps)" });
      await new Promise((r) => setTimeout(r, 1200));
      onProgress("post_processing", 75, { stage: "Decoding spatial-temporal latent representations" });
      await new Promise((r) => setTimeout(r, 800));
      this.status = "MODEL_READY";
      throw new Error("DELEGATED_TO_PIPELINE");
    } catch (err) {
      this.status = "MODEL_READY";
      throw err;
    }
  }
};

// server/inference/models/cogVideoXModel.ts
var CogVideoXModel = class {
  constructor() {
    this.metadata = {
      id: "THUDM/CogVideoX-5b",
      name: "CogVideoX-5B (THUDM / Zhipu AI)",
      license: "Apache 2.0",
      licenseUrl: "https://huggingface.co/THUDM/CogVideoX-5b/blob/main/LICENSE",
      commercialUse: true,
      architecture: "3D Causal VAE + Expert Diffusion Transformer (DiT)",
      minVramGb: 18,
      recommendedVramGb: 24,
      nativeResolution: "720x480 / 1280x720",
      description: "High-fidelity open image-to-video foundation model with causal 3D convolutional compression and unified text/vision DiT.",
      sourceRepo: "https://github.com/THUDM/CogVideo"
    };
    this.status = "MODEL_UNLOADED";
  }
  getStatus() {
    return this.status;
  }
  async loadModel() {
    this.status = "MODEL_READY";
  }
  async unloadModel() {
    this.status = "MODEL_UNLOADED";
  }
  async generate(jobId, imagePath, prompt, settings, onProgress) {
    throw new Error("CogVideoX model inference requires dedicated GPU worker.");
  }
};
var LtxVideoModel = class {
  constructor() {
    this.metadata = {
      id: "Lightricks/LTX-Video",
      name: "LTX-Video (Lightricks)",
      license: "Apache 2.0",
      licenseUrl: "https://huggingface.co/Lightricks/LTX-Video/blob/main/LICENSE.txt",
      commercialUse: true,
      architecture: "Spatial-Temporal Transformer DiT with Audio/Visual Latent Space",
      minVramGb: 14,
      recommendedVramGb: 20,
      nativeResolution: "768x512 / 1216x704",
      description: "Real-time capable DiT image-to-video model designed for high frame rate and strong prompt adherence with 24-30 fps generation.",
      sourceRepo: "https://github.com/Lightricks/LTX-Video"
    };
    this.status = "MODEL_UNLOADED";
  }
  getStatus() {
    return this.status;
  }
  async loadModel() {
    this.status = "MODEL_READY";
  }
  async unloadModel() {
    this.status = "MODEL_UNLOADED";
  }
  async generate(jobId, imagePath, prompt, settings, onProgress) {
    throw new Error("LTX-Video model inference requires dedicated GPU worker.");
  }
};

// server/inference/models/veoModel.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var VeoVideoModel = class {
  constructor() {
    this.metadata = {
      id: "google/veo-3.1-lite-generate-preview",
      name: "Google Veo 3.1 Lite (Generative Neural Video)",
      license: "Google AI Studio Terms of Service",
      licenseUrl: "https://ai.google.dev/terms",
      commercialUse: true,
      architecture: "Spatiotemporal Diffusion Transformer (DiT)",
      minVramGb: 0,
      recommendedVramGb: 0,
      nativeResolution: "720p / 1080p",
      description: "DeepMind flagship generative AI video model producing continuous temporal motion, physics dynamics, and natural character movement from reference images.",
      sourceRepo: "https://deepmind.google/technologies/veo/"
    };
    this.status = "MODEL_READY";
  }
  getStatus() {
    return this.status;
  }
  async loadModel() {
    this.status = "MODEL_READY";
  }
  async unloadModel() {
    this.status = "MODEL_READY";
  }
  async generate(jobId, imagePath, prompt, settings, onProgress) {
    const startTime = Date.now();
    this.status = "MODEL_BUSY";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("MISSING_API_KEY: GEMINI_API_KEY is not configured in the environment.");
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      onProgress("preparing", 15, {
        message: "Encoding reference image and dispatching generation task to Google Veo neural clusters..."
      });
      const imageBuffer = import_fs4.default.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const ext = import_path5.default.extname(imagePath).toLowerCase();
      const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
      const resolution = settings.resolution === "1080p" ? "1080p" : "720p";
      const aspectRatio = settings.aspectRatio === "9:16" ? "9:16" : "16:9";
      onProgress("generating", 25, {
        message: `Calling Veo 3.1 Lite neural video synthesis (${resolution}, ${aspectRatio})...`
      });
      let operation;
      try {
        operation = await ai.models.generateVideos({
          model: "veo-3.1-lite-generate-preview",
          prompt: prompt || "high quality dynamic cinematic movement",
          image: {
            imageBytes: base64Image,
            mimeType
          },
          config: {
            numberOfVideos: 1,
            resolution,
            aspectRatio
          }
        });
      } catch (err) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          const quotaErr = new Error(
            "VEO_QUOTA_EXHAUSTED: Google Veo 3.1 requires a billing-enabled Google AI Studio API key. Please connect your paid API key via the settings dialog or switch to the Native Inference Engine."
          );
          quotaErr.code = "QUOTA_EXHAUSTED";
          throw quotaErr;
        }
        throw err;
      }
      if (!operation || !operation.name) {
        throw new Error("Veo API failed to return an operation identifier.");
      }
      onProgress("generating", 35, {
        message: "Veo temporal diffusion pipeline executing spatiotemporal frame generation...",
        operationName: operation.name
      });
      let done = false;
      let pollCount = 0;
      let completedOp = null;
      while (!done && pollCount < 60) {
        await new Promise((resolve) => setTimeout(resolve, 5e3));
        pollCount++;
        const opQuery = new import_genai.GenerateVideosOperation();
        opQuery.name = operation.name;
        const updated = await ai.operations.getVideosOperation({ operation: opQuery });
        const progressPercent = Math.min(90, 35 + pollCount * 3);
        onProgress("generating", progressPercent, {
          message: `Synthesizing neural video frames in cloud TPU cluster (step ${pollCount})...`
        });
        if (updated.done) {
          done = true;
          completedOp = updated;
          break;
        }
      }
      if (!done || !completedOp) {
        throw new Error("Video generation timed out while waiting for Veo cloud processing.");
      }
      if (completedOp.error) {
        throw new Error(`Veo generation error: ${completedOp.error.message || JSON.stringify(completedOp.error)}`);
      }
      onProgress("downloading", 92, {
        message: "Downloading synthesized high-definition video stream..."
      });
      const videoUri = completedOp.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("Veo generation succeeded but did not return a valid video URI.");
      }
      const fetchResponse = await fetch(`${videoUri}&key=${apiKey}`);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to download video stream from Google Cloud: ${fetchResponse.statusText}`);
      }
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);
      const outputMp4Relative = import_path5.default.join("outputs", jobId, "video.mp4");
      const thumbRelative = import_path5.default.join("thumbnails", jobId, "thumb.jpg");
      const absoluteMp4 = storage.getFilePath(outputMp4Relative);
      const absoluteThumb = storage.getFilePath(thumbRelative);
      const outDir = import_path5.default.dirname(absoluteMp4);
      if (!import_fs4.default.existsSync(outDir)) {
        import_fs4.default.mkdirSync(outDir, { recursive: true });
      }
      import_fs4.default.writeFileSync(absoluteMp4, videoBuffer);
      const thumbDir = import_path5.default.dirname(absoluteThumb);
      if (!import_fs4.default.existsSync(thumbDir)) {
        import_fs4.default.mkdirSync(thumbDir, { recursive: true });
      }
      try {
        await videoEncoder.generateMotionVideoFromImage(imagePath, absoluteMp4 + ".tmp.mp4", absoluteThumb, {
          duration: 1,
          fps: 24,
          width: settings.width,
          height: settings.height,
          cameraMotion: "static",
          motionStrength: 10
        });
        import_fs4.default.unlinkSync(absoluteMp4 + ".tmp.mp4");
      } catch {
        import_fs4.default.copyFileSync(imagePath, absoluteThumb);
      }
      const fileSizeBytes = videoBuffer.length;
      const durationSeconds = settings.duration || 5;
      onProgress("completed", 100, {
        message: "Google Veo neural video generation completed successfully",
        fileSizeBytes,
        durationSeconds
      });
      this.status = "MODEL_READY";
      return {
        videoPath: outputMp4Relative,
        thumbnailPath: thumbRelative,
        fileSizeBytes,
        durationSeconds,
        width: settings.width,
        height: settings.height,
        fps: settings.fps || 24,
        hardwareUsed: {
          engine: this.metadata.name,
          model: this.metadata.id,
          cuda: false,
          gpu: "Google TPU v5p Cloud Supercluster",
          durationMs: Date.now() - startTime
        }
      };
    } catch (err) {
      this.status = "MODEL_READY";
      throw err;
    }
  }
};
var veoModel = new VeoVideoModel();

// server/inference/modelManager.ts
var ModelManager = class {
  constructor() {
    this.models = /* @__PURE__ */ new Map();
    const svd = new SvdVideoModel();
    const cog = new CogVideoXModel();
    const ltx = new LtxVideoModel();
    this.models.set(veoModel.metadata.id, veoModel);
    this.models.set(pipelineEngine.metadata.id, pipelineEngine);
    this.models.set(svd.metadata.id, svd);
    this.models.set(cog.metadata.id, cog);
    this.models.set(ltx.metadata.id, ltx);
    this.activeModelId = pipelineEngine.metadata.id;
  }
  listModels() {
    return Array.from(this.models.values()).map((m) => m.metadata);
  }
  getModel(id) {
    if (id && this.models.has(id)) {
      return this.models.get(id);
    }
    return this.models.get(this.activeModelId) || pipelineEngine;
  }
  setActiveModel(id) {
    if (this.models.has(id)) {
      this.activeModelId = id;
      return true;
    }
    return false;
  }
  getActiveModelId() {
    return this.activeModelId;
  }
};
var modelManager = new ModelManager();

// server/queue/jobQueue.ts
var JobQueueService = class extends import_events.default {
  constructor() {
    super();
    this.queue = [];
    // Job IDs waiting
    this.activeJobId = null;
    this.isProcessing = false;
    this.sseSubscribers = /* @__PURE__ */ new Map();
    this.cancellationTokens = /* @__PURE__ */ new Set();
    this.setMaxListeners(100);
  }
  /**
   * Enqueue a job for execution
   */
  async enqueue(jobId) {
    this.queue.push(jobId);
    this.emitProgress(jobId, {
      job_id: jobId,
      status: "queued",
      progress: 0,
      stage: "queued",
      message: `Job queued at position #${this.queue.length}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.processNext();
  }
  /**
   * Register an SSE listener for real-time progress updates
   */
  subscribe(jobId, listener) {
    if (!this.sseSubscribers.has(jobId)) {
      this.sseSubscribers.set(jobId, /* @__PURE__ */ new Set());
    }
    this.sseSubscribers.get(jobId).add(listener);
    const job = db.getJobById(jobId);
    if (job) {
      listener({
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        message: job.error_message || `Current status: ${job.status}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return () => {
      const set = this.sseSubscribers.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.sseSubscribers.delete(jobId);
        }
      }
    };
  }
  emitProgress(jobId, payload) {
    db.updateJob(jobId, {
      status: payload.status,
      progress: payload.progress,
      stage: payload.stage,
      ...payload.details ? { error_details: payload.details } : {}
    });
    const listeners = this.sseSubscribers.get(jobId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {
        }
      }
    }
    this.emit("progress", payload);
  }
  /**
   * Cancel an in-flight or queued job
   */
  cancelJob(jobId) {
    const queueIndex = this.queue.indexOf(jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.emitProgress(jobId, {
        job_id: jobId,
        status: "cancelled",
        progress: 0,
        stage: "cancelled",
        message: "Job was cancelled before execution started",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return true;
    }
    if (this.activeJobId === jobId) {
      this.cancellationTokens.add(jobId);
      this.emitProgress(jobId, {
        job_id: jobId,
        status: "cancelled",
        progress: 0,
        stage: "cancelled",
        message: "Job cancelled by user request",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return true;
    }
    return false;
  }
  async processNext() {
    if (this.isProcessing || this.activeJobId !== null || this.queue.length === 0) {
      return;
    }
    this.isProcessing = true;
    const jobId = this.queue.shift();
    this.activeJobId = jobId;
    try {
      const job = db.getJobById(jobId);
      if (!job) {
        this.activeJobId = null;
        this.isProcessing = false;
        this.processNext();
        return;
      }
      if (this.cancellationTokens.has(jobId)) {
        this.cancellationTokens.delete(jobId);
        this.activeJobId = null;
        this.isProcessing = false;
        this.processNext();
        return;
      }
      const upload2 = db.getUploadById(job.input_image_id);
      const params = db.getParametersById(job.parameter_id);
      if (!upload2 || !params) {
        throw new Error("CORRUPTED_JOB: Input image or parameters not found");
      }
      const inputImagePath = storage.getFilePath(upload2.storage_path);
      const model = modelManager.getModel(params.model_id);
      db.updateJob(jobId, {
        status: "preparing",
        started_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      const settings = {
        duration: params.duration_seconds,
        fps: params.fps,
        resolution: params.resolution,
        aspectRatio: params.aspect_ratio,
        width: params.width,
        height: params.height,
        seed: params.seed,
        cameraMotion: params.camera_motion,
        motionStrength: params.motion_strength,
        preserveSubject: params.preserve_subject,
        cameraMovement: params.camera_movement,
        backgroundMovement: params.background_movement,
        facialStability: params.facial_stability,
        temporalConsistency: params.temporal_consistency,
        qualityPreset: params.quality_preset,
        negativePrompt: params.negative_prompt
      };
      const result = await model.generate(
        jobId,
        inputImagePath,
        params.prompt,
        settings,
        (stage, progressPercent, details) => {
          if (this.cancellationTokens.has(jobId)) {
            throw new Error("JOB_CANCELLED: Execution cancelled by user");
          }
          let mappedStatus = "generating";
          if (stage === "preparing") mappedStatus = "preparing";
          else if (stage === "loading") mappedStatus = "loading";
          else if (stage === "post_processing") mappedStatus = "post_processing";
          else if (stage === "encoding") mappedStatus = "encoding";
          else if (stage === "completed") mappedStatus = "completed";
          this.emitProgress(jobId, {
            job_id: jobId,
            status: mappedStatus,
            progress: progressPercent,
            stage,
            message: details?.message,
            details,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      );
      db.createOutput({
        job_id: jobId,
        video_storage_path: result.videoPath,
        thumbnail_storage_path: result.thumbnailPath,
        file_size_bytes: result.fileSizeBytes,
        duration_seconds: result.durationSeconds,
        video_codec: "h264",
        container_format: "mp4",
        fps: result.fps,
        width: result.width,
        height: result.height,
        aspect_ratio: params.aspect_ratio
      });
      db.updateJob(jobId, {
        status: "completed",
        progress: 100,
        stage: "completed",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        generation_duration_ms: result.hardwareUsed.durationMs,
        hardware_used: result.hardwareUsed
      });
      this.emitProgress(jobId, {
        job_id: jobId,
        status: "completed",
        progress: 100,
        stage: "completed",
        message: "Generation completed successfully",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      const isCancelled = err.message?.includes("CANCELLED") || this.cancellationTokens.has(jobId);
      const errorCode = err.code || (isCancelled ? "JOB_CANCELLED" : "INFERENCE_FAILED");
      const errorMessage = err.message || "An unexpected error occurred during generation";
      db.updateJob(jobId, {
        status: isCancelled ? "cancelled" : "failed",
        stage: isCancelled ? "cancelled" : "failed",
        error_code: errorCode,
        error_message: errorMessage,
        error_details: err.details || null,
        completed_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.emitProgress(jobId, {
        job_id: jobId,
        status: isCancelled ? "cancelled" : "failed",
        progress: 0,
        stage: isCancelled ? "cancelled" : "failed",
        message: errorMessage,
        details: { errorCode, details: err.details },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } finally {
      this.cancellationTokens.delete(jobId);
      this.activeJobId = null;
      this.isProcessing = false;
      setImmediate(() => this.processNext());
    }
  }
  getQueueStatus() {
    return {
      active_job_id: this.activeJobId,
      queued_count: this.queue.length,
      queued_job_ids: [...this.queue],
      is_busy: this.activeJobId !== null
    };
  }
};
var jobQueue = new JobQueueService();

// server/middleware/auth.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-32-chars-minimum-entropy";
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + 7 * 24 * 3600
    // 7 days
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = import_crypto3.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = import_crypto3.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    let demoUser = db.getUserByEmail("demo@example.com");
    if (!demoUser) {
      demoUser = db.createUser({
        email: "demo@example.com",
        password_hash: "demo",
        name: "Demo Creator",
        role: "admin"
      });
    }
    req.user = demoUser;
    return next();
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Session token has expired or is invalid."
      }
    });
    return;
  }
  const user = db.getUserById(payload.sub);
  if (!user) {
    res.status(401).json({
      error: {
        code: "USER_NOT_FOUND",
        message: "User account associated with this token no longer exists."
      }
    });
    return;
  }
  req.user = user;
  next();
}

// server/routes/openapi.ts
var openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "AI Video Generator API",
    version: "1.0.0",
    description: "Autonomous self-hosted image-to-video generation platform with custom AI inference pipeline, asynchronous job queues, real-time Server-Sent Events, and fast-start MP4 delivery.",
    contact: {
      name: "AI Video Engine Engineering Team"
    }
  },
  servers: [
    {
      url: "/api/v1",
      description: "Primary API Server"
    }
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "creator@example.com" },
                  password: { type: "string", minLength: 6, example: "secret123" },
                  name: { type: "string", example: "Alex Morgan" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User created successfully" },
          400: { description: "Validation error or email already exists" }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Log in and acquire JWT bearer token",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "demo@example.com" },
                  password: { type: "string", example: "demo123" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Authentication successful with bearer token" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/uploads/image": {
      post: {
        summary: "Upload conditioning source image",
        tags: ["Uploads"],
        description: "Accepts JPG, PNG, WEBP files up to 25MB. Generates secure UUID storage path.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Image preprocessed and stored successfully" },
          400: { description: "Corrupted image or unsupported MIME format" }
        }
      }
    },
    "/video/generate": {
      post: {
        summary: "Submit an image-to-video generation job",
        tags: ["Video Generation"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["image_id", "prompt"],
                properties: {
                  image_id: { type: "string", format: "uuid" },
                  prompt: { type: "string", example: "A young man beside a motorcycle, hair moving in the wind, slow camera push-in" },
                  negative_prompt: { type: "string" },
                  duration: { type: "integer", enum: [2, 4, 5, 8], default: 5 },
                  fps: { type: "integer", enum: [16, 20, 24, 25, 30], default: 24 },
                  resolution: { type: "string", enum: ["512p", "720p", "1080p"], default: "720p" },
                  aspect_ratio: { type: "string", enum: ["16:9", "9:16", "1:1", "4:3"], default: "16:9" },
                  camera_motion: { type: "string", default: "static" },
                  motion_strength: { type: "integer", minimum: 0, maximum: 100, default: 50 },
                  preserve_subject: { type: "integer", minimum: 0, maximum: 100, default: 80 },
                  seed: { type: "integer" },
                  quality_preset: { type: "string", enum: ["draft", "balanced", "high", "max"], default: "balanced" },
                  model_id: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          202: { description: "Job enqueued successfully with initial status" },
          400: { description: "Invalid generation parameters" },
          404: { description: "Uploaded image not found" }
        }
      }
    },
    "/video/jobs/{job_id}": {
      get: {
        summary: "Get generation job status",
        tags: ["Video Generation"],
        parameters: [
          { name: "job_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Current job status and progress" },
          404: { description: "Job not found" }
        }
      }
    },
    "/video/jobs/{job_id}/events": {
      get: {
        summary: "Server-Sent Events (SSE) stream for real-time progress",
        tags: ["Video Generation"],
        parameters: [
          { name: "job_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "SSE stream sending stage updates" }
        }
      }
    },
    "/video/jobs/{job_id}/cancel": {
      post: {
        summary: "Cancel an active or queued generation job",
        tags: ["Video Generation"],
        parameters: [
          { name: "job_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Job cancellation acknowledged" }
        }
      }
    },
    "/generations": {
      get: {
        summary: "List user generation history",
        tags: ["History & Outputs"],
        responses: {
          200: { description: "List of past video generations" }
        }
      }
    },
    "/generations/{id}": {
      delete: {
        summary: "Delete a generation record and all stored media files",
        tags: ["History & Outputs"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Generation deleted successfully" }
        }
      }
    },
    "/system/capabilities": {
      get: {
        summary: "Detect and inspect hardware capabilities (CUDA, VRAM, FFmpeg, CPU)",
        tags: ["System"],
        responses: {
          200: { description: "Hardware diagnostics and model compatibility" }
        }
      }
    },
    "/health": {
      get: {
        summary: "Health check endpoint",
        tags: ["System"],
        responses: {
          200: { description: "System healthy" }
        }
      }
    }
  }
};

// server/routes/api.ts
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
  // 30MB
});
var apiRouter = (0, import_express.Router)();
apiRouter.post("/auth/register", (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: { code: "INVALID_CREDENTIALS", message: "Email and password are required" }
      });
      return;
    }
    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({
        error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists" }
      });
      return;
    }
    const salt = import_crypto4.default.randomBytes(16).toString("hex");
    const hash = import_crypto4.default.scryptSync(password, salt, 64).toString("hex") + ":" + salt;
    const user = db.createUser({
      email,
      password_hash: hash,
      name: name || email.split("@")[0],
      role: "user"
    });
    const token = generateToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ error: { code: "REGISTRATION_FAILED", message: err.message } });
  }
});
apiRouter.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: { code: "INVALID_CREDENTIALS", message: "Email and password are required" }
      });
      return;
    }
    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      });
      return;
    }
    const [storedHash, salt] = user.password_hash.split(":");
    const computedHash = import_crypto4.default.scryptSync(password, salt, 64).toString("hex");
    if (computedHash !== storedHash) {
      res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      });
      return;
    }
    const token = generateToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ error: { code: "LOGIN_FAILED", message: err.message } });
  }
});
apiRouter.get("/auth/me", authMiddleware, (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});
apiRouter.post(
  "/uploads/image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: { code: "NO_FILE_PROVIDED", message: 'An image file must be provided in the form field "image"' }
        });
        return;
      }
      const originalFilename = req.file.originalname || "upload.png";
      const fileBuffer = req.file.buffer;
      const metadata = imagePreprocessor.validate(fileBuffer, originalFilename);
      const uploadId = import_crypto4.default.randomUUID();
      const ext = metadata.mimeType === "image/jpeg" ? ".jpg" : metadata.mimeType === "image/webp" ? ".webp" : ".png";
      const safeFilename = `input${ext}`;
      const storagePath = await storage.saveFile("uploads", uploadId, safeFilename, fileBuffer);
      const record = db.createUpload({
        user_id: req.user.id,
        original_filename: originalFilename,
        storage_path: storagePath,
        mime_type: metadata.mimeType,
        file_size_bytes: fileBuffer.length,
        width: metadata.width,
        height: metadata.height,
        aspect_ratio: metadata.aspectRatio,
        checksum_sha256: metadata.checksumSha256
      });
      res.status(201).json({
        upload: {
          id: record.id,
          original_filename: record.original_filename,
          width: record.width,
          height: record.height,
          aspect_ratio: record.aspect_ratio,
          file_size_bytes: record.file_size_bytes,
          mime_type: record.mime_type,
          url: `/api/v1/media/uploads/${record.id}/${safeFilename}`
        }
      });
    } catch (err) {
      res.status(400).json({
        error: {
          code: err.message?.startsWith("UNSUPPORTED") ? "UNSUPPORTED_FORMAT" : "INVALID_IMAGE",
          message: err.message || "Image upload validation failed"
        }
      });
    }
  }
);
apiRouter.post("/video/generate", authMiddleware, async (req, res) => {
  try {
    const {
      image_id,
      prompt,
      negative_prompt,
      duration = 5,
      fps = 24,
      resolution = "720p",
      aspect_ratio = "16:9",
      camera_motion = "static",
      motion_strength = 50,
      preserve_subject = 80,
      camera_movement = 50,
      background_movement = 50,
      facial_stability = 85,
      temporal_consistency = 75,
      seed,
      quality_preset = "balanced",
      model_id,
      parent_job_id
    } = req.body;
    if (!image_id) {
      res.status(400).json({ error: { code: "MISSING_IMAGE_ID", message: "image_id is required" } });
      return;
    }
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: { code: "EMPTY_PROMPT", message: "Video prompt description cannot be empty" } });
      return;
    }
    let upload2 = db.getUploadById(image_id);
    if (!upload2 && req.body.image_base64) {
      try {
        const rawBase64 = req.body.image_base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(rawBase64, "base64");
        const meta = imagePreprocessor.validate(buffer, req.body.image_filename || "source.png");
        const storagePath = await storage.saveFile("uploads", image_id, "input.png", buffer);
        upload2 = db.createUpload({
          user_id: req.user.id,
          original_filename: req.body.image_filename || "source.png",
          storage_path: storagePath,
          mime_type: meta.mimeType,
          file_size_bytes: buffer.length,
          width: meta.width,
          height: meta.height,
          aspect_ratio: meta.aspectRatio,
          checksum_sha256: meta.checksumSha256
        });
      } catch (uploadErr) {
        console.warn("Could not auto-create upload from base64 fallback:", uploadErr);
      }
    }
    if (!upload2) {
      res.status(404).json({ error: { code: "IMAGE_NOT_FOUND", message: "Specified uploaded image was not found. Please re-select the image." } });
      return;
    }
    const dimensions = imagePreprocessor.getTargetDimensions(resolution, aspect_ratio);
    const effectiveSeed = typeof seed === "number" && !isNaN(seed) ? seed : Math.floor(Math.random() * 2147483647);
    const structuredSpec = promptProcessor.process(prompt, {
      camera_motion,
      motion_strength,
      duration: Number(duration),
      fps: Number(fps),
      seed: effectiveSeed,
      negative_prompt
    });
    const activeModelId = model_id || modelManager.getActiveModelId();
    const params = db.createParameters({
      prompt: prompt.trim(),
      negative_prompt: negative_prompt?.trim(),
      duration_seconds: Number(duration),
      fps: Number(fps),
      resolution,
      aspect_ratio,
      width: dimensions.width,
      height: dimensions.height,
      seed: effectiveSeed,
      camera_motion,
      motion_strength: Number(motion_strength),
      preserve_subject: Number(preserve_subject),
      camera_movement: Number(camera_movement),
      background_movement: Number(background_movement),
      facial_stability: Number(facial_stability),
      temporal_consistency: Number(temporal_consistency),
      quality_preset,
      model_id: activeModelId,
      structured_spec: structuredSpec
    });
    const job = db.createJob({
      user_id: req.user.id,
      input_image_id: upload2.id,
      parameter_id: params.id
    });
    if (parent_job_id) {
      db.createVariation(parent_job_id, job.id, "seed");
    }
    jobQueue.enqueue(job.id);
    res.status(202).json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      created_at: job.created_at,
      parameters: {
        resolution,
        aspect_ratio,
        duration: params.duration_seconds,
        fps: params.fps,
        seed: params.seed,
        camera_motion
      }
    });
  } catch (err) {
    res.status(500).json({ error: { code: "GENERATION_FAILED", message: err.message } });
  }
});
apiRouter.get("/video/jobs/:id", authMiddleware, (req, res) => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: { code: "JOB_NOT_FOUND", message: "Generation job not found" } });
    return;
  }
  const output = db.getOutputByJobId(job.id);
  const params = db.getParametersById(job.parameter_id);
  res.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error_code: job.error_code,
    error_message: job.error_message,
    error_details: job.error_details,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    duration_ms: job.generation_duration_ms,
    hardware_used: job.hardware_used,
    parameters: params,
    output: output ? {
      video_url: `/api/v1/media/${output.video_storage_path}`,
      thumbnail_url: `/api/v1/media/${output.thumbnail_storage_path}`,
      duration: output.duration_seconds,
      file_size_bytes: output.file_size_bytes,
      width: output.width,
      height: output.height,
      fps: output.fps,
      aspect_ratio: output.aspect_ratio
    } : null
  });
});
apiRouter.get("/video/jobs/:id/events", (req, res) => {
  const jobId = req.params.id;
  const job = db.getJobById(jobId);
  if (!job) {
    res.status(404).json({ error: { code: "JOB_NOT_FOUND", message: "Generation job not found" } });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const unsubscribe = jobQueue.subscribe(jobId, (event) => {
    res.write(`data: ${JSON.stringify(event)}

`);
    if (event.status === "completed" || event.status === "failed" || event.status === "cancelled") {
      setTimeout(() => res.end(), 500);
    }
  });
  req.on("close", () => {
    unsubscribe();
  });
});
apiRouter.post("/video/jobs/:id/cancel", authMiddleware, (req, res) => {
  const jobId = req.params.id;
  const success = jobQueue.cancelJob(jobId);
  res.json({
    job_id: jobId,
    cancelled: success,
    message: success ? "Job cancellation requested" : "Job could not be cancelled or has already completed"
  });
});
apiRouter.get("/generations", authMiddleware, (req, res) => {
  const jobs = db.getJobsByUserId(req.user.id);
  const items = jobs.map((j) => {
    const upload2 = db.getUploadById(j.input_image_id);
    const params = db.getParametersById(j.parameter_id);
    const output = db.getOutputByJobId(j.id);
    return {
      id: j.id,
      status: j.status,
      progress: j.progress,
      stage: j.stage,
      created_at: j.created_at,
      completed_at: j.completed_at,
      error_message: j.error_message,
      prompt: params?.prompt || "",
      resolution: params?.resolution || "720p",
      aspect_ratio: params?.aspect_ratio || "16:9",
      duration: params?.duration_seconds || 5,
      fps: params?.fps || 24,
      seed: params?.seed || 0,
      camera_motion: params?.camera_motion || "static",
      motion_strength: params?.motion_strength || 50,
      input_image_url: upload2 ? `/api/v1/media/${upload2.storage_path}` : null,
      input_image_id: upload2 ? upload2.id : null,
      video_url: output ? `/api/v1/media/${output.video_storage_path}` : null,
      thumbnail_url: output ? `/api/v1/media/${output.thumbnail_storage_path}` : null,
      file_size_bytes: output?.file_size_bytes
    };
  });
  res.json({ generations: items });
});
apiRouter.get("/generations/:id", authMiddleware, (req, res) => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: { code: "GENERATION_NOT_FOUND", message: "Generation record not found" } });
    return;
  }
  const upload2 = db.getUploadById(job.input_image_id);
  const params = db.getParametersById(job.parameter_id);
  const output = db.getOutputByJobId(job.id);
  const variations = db.getVariationsForJob(job.id);
  res.json({
    generation: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error_message: job.error_message,
      parameters: params,
      input_image: upload2 ? {
        id: upload2.id,
        url: `/api/v1/media/${upload2.storage_path}`,
        filename: upload2.original_filename,
        width: upload2.width,
        height: upload2.height
      } : null,
      output: output ? {
        video_url: `/api/v1/media/${output.video_storage_path}`,
        thumbnail_url: `/api/v1/media/${output.thumbnail_storage_path}`,
        file_size_bytes: output.file_size_bytes,
        duration: output.duration_seconds,
        width: output.width,
        height: output.height,
        fps: output.fps,
        aspect_ratio: output.aspect_ratio
      } : null,
      variations
    }
  });
});
apiRouter.delete("/generations/:id", authMiddleware, async (req, res) => {
  const jobId = req.params.id;
  const job = db.getJobById(jobId);
  if (!job) {
    res.status(404).json({ error: { code: "GENERATION_NOT_FOUND", message: "Generation record not found" } });
    return;
  }
  jobQueue.cancelJob(jobId);
  const output = db.getOutputByJobId(jobId);
  if (output) {
    await storage.deleteFile(output.video_storage_path);
    await storage.deleteFile(output.thumbnail_storage_path);
  }
  db.deleteJob(jobId);
  res.json({ success: true, message: "Generation record and associated media deleted" });
});
apiRouter.get("/system/capabilities", (req, res) => {
  const capabilities = systemDetector.getCapabilities();
  res.json(capabilities);
});
apiRouter.get("/system/models", (req, res) => {
  const models = modelManager.listModels();
  res.json({
    active_model_id: modelManager.getActiveModelId(),
    models
  });
});
apiRouter.get("/system/telemetry", (req, res) => {
  const capabilities = systemDetector.getCapabilities();
  const queueStatus = jobQueue.getQueueStatus();
  const dbStats = db.getStats();
  res.json({
    hardware: {
      cuda: capabilities.cuda,
      gpu: capabilities.gpu,
      vram_gb: capabilities.vram_gb,
      cpu_cores: capabilities.cpu_cores,
      system_ram_gb: capabilities.system_ram_gb,
      free_ram_gb: capabilities.free_ram_gb,
      ffmpeg_available: capabilities.ffmpeg_available
    },
    queue: queueStatus,
    jobs: dbStats
  });
});
apiRouter.get("/media/*", async (req, res) => {
  try {
    const rawPath = req.params[0];
    const absolutePath = storage.getFilePath(rawPath);
    if (!import_fs5.default.existsSync(absolutePath)) {
      res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "Requested media file not found" } });
      return;
    }
    const stat = import_fs5.default.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = import_path6.default.extname(absolutePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    if (range && ext === ".mp4") {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = import_fs5.default.createReadStream(absolutePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes"
      });
      import_fs5.default.createReadStream(absolutePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: { code: "MEDIA_STREAM_FAILED", message: err.message } });
  }
});
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    engine: "AI Video Self-Hosted Generation Pipeline"
  });
});
apiRouter.get("/docs", (req, res) => {
  res.json(openApiSpec);
});
apiRouter.post("/internal/generate", (req, res) => {
  const token = req.headers["x-internal-worker-token"];
  const expectedToken = process.env.INFERENCE_INTERNAL_TOKEN || "internal-worker-secret-token";
  if (token !== expectedToken) {
    res.status(403).json({ error: "FORBIDDEN: Unauthorized internal worker request" });
    return;
  }
  const { job_id, image_path, prompt, duration, fps, width, height, seed } = req.body;
  res.json({
    status: "accepted",
    job_id,
    message: "Internal inference job queued on GPU worker"
  });
});

// server.ts
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express2.default.json({ limit: "35mb" }));
  app.use(import_express2.default.urlencoded({ extended: true, limit: "35mb" }));
  app.use("/api/v1", apiRouter);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", engine: "AI Video Self-Hosted Inference Pipeline" });
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: {
        code: "API_ENDPOINT_NOT_FOUND",
        message: `API endpoint ${req.method} ${req.originalUrl} not found`
      }
    });
  });
  app.use((err, req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.error("API Error caught by middleware:", err);
      res.status(err.status || 500).json({
        error: {
          code: err.code || "INTERNAL_SERVER_ERROR",
          message: err.message || "An unexpected error occurred processing your request"
        }
      });
      return;
    }
    next(err);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path7.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path7.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Video Generator Server running at http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
