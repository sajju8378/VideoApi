import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, AlertCircle, Video, History } from 'lucide-react';
import { Header } from './components/Header';
import { CapabilityBanner } from './components/CapabilityBanner';
import { ImageUploader } from './components/ImageUploader';
import { PromptSection } from './components/PromptSection';
import { CameraMotionControls } from './components/CameraMotionControls';
import { MotionSliders } from './components/MotionSliders';
import { VideoSettings } from './components/VideoSettings';
import { GenerationProgress } from './components/GenerationProgress';
import { VideoPlayer } from './components/VideoPlayer';
import { HistoryGallery } from './components/HistoryGallery';
import { TelemetryModal } from './components/TelemetryModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { VariationModal } from './components/VariationModal';
import {
  SystemCapabilities,
  UploadedImage,
  GenerationSettings as SettingsType,
  ActiveJob,
  HistoryItem,
  CameraMotion,
} from './types';
import { safeFetchJson, resolveApiUrl, getClientCapabilities } from './lib/api';
import { generateClientVideo } from './lib/clientMotionGenerator';
import { getSavedLocalHistory, saveLocalHistory, deleteLocalHistoryItem } from './lib/localHistory';

export default function App() {
  // System & Capabilities
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Form State
  const [currentImage, setCurrentImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState(
    'A young man standing beside a Yamaha RX100 near Charminar. His hair moves gently in the wind. The camera slowly pushes forward while he looks toward the camera. Natural body movement, realistic facial expression, cinematic lighting.'
  );
  const [negativePrompt, setNegativePrompt] = useState(
    'distortion, flickering, artifacts, jitter, identity shift, blur, morphing'
  );
  const [settings, setSettings] = useState<SettingsType>({
    prompt: '',
    duration: 5,
    fps: 24,
    resolution: '720p',
    aspect_ratio: '16:9',
    camera_motion: 'slow push-in',
    motion_strength: 50,
    preserve_subject: 80,
    camera_movement: 50,
    background_movement: 50,
    facial_stability: 85,
    temporal_consistency: 75,
    random_seed: true,
    quality_preset: 'balanced',
  });

  // Active Job & Generation State
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // History & Variation State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationSource, setVariationSource] = useState<HistoryItem | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Initial Load: Fetch Capabilities & Generation History
  useEffect(() => {
    fetchCapabilities();
    fetchHistory();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchCapabilities = async () => {
    try {
      const data = await safeFetchJson('/api/v1/system/capabilities');
      setCapabilities(data);
    } catch {
      // In static / client-mode (GitHub Pages or disconnected backend), provide zero-install capabilities
      setCapabilities(getClientCapabilities());
    }
  };

  const fetchHistory = async () => {
    const local = getSavedLocalHistory();
    try {
      const data = await safeFetchJson<{ generations: HistoryItem[] }>('/api/v1/generations');
      const combined = [...(data.generations || []), ...local];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      setHistoryItems(unique);
    } catch {
      setHistoryItems(local);
    }
  };

  // Client-Side Neural Motion Generator
  const executeClientGeneration = async (
    imgUrl: string,
    imgId: string,
    targetSettings: typeof settings,
    targetPrompt: string
  ) => {
    const clientJobId = 'client_' + Math.random().toString(36).substring(2, 9);
    const initialJob: ActiveJob = {
      job_id: clientJobId,
      status: 'generating',
      progress: 5,
      stage: 'conditioning_validation',
      message: 'Synthesizing neural motion trajectory in browser memory...',
    };
    setActiveJob(initialJob);

    try {
      const result = await generateClientVideo(imgUrl, targetSettings, (progress, stage, message) => {
        setActiveJob((prev) => {
          if (!prev || prev.job_id !== clientJobId) return prev;
          return {
            ...prev,
            status: 'generating',
            progress,
            stage,
            message,
          };
        });
      });

      const completedJob: ActiveJob = {
        job_id: clientJobId,
        status: 'completed',
        progress: 100,
        stage: 'completed',
        message: 'Render finished',
        output: {
          video_url: result.videoUrl,
          thumbnail_url: result.thumbnailUrl,
          duration: targetSettings.duration,
          fps: targetSettings.fps,
          width: targetSettings.aspect_ratio === '9:16' ? 720 : 1280,
          height: targetSettings.aspect_ratio === '9:16' ? 1280 : 720,
          aspect_ratio: targetSettings.aspect_ratio,
          file_size_bytes: result.fileSizeBytes,
        },
      };
      setActiveJob(completedJob);

      const historyItem: HistoryItem = {
        id: clientJobId,
        status: 'completed',
        progress: 100,
        stage: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        prompt: targetPrompt,
        resolution: targetSettings.resolution,
        aspect_ratio: targetSettings.aspect_ratio,
        duration: targetSettings.duration,
        fps: targetSettings.fps,
        seed: targetSettings.seed ?? 42,
        camera_motion: targetSettings.camera_motion,
        motion_strength: targetSettings.motion_strength,
        input_image_url: imgUrl,
        input_image_id: imgId,
        video_url: result.videoUrl,
        thumbnail_url: result.thumbnailUrl,
        file_size_bytes: result.fileSizeBytes,
      };
      saveLocalHistory(historyItem);
      setHistoryItems((prev) => [historyItem, ...prev.filter((x) => x.id !== clientJobId)]);
    } catch (err: any) {
      setActiveJob((prev) =>
        prev?.job_id === clientJobId
          ? { ...prev, status: 'failed', error_message: err.message || 'Generation error' }
          : null
      );
      setGlobalError(err.message || 'Error running browser motion synthesis');
    }
  };

  // 2. Submit Generation Job
  const handleGenerate = async () => {
    setGlobalError(null);
    if (!currentImage) {
      setGlobalError('Please upload a source conditioning image first.');
      return;
    }

    if (!prompt.trim()) {
      setGlobalError('Please enter a natural-language description of desired video motion.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        image_id: currentImage.id,
        image_base64: currentImage.url.startsWith('data:') ? currentImage.url : undefined,
        image_filename: currentImage.original_filename,
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        duration: settings.duration,
        fps: settings.fps,
        resolution: settings.resolution,
        aspect_ratio: settings.aspect_ratio,
        camera_motion: settings.camera_motion,
        motion_strength: settings.motion_strength,
        preserve_subject: settings.preserve_subject,
        camera_movement: settings.camera_movement,
        background_movement: settings.background_movement,
        facial_stability: settings.facial_stability,
        temporal_consistency: settings.temporal_consistency,
        seed: settings.random_seed ? Math.floor(Math.random() * 2147483647) : settings.seed,
        quality_preset: settings.quality_preset,
      };

      const data = await safeFetchJson<{ job_id: string; status: string }>('/api/v1/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Initialize active job and start SSE listener
      const initialJob: ActiveJob = {
        job_id: data.job_id,
        status: (data.status as ActiveJob['status']) || 'queued',
        progress: 0,
        stage: 'queued',
        message: 'Job submitted to inference queue...',
      };
      setActiveJob(initialJob);
      subscribeToJobEvents(data.job_id);
    } catch (err: any) {
      console.warn('Backend unavailable, running in-browser neural motion pipeline:', err.message);
      await executeClientGeneration(currentImage.url, currentImage.id, settings, prompt.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Connect to Real-Time Server-Sent Events (SSE)
  const subscribeToJobEvents = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource(resolveApiUrl(`/api/v1/video/jobs/${jobId}/events`));
    eventSourceRef.current = sse;

    sse.onmessage = async (e) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveJob((prev) => {
          if (!prev || prev.job_id !== jobId) return prev;
          return {
            ...prev,
            status: payload.status,
            progress: payload.progress,
            stage: payload.stage,
            message: payload.message,
            error_code: payload.details?.errorCode,
            error_message: payload.message,
          };
        });

        if (payload.status === 'completed') {
          sse.close();
          // Fetch complete output result
          try {
            const jobData = await safeFetchJson<{ output: any }>(`/api/v1/video/jobs/${jobId}`);
            setActiveJob((prev) => (prev ? { ...prev, output: jobData.output } : null));
          } catch {
            // Ignore
          }
          fetchHistory();
        } else if (payload.status === 'failed' || payload.status === 'cancelled') {
          sse.close();
          fetchHistory();
        }
      } catch (err) {
        console.error('SSE parsing error:', err);
      }
    };

    sse.onerror = () => {
      sse.close();
    };
  };

  // 4. Cancel Job
  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await safeFetchJson(`/api/v1/video/jobs/${activeJob.job_id}/cancel`, { method: 'POST' });
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // 5. Delete Job
  const handleDeleteJob = async (id: string) => {
    deleteLocalHistoryItem(id);
    try {
      await safeFetchJson(`/api/v1/generations/${id}`, { method: 'DELETE' });
    } catch {
      // Ignore network failure when deleting local item
    }
    if (activeJob?.job_id === id) {
      setActiveJob(null);
    }
    fetchHistory();
  };

  // 6. Variation Workflow
  const handleOpenVariation = (item: HistoryItem) => {
    setVariationSource(item);
    setVariationModalOpen(true);
  };

  const handleExecuteVariation = async (params: {
    parentJobId: string;
    imageId: string;
    prompt: string;
    seed: number;
    cameraMotion: CameraMotion;
    motionStrength: number;
  }) => {
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        image_id: params.imageId,
        prompt: params.prompt,
        camera_motion: params.cameraMotion,
        motion_strength: params.motionStrength,
        seed: params.seed,
        duration: settings.duration,
        fps: settings.fps,
        resolution: settings.resolution,
        aspect_ratio: settings.aspect_ratio,
        parent_job_id: params.parentJobId,
      };

      const data = await safeFetchJson<{ job_id: string; status: string }>('/api/v1/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const newJob: ActiveJob = {
        job_id: data.job_id,
        status: 'queued',
        progress: 0,
        stage: 'queued',
        message: 'Variation enqueued...',
      };
      setActiveJob(newJob);
      subscribeToJobEvents(data.job_id);
    } catch (err: any) {
      console.warn('Backend unavailable, generating variation client-side:', err.message);
      const targetImgUrl = currentImage?.url || variationSource?.input_image_url || '';
      if (targetImgUrl) {
        const variationSettings = {
          ...settings,
          camera_motion: params.cameraMotion,
          motion_strength: params.motionStrength,
          seed: params.seed,
        };
        await executeClientGeneration(targetImgUrl, params.imageId, variationSettings, params.prompt);
      } else {
        setGlobalError(err.message || 'Error triggering variation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGenerating = activeJob && ['queued', 'preparing', 'loading', 'generating', 'post_processing', 'encoding'].includes(activeJob.status);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Header
        capabilities={capabilities}
        onOpenTelemetry={() => setShowTelemetry(true)}
        onOpenDocs={() => setShowDocs(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hardware Status Banner */}
        <CapabilityBanner
          capabilities={capabilities}
          onOpenTelemetry={() => setShowTelemetry(true)}
        />

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-sm text-red-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-xs text-red-400 hover:text-red-200 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Generation Progress / Video Player Viewport */}
        {activeJob && (
          <section className="space-y-4">
            {activeJob.output ? (
              <VideoPlayer
                job={activeJob}
                onGenerateVariation={() => {
                  const historyMatch = historyItems.find((h) => h.id === activeJob.job_id);
                  if (historyMatch) handleOpenVariation(historyMatch);
                  else if (currentImage) {
                    handleOpenVariation({
                      id: activeJob.job_id,
                      status: 'completed',
                      progress: 100,
                      stage: 'completed',
                      created_at: new Date().toISOString(),
                      prompt,
                      resolution: settings.resolution,
                      aspect_ratio: settings.aspect_ratio,
                      duration: settings.duration,
                      fps: settings.fps,
                      seed: settings.seed || 42,
                      camera_motion: settings.camera_motion,
                      motion_strength: settings.motion_strength,
                      input_image_id: currentImage.id,
                      input_image_url: currentImage.url,
                      video_url: activeJob.output.video_url,
                      thumbnail_url: activeJob.output.thumbnail_url,
                    });
                  }
                }}
                onDelete={() => handleDeleteJob(activeJob.job_id)}
              />
            ) : (
              <GenerationProgress job={activeJob} onCancel={handleCancelJob} />
            )}
          </section>
        )}

        {/* Primary Creation Studio Section */}
        <section className="bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-7 shadow-lg">
          <div className="border-b border-neutral-800 pb-4">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-400" />
              <span>AI Video Generation Studio</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Conditioning an image into continuous temporal motion using autonomous self-hosted neural pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Image Conditioning & Settings */}
            <div className="lg:col-span-5 space-y-6">
              <ImageUploader
                currentImage={currentImage}
                onImageUploaded={(img) => {
                  setCurrentImage(img);
                  // Default aspect ratio match
                  if (img.aspect_ratio === '9:16' || img.aspect_ratio === '16:9') {
                    setSettings((s) => ({ ...s, aspect_ratio: img.aspect_ratio as any }));
                  }
                }}
                disabled={isGenerating || isSubmitting}
              />

              <VideoSettings
                settings={settings}
                onChange={(updates) => setSettings((s) => ({ ...s, ...updates }))}
                disabled={isGenerating || isSubmitting}
              />
            </div>

            {/* Right Column: Prompt & Motion Dynamics */}
            <div className="lg:col-span-7 space-y-6">
              <PromptSection
                prompt={prompt}
                onChange={setPrompt}
                negativePrompt={negativePrompt}
                onNegativeChange={setNegativePrompt}
                disabled={isGenerating || isSubmitting}
              />

              <CameraMotionControls
                selected={settings.camera_motion}
                onSelect={(motion) => setSettings((s) => ({ ...s, camera_motion: motion }))}
                disabled={isGenerating || isSubmitting}
              />

              <MotionSliders
                settings={settings}
                onChange={(updates) => setSettings((s) => ({ ...s, ...updates }))}
                disabled={isGenerating || isSubmitting}
              />

              {/* Master Generate Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!currentImage || !prompt.trim() || isGenerating || isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-sm tracking-wide uppercase shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-neutral-950" />
                  <span>
                    {isGenerating
                      ? 'Generating Video In Pipeline...'
                      : isSubmitting
                      ? 'Enqueuing Job...'
                      : 'Generate Video'}
                  </span>
                </button>
                <p className="text-[11px] text-neutral-500 text-center mt-2">
                  Independent self-hosted pipeline • Zero third-party video APIs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Generation History Gallery */}
        <section className="space-y-4">
          <HistoryGallery
            items={historyItems}
            onSelect={(item) => {
              if (item.video_url && item.thumbnail_url) {
                setActiveJob({
                  job_id: item.id,
                  status: 'completed',
                  progress: 100,
                  stage: 'completed',
                  output: {
                    video_url: item.video_url,
                    thumbnail_url: item.thumbnail_url,
                    duration: item.duration,
                    file_size_bytes: item.file_size_bytes || 1024 * 1024,
                    width: 1280,
                    height: 720,
                    fps: item.fps,
                    aspect_ratio: item.aspect_ratio,
                  },
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onVariation={handleOpenVariation}
            onDelete={handleDeleteJob}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <p>AI Image-to-Video Generation Platform • Self-Hosted Inference Pipeline Architecture</p>
      </footer>

      {/* Telemetry Modal */}
      <TelemetryModal
        isOpen={showTelemetry}
        onClose={() => setShowTelemetry(false)}
        capabilities={capabilities}
      />

      {/* API Docs Modal */}
      <ApiDocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />

      {/* Variation Generator Modal */}
      <VariationModal
        isOpen={variationModalOpen}
        onClose={() => setVariationModalOpen(false)}
        sourceItem={variationSource}
        onSubmit={handleExecuteVariation}
      />
    </div>
  );
}
