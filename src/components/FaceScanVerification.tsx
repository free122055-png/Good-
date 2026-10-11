import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, X, Shield, Sparkles, UserCheck, AlertTriangle } from 'lucide-react';
import {
  analyzeVideoFrame,
  verifyCapturedPhoto,
  initFaceDetector,
  FaceStatusFeedback,
} from '../services/realFaceDetector';

interface FaceScanVerificationProps {
  onSuccess: (photoDataUrl: string) => void;
  onCancel: () => void;
  userName?: string;
}

type GuideStatus =
  | 'starting'
  | 'aligning'
  | 'hand_or_object'
  | 'too_far'
  | 'too_close'
  | 'not_centered'
  | 'low_light'
  | 'detecting'
  | 'verifying'
  | 'capturing'
  | 'captured'
  | 'error';

export const FaceScanVerification: React.FC<FaceScanVerificationProps> = ({
  onSuccess,
  onCancel,
  userName = 'User',
}) => {
  // Step: 'consent' -> 'scanning' -> 'review'
  const [step, setStep] = useState<'consent' | 'scanning' | 'review'>('consent');
  const [guideStatus, setGuideStatus] = useState<GuideStatus>('starting');
  const [guideMessage, setGuideMessage] = useState<string>('ক্যামেরা চালু হচ্ছে...');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const consecutiveValidFramesRef = useRef<number>(0);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Audio tone on successful auto-capture
  const playCaptureTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (_) {}
  };

  // Error buzz tone on rejection
  const playRejectTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (_) {}
  };

  // Perform Auto-Capture from Video Stream with strict 2nd-stage verification
  const performAutoCapture = useCallback(async () => {
    if (isCapturingRef.current || !videoRef.current || !canvasRef.current) return;
    isCapturingRef.current = true;

    setGuideStatus('capturing');
    setGuideMessage('মুখ শনাক্ত হয়েছে! অটো ক্যাপচার হচ্ছে...');
    setIsFlashActive(true);
    playCaptureTone();

    // Trigger flash animation
    await new Promise((resolve) => setTimeout(resolve, 200));
    setIsFlashActive(false);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      isCapturingRef.current = false;
      return;
    }

    const vW = video.videoWidth || 640;
    const vH = video.videoHeight || 480;

    // Crop to square face avatar centered on oval
    const cropSize = Math.min(vW, vH);
    const startX = (vW - cropSize) / 2;
    const startY = (vH - cropSize) / 2;

    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isCapturingRef.current = false;
      return;
    }

    // Mirror image horizontally to match selfie view
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // CRITICAL: Post-Capture Verification Stage
    // Ensure the captured photo STILL contains a valid, confirmed human face!
    setGuideStatus('verifying');
    setGuideMessage('ছবিতে আসল মুখ নিশ্চিত করা হচ্ছে...');

    const verificationResult = await verifyCapturedPhoto(dataUrl);

    if (!verificationResult.isValidFace) {
      // Rejection: The captured snapshot failed real face verification!
      playRejectTone();
      isCapturingRef.current = false;
      consecutiveValidFramesRef.current = 0;
      setScanProgress(0);
      setGuideStatus('hand_or_object');
      setValidationError(
        'ক্যাপচার করা ছবিতে মানুষের আসল মুখ নিশ্চিত করা যায়নি। হাত, আঙুল বা অন্য বস্তু গ্রহণযোগ্য নয়। অনুগ্রহ করে ক্যামেরায় শুধুমাত্র আপনার মুখ স্থির রাখুন।'
      );
      setGuideMessage('❌ মুখ শনাক্তকরণ ব্যর্থ! হাত বা অন্য বস্তু গৃহীত নয়');
      return;
    }

    // Verification Success: Real face confirmed!
    setValidationError(null);
    setCapturedPhoto(dataUrl);
    setGuideStatus('captured');
    setGuideMessage('মানুষের মুখ সফলভাবে যাচাই ও ধারণ করা হয়েছে ✔️');
    stopCamera();
    setStep('review');
  }, [stopCamera]);

  // Start front camera stream
  const startCamera = async () => {
    setCameraError(null);
    setValidationError(null);
    setGuideStatus('starting');
    setGuideMessage('ক্যামেরা চালু হচ্ছে...');
    setScanProgress(0);
    consecutiveValidFramesRef.current = 0;
    isCapturingRef.current = false;
    setStep('scanning');

    // Pre-initialize face detector cascade in parallel
    initFaceDetector().catch(console.warn);

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
          startFaceDetectionLoop();
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'ক্যামেরা চালু করতে সমস্যা হয়েছে।';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'ক্যামেরার অনুমতি প্রত্যাখ্যাত হয়েছে। ব্রাউজার সেটিংসে গিয়ে ক্যামেরার অ্যাক্সেস দিয়ে আবার চেষ্টা করুন।';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'আপনার ডিভাইসে কোনো সামনের ক্যামেরা পাওয়া যায়নি।';
      }
      setCameraError(msg);
      setGuideStatus('error');
    }
  };

  // Real-time Face Scan and Positioning Loop
  const startFaceDetectionLoop = () => {
    const nativeDetectorAvailable = typeof (window as any).FaceDetector !== 'undefined';
    let nativeDetector: any = null;
    if (nativeDetectorAvailable) {
      try {
        nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (_) {
        nativeDetector = null;
      }
    }

    const offscreenCanvas = document.createElement('canvas');
    let lastCheckTime = performance.now();

    const loop = async (now: number) => {
      if (isCapturingRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      // Throttle detection to every 90ms for optimal balance of responsiveness and low CPU usage
      if (now - lastCheckTime >= 90) {
        lastCheckTime = now;
        const video = videoRef.current;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const analysis = await analyzeVideoFrame(video, offscreenCanvas, nativeDetector);

          if (analysis.feedback === 'hand_or_object') {
            // Hand, finger, or non-face flesh-colored object detected!
            setGuideStatus('hand_or_object');
            setGuideMessage(analysis.messageBn);
            // Immediately drop valid frame counter to 0
            consecutiveValidFramesRef.current = 0;
            setScanProgress(0);
          } else if (analysis.feedback === 'no_face') {
            // Empty view, wall, paper, or nothing
            setGuideStatus('aligning');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current = 0;
            setScanProgress(0);
          } else if (analysis.feedback === 'low_light') {
            setGuideStatus('low_light');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current = 0;
            setScanProgress(0);
          } else if (analysis.feedback === 'too_far') {
            setGuideStatus('too_far');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current = Math.max(0, consecutiveValidFramesRef.current - 1);
          } else if (analysis.feedback === 'too_close') {
            setGuideStatus('too_close');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current = Math.max(0, consecutiveValidFramesRef.current - 1);
          } else if (analysis.feedback === 'not_centered') {
            setGuideStatus('not_centered');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current = Math.max(0, consecutiveValidFramesRef.current - 1);
          } else if (analysis.feedback === 'detected_and_valid') {
            // Real human face positively detected, centered, and sized!
            setGuideStatus('detecting');
            setGuideMessage(analysis.messageBn);
            consecutiveValidFramesRef.current += 1;
          }

          // Progress calculation: ~12 consecutive valid frames (~1.2 seconds of holding still)
          const requiredFrames = 12;
          const currentProgress = Math.min(
            100,
            Math.round((consecutiveValidFramesRef.current / requiredFrames) * 100)
          );
          setScanProgress(currentProgress);

          if (currentProgress >= 100 && !isCapturingRef.current) {
            performAutoCapture();
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setValidationError(null);
    startCamera();
  };

  const handleConfirmCaptured = () => {
    if (capturedPhoto) {
      onSuccess(capturedPhoto);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full animate-in fade-in duration-200 select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen Header */}
      <div className="w-full flex items-center justify-between pt-1 pb-2 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="p-1 -ml-1 text-slate-800 hover:opacity-70 transition-opacity cursor-pointer"
        >
          <X className="w-6 h-6 stroke-[2.2]" />
        </button>
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          <h1 className="font-extrabold text-sm text-slate-900 tracking-tight">
            Face Verification (আসল মুখ যাচাই)
          </h1>
        </div>
        <div className="w-6" />
      </div>

      {/* STAGE 1: CONSENT & CAMERA PERMISSION PROMPT */}
      {step === 'consent' && (
        <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-4 space-y-4 my-auto">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm">
              <UserCheck className="w-10 h-10 stroke-[2]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-xs">
            <h2 className="font-extrabold text-lg text-slate-900 leading-snug">
              স্বয়ংক্রিয় মুখ যাচাইকরণ
            </h2>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              আপনার BINISTA অ্যাকাউন্ট নিরাপদ রাখতে এবং ডুপ্লিকেট রোধ করতে সামনের ক্যামেরা দিয়ে মুখ স্বয়ংক্রিয়ভাবে স্ক্যান করা হবে।
            </p>
          </div>

          {/* Key verification policies */}
          <div className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-2">
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>শুধুমাত্র মানুষের আসল মুখ শনাক্ত হলে স্বয়ংক্রিয় ক্যাপচার হবে।</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>হাত, আঙুল, দেয়াল বা কোনো বস্তু দেখালে ভেরিফিকেশন হবে না।</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>কোনো ক্যাপচার বাটনে চাপার প্রয়োজন নেই; মুখ ঠিক রাখলে অটো ছবি উঠবে।</span>
            </div>
          </div>

          <div className="w-full max-w-xs pt-2 space-y-2">
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>ক্যামেরা চালু ও ফেস স্ক্যান শুরু করুন</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl text-gray-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              পরে করব (ফিরে যান)
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: LIVE AUTOMATIC FACE SCAN & AUTO-CAPTURE VIEW */}
      {step === 'scanning' && (
        <div className="flex-1 flex flex-col justify-between py-2 my-auto">
          {cameraError ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">ক্যামেরা ত্রুটি</h3>
              <p className="text-xs text-gray-500 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                পুনরায় চেষ্টা করুন
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* Camera Video Viewport */}
              <div className="relative w-64 h-80 sm:w-72 sm:h-88 rounded-3xl overflow-hidden bg-slate-950 shadow-xl border-4 border-slate-900 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform -scale-x-100"
                  autoPlay
                  playsInline
                  muted
                />

                {/* White Flash Effect on Auto Capture */}
                {isFlashActive && (
                  <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />
                )}

                {/* Oval Face Guide Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 288 352">
                    <defs>
                      <mask id="face-oval-mask">
                        <rect width="288" height="352" fill="white" />
                        <ellipse cx="144" cy="176" rx="96" ry="128" fill="black" />
                      </mask>
                    </defs>

                    {/* Dark semi-transparent vignette outside the oval */}
                    <rect width="288" height="352" fill="rgba(15, 23, 42, 0.65)" mask="url(#face-oval-mask)" />

                    {/* Oval Border with Progress Arc */}
                    <ellipse
                      cx="144"
                      cy="176"
                      rx="96"
                      ry="128"
                      fill="none"
                      stroke={
                        guideStatus === 'hand_or_object'
                          ? 'rgba(244, 63, 94, 0.6)'
                          : 'rgba(255, 255, 255, 0.25)'
                      }
                      strokeWidth="3.5"
                    />

                    {/* Dynamic Green / Amber Scanning Progress Stroke */}
                    <ellipse
                      cx="144"
                      cy="176"
                      rx="96"
                      ry="128"
                      fill="none"
                      stroke={
                        guideStatus === 'hand_or_object'
                          ? '#f43f5e'
                          : scanProgress >= 100
                          ? '#10b981'
                          : scanProgress > 30
                          ? '#059669'
                          : '#38bdf8'
                      }
                      strokeWidth="5"
                      strokeDasharray="705"
                      strokeDashoffset={705 - (705 * scanProgress) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-100 ease-out"
                    />
                  </svg>

                  {/* Animated Vertical Scan Radar Beam inside oval */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <div className="w-48 h-64 relative overflow-hidden rounded-[45%]">
                      <div
                        className={`absolute inset-x-0 h-1.5 ${
                          guideStatus === 'hand_or_object'
                            ? 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e]'
                            : 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]'
                        } animate-bounce duration-1000`}
                      />
                    </div>
                  </div>
                </div>

                {/* Progress Percentage Badge */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-extrabold flex items-center gap-1.5 z-20 border border-white/20">
                  {guideStatus === 'hand_or_object' ? (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                  )}
                  <span>{scanProgress}% স্ক্যান সম্পন্ন</span>
                </div>
              </div>

              {/* Dynamic Real-Time Bengali Feedback Banner */}
              <div
                className={`mt-4 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-lg border transition-all duration-150 ${
                  guideStatus === 'hand_or_object'
                    ? 'bg-rose-950/95 text-rose-100 border-rose-500/50'
                    : guideStatus === 'detecting'
                    ? 'bg-slate-900 text-white border-emerald-500/50'
                    : 'bg-slate-900 text-white border-slate-800'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      guideStatus === 'hand_or_object'
                        ? 'bg-rose-400'
                        : guideStatus === 'detecting'
                        ? 'bg-emerald-400'
                        : guideStatus === 'aligning'
                        ? 'bg-sky-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      guideStatus === 'hand_or_object'
                        ? 'bg-rose-500'
                        : guideStatus === 'detecting'
                        ? 'bg-emerald-500'
                        : guideStatus === 'aligning'
                        ? 'bg-sky-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-bold tracking-tight">{guideMessage}</span>
              </div>

              {/* Validation Warning Alert if previous capture attempt failed */}
              {validationError && (
                <div className="mt-2 max-w-xs bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center text-[11px] text-rose-700 font-semibold leading-snug animate-in fade-in duration-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Notice that real face is strictly required */}
              <p className="text-[11px] text-gray-500 font-medium mt-2 text-center max-w-xs">
                হাত বা অন্য কিছু স্ক্যান হবে না; ক্যামেরা শুধু আসল মুখ শনাক্ত করবে।
              </p>
            </div>
          )}
        </div>
      )}

      {/* STAGE 3: REVIEW AUTO-CAPTURED FACE PHOTO */}
      {step === 'review' && capturedPhoto && (
        <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-3 space-y-4 my-auto">
          <div className="relative">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-slate-100 p-1">
              <img
                src={capturedPhoto}
                alt="Captured Face"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow-md">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900">
              মানুষের মুখ সফলভাবে যাচাই ও ধারণ করা হয়েছে!
            </h3>
            <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full inline-block border border-emerald-200">
              Real Face Verified & Captured ✔️
            </p>
          </div>

          <div className="w-full max-w-xs space-y-2 pt-2">
            <button
              type="button"
              onClick={handleConfirmCaptured}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>এই ছবি দিয়ে অ্যাকাউন্ট তৈরি সম্পন্ন করুন</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={handleRetake}
              className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুনরায় স্ক্যান করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
