-- ==========================================================
-- AI Video Generator - Production PostgreSQL Database Schema
-- Version: 1.0.0
-- Compliant with Architecture Spec Section 21
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Uploads Table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    aspect_ratio VARCHAR(20),
    checksum_sha256 VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Generation Parameters Table
CREATE TABLE IF NOT EXISTS generation_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    duration_seconds INT NOT NULL DEFAULT 5,
    fps INT NOT NULL DEFAULT 24,
    resolution VARCHAR(20) NOT NULL DEFAULT '720p',
    aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
    width INT NOT NULL,
    height INT NOT NULL,
    seed BIGINT NOT NULL,
    camera_motion VARCHAR(50) DEFAULT 'static',
    motion_strength INT DEFAULT 50 CHECK (motion_strength BETWEEN 0 AND 100),
    preserve_subject INT DEFAULT 80 CHECK (preserve_subject BETWEEN 0 AND 100),
    camera_movement INT DEFAULT 50 CHECK (camera_movement BETWEEN 0 AND 100),
    background_movement INT DEFAULT 50 CHECK (background_movement BETWEEN 0 AND 100),
    facial_stability INT DEFAULT 85 CHECK (facial_stability BETWEEN 0 AND 100),
    temporal_consistency INT DEFAULT 75 CHECK (temporal_consistency BETWEEN 0 AND 100),
    quality_preset VARCHAR(50) DEFAULT 'balanced',
    model_id VARCHAR(100) NOT NULL,
    structured_spec JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Generation Jobs Table
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    input_image_id UUID NOT NULL REFERENCES uploads(id) ON DELETE RESTRICT,
    parameter_id UUID NOT NULL REFERENCES generation_parameters(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'preparing', 'loading', 'generating', 'post_processing', 'encoding', 'completed', 'failed', 'cancelled')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    stage VARCHAR(100) NOT NULL DEFAULT 'queued',
    error_code VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    hardware_used JSONB,
    generation_duration_ms BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Outputs Table
CREATE TABLE IF NOT EXISTS outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID UNIQUE NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    video_storage_path VARCHAR(512) NOT NULL,
    thumbnail_storage_path VARCHAR(512) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds NUMERIC(6, 2) NOT NULL,
    video_codec VARCHAR(50) DEFAULT 'h264',
    container_format VARCHAR(20) DEFAULT 'mp4',
    fps INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    aspect_ratio VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Generation Variations Table
CREATE TABLE IF NOT EXISTS generation_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    variation_job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    variation_type VARCHAR(50) DEFAULT 'seed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
