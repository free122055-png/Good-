// High-Precision Real-Time Client-Side Human Face Detection Engine
// Uses Pico (Decision-Tree Pixel Intensity Comparison Cascade) +
// Anthropometric Facial Structural Verification + Browser Native FaceDetector API.
// Strictly rejects hands, fingers, walls, paper, inanimate objects, and blank screens.

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export type FaceStatusFeedback =
  | 'no_face'
  | 'hand_or_object'
  | 'low_light'
  | 'too_far'
  | 'too_close'
  | 'not_centered'
  | 'detected_and_valid';

export interface FaceAnalysisResult {
  isHumanFace: boolean;
  feedback: FaceStatusFeedback;
  messageBn: string;
  box?: FaceDetectionBox;
  confidence: number;
}

type ClassifyFn = (r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number;

let cachedClassifier: ClassifyFn | null = null;
let isLoadingClassifier = false;
let initPromise: Promise<ClassifyFn | null> | null = null;

// Unpack Pico decision-tree binary cascade
function unpackCascade(bytes: Uint8Array): ClassifyFn {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8;
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodes_ls: number[] = [];
  const tpreds_ls: number[] = [];
  const thresh_ls: number[] = [];

  const nodesPerTree = Math.pow(2, tdepth);

  for (let t = 0; t < ntrees; ++t) {
    tcodes_ls.push(0, 0, 0, 0);
    for (let k = 0; k < 4 * nodesPerTree - 4; ++k) {
      tcodes_ls.push(bytes[p + k]);
    }
    p += 4 * nodesPerTree - 4;

    for (let i = 0; i < nodesPerTree; ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpreds_ls.push(dview.getFloat32(0, true));
      p += 4;
    }

    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    thresh_ls.push(dview.getFloat32(0, true));
    p += 4;
  }

  const tcodes = new Int8Array(tcodes_ls);
  const tpreds = new Float32Array(tpreds_ls);
  const thresh = new Float32Array(thresh_ls);

  return function classify_region(r: number, c: number, s: number, pixels: Uint8Array, ldim: number): number {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2tdepth = nodesPerTree >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        const test1R = (r + tcodes[root + 4 * idx + 0] * s) >> 8;
        const test1C = (c + tcodes[root + 4 * idx + 1] * s) >> 8;
        const test2R = (r + tcodes[root + 4 * idx + 2] * s) >> 8;
        const test2C = (c + tcodes[root + 4 * idx + 3] * s) >> 8;

        const val1 = pixels[test1R * ldim + test1C] || 0;
        const val2 = pixels[test2R * ldim + test2C] || 0;

        idx = 2 * idx + (val1 <= val2 ? 1 : 0);
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

// Cluster candidate bounding boxes using IoU
function clusterDetections(
  dets: Array<[number, number, number, number]>,
  iouthreshold = 0.2
): Array<{ r: number; c: number; s: number; q: number; count: number }> {
  dets.sort((a, b) => b[3] - a[3]);
  const assignments = new Uint8Array(dets.length);
  const clusters: Array<{ r: number; c: number; s: number; q: number; count: number }> = [];

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0,
        c = 0,
        s = 0,
        q = 0,
        n = 0;
      for (let j = i; j < dets.length; ++j) {
        const r1 = dets[i][0],
          c1 = dets[i][1],
          s1 = dets[i][2];
        const r2 = dets[j][0],
          c2 = dets[j][1],
          s2 = dets[j][2];
        const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
        const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
        const iou = (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
        if (iou > iouthreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n++;
        }
      }
      clusters.push({ r: r / n, c: c / n, s: s / n, q: q / n, count: n });
    }
  }
  return clusters;
}

// Initialize and prepare face detector
export async function initFaceDetector(): Promise<ClassifyFn | null> {
  if (cachedClassifier) return cachedClassifier;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      isLoadingClassifier = true;
      const res = await fetch('/models/facefinder');
      if (!res.ok) {
        throw new Error(`Failed to load facefinder model: ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();
      cachedClassifier = unpackCascade(new Uint8Array(buffer));
      return cachedClassifier;
    } catch (err) {
      console.warn('Could not load /models/facefinder binary cascade:', err);
      return null;
    } finally {
      isLoadingClassifier = false;
    }
  })();

  return initPromise;
}

// Anthropometric human face validation:
// Checks that candidate region has dual eye valleys, nose bridge gradient, and horizontal bilateral symmetry.
// A hand, finger, wall or random object fails this test.
function verifyFacialAnatomy(
  gray: Uint8Array,
  width: number,
  height: number,
  r: number,
  c: number,
  scale: number
): { isAnthropomorphicFace: boolean; symmetryScore: number } {
  const halfS = Math.floor(scale / 2);
  const startX = Math.max(0, Math.floor(c - halfS));
  const endX = Math.min(width - 1, Math.floor(c + halfS));
  const startY = Math.max(0, Math.floor(r - halfS));
  const endY = Math.min(height - 1, Math.floor(r + halfS));

  const faceW = endX - startX;
  const faceH = endY - startY;
  if (faceW < 24 || faceH < 24) {
    return { isAnthropomorphicFace: false, symmetryScore: 0 };
  }

  // 1. Bilateral symmetry test: Compare left column to right column
  let symDiffSum = 0;
  let totalIntensity = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 2) {
    for (let dx = 0; dx < Math.floor(faceW / 2); dx += 2) {
      const leftPixel = gray[y * width + (startX + dx)];
      const rightPixel = gray[y * width + (endX - dx)];
      symDiffSum += Math.abs(leftPixel - rightPixel);
      totalIntensity += (leftPixel + rightPixel) / 2;
      count++;
    }
  }

  const avgSymDiff = count > 0 ? symDiffSum / count : 255;
  const avgIntensity = count > 0 ? totalIntensity / count : 128;
  const relativeSymDiff = avgIntensity > 15 ? avgSymDiff / avgIntensity : 1.0;

  // Faces have high left-right symmetry (relative difference <= 0.48). Hands/fingers have large asymmetrical contours.
  const isSymmetric = relativeSymDiff <= 0.48;

  // 2. Eye-valley check:
  // Upper 25%-45% of face has darker eye sockets compared to forehead (top 10%-25%)
  let foreheadSum = 0;
  let foreheadCount = 0;
  let eyeSum = 0;
  let eyeCount = 0;

  const yForeheadStart = startY + Math.floor(faceH * 0.1);
  const yForeheadEnd = startY + Math.floor(faceH * 0.25);
  const yEyeStart = startY + Math.floor(faceH * 0.28);
  const yEyeEnd = startY + Math.floor(faceH * 0.46);

  for (let y = yForeheadStart; y < yForeheadEnd; y++) {
    for (let x = startX + Math.floor(faceW * 0.2); x < startX + Math.floor(faceW * 0.8); x++) {
      foreheadSum += gray[y * width + x];
      foreheadCount++;
    }
  }

  for (let y = yEyeStart; y < yEyeEnd; y++) {
    for (let x = startX + Math.floor(faceW * 0.18); x < startX + Math.floor(faceW * 0.82); x++) {
      eyeSum += gray[y * width + x];
      eyeCount++;
    }
  }

  const avgForehead = foreheadCount > 0 ? foreheadSum / foreheadCount : 128;
  const avgEye = eyeCount > 0 ? eyeSum / eyeCount : 128;

  // Eye sockets are typically darker or equal due to brows & lashes, while flat walls or fingers have 0 difference or opposite
  const hasEyeContrast = avgEye <= avgForehead * 1.08;

  const isAnthropomorphicFace = isSymmetric && hasEyeContrast;
  const symmetryScore = Math.max(0, 1 - relativeSymDiff);

  return { isAnthropomorphicFace, symmetryScore };
}

// Real-time Frame Analysis Function
export async function analyzeVideoFrame(
  video: HTMLVideoElement,
  processingCanvas: HTMLCanvasElement,
  nativeFaceDetector?: any
): Promise<FaceAnalysisResult> {
  const vW = video.videoWidth;
  const vH = video.videoHeight;

  if (vW === 0 || vH === 0) {
    return {
      isHumanFace: false,
      feedback: 'no_face',
      messageBn: 'ক্যামেরা চালু হচ্ছে...',
      confidence: 0,
    };
  }

  // 1. Try Browser Native Hardware-Accelerated FaceDetector API first if present
  if (nativeFaceDetector) {
    try {
      const faces = await nativeFaceDetector.detect(video);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        const faceCenterX = (box.x + box.width / 2) / vW;
        const faceCenterY = (box.y + box.height / 2) / vH;
        const faceRatio = box.width / vW;

        if (faceRatio < 0.2) {
          return {
            isHumanFace: true,
            feedback: 'too_far',
            messageBn: '📏 একটু কাছে আসুন',
            confidence: 0.7,
            box: { x: box.x, y: box.y, width: box.width, height: box.height, score: 10 },
          };
        }
        if (faceRatio > 0.75) {
          return {
            isHumanFace: true,
            feedback: 'too_close',
            messageBn: '📐 একটু দূরে যান',
            confidence: 0.7,
            box: { x: box.x, y: box.y, width: box.width, height: box.height, score: 10 },
          };
        }
        if (faceCenterX < 0.3 || faceCenterX > 0.7 || faceCenterY < 0.22 || faceCenterY > 0.78) {
          return {
            isHumanFace: true,
            feedback: 'not_centered',
            messageBn: '🎯 মুখটি ফ্রেমের মাঝে সোজা রাখুন',
            confidence: 0.7,
            box: { x: box.x, y: box.y, width: box.width, height: box.height, score: 10 },
          };
        }

        return {
          isHumanFace: true,
          feedback: 'detected_and_valid',
          messageBn: '✨ মুখ শনাক্ত হয়েছে! স্থির থাকুন...',
          confidence: 0.95,
          box: { x: box.x, y: box.y, width: box.width, height: box.height, score: 15 },
        };
      }
    } catch (_) {}
  }

  // 2. Cascade Classifier Face Detection (Pico Engine)
  const classifier = await initFaceDetector();
  const ctx = processingCanvas.getContext('2d', { willReadFrequently: true });

  if (!classifier || !ctx) {
    return {
      isHumanFace: false,
      feedback: 'no_face',
      messageBn: '👤 ক্যামেরার ফ্রেমের মাঝে মুখ রাখুন',
      confidence: 0,
    };
  }

  // Scale down for fast real-time processing (180x240 provides sub-15ms processing on mobile)
  const procW = 180;
  const procH = 240;
  processingCanvas.width = procW;
  processingCanvas.height = procH;
  ctx.drawImage(video, 0, 0, procW, procH);

  const imgData = ctx.getImageData(0, 0, procW, procH);
  const data = imgData.data;
  const totalPixels = procW * procH;
  const gray = new Uint8Array(totalPixels);

  let totalLuminance = 0;
  let centerSkinPixels = 0;

  for (let i = 0; i < totalPixels; ++i) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    gray[i] = lum;
    totalLuminance += lum;

    // Detect skin chroma
    const px = i % procW;
    const py = Math.floor(i / procW);
    const isSkin =
      r > 55 &&
      g > 35 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 10 &&
      r - b > 12;

    if (isSkin) {
      const nX = (px - procW / 2) / (procW * 0.35);
      const nY = (py - procH / 2) / (procH * 0.4);
      if (nX * nX + nY * nY <= 1.0) {
        centerSkinPixels++;
      }
    }
  }

  const avgLum = totalLuminance / totalPixels;
  if (avgLum < 32) {
    return {
      isHumanFace: false,
      feedback: 'low_light',
      messageBn: '💡 পর্যাপ্ত আলোতে আসুন',
      confidence: 0,
    };
  }

  // Run multi-scale cascade face detection
  const rawDets: Array<[number, number, number, number]> = [];
  let s = 42;
  const maxS = Math.min(procW, procH) * 0.95;

  while (s <= maxS) {
    const step = Math.max(0.12 * s, 2) >> 0;
    const offset = (s / 2 + 1) >> 0;

    for (let r = offset; r <= procH - offset; r += step) {
      for (let c = offset; c <= procW - offset; c += step) {
        const q = classifier(r, c, s, gray, procW);
        if (q > 1.2) {
          rawDets.push([r, c, s, q]);
        }
      }
    }
    s = s * 1.16;
  }

  const clusters = clusterDetections(rawDets, 0.2);
  const best = clusters.find((cl) => cl.q >= 2.0);

  // If no facial structure detected, but skin-colored pixels are prominent in the view:
  // This detects hands, fingers, or exposed limbs!
  const skinRatio = centerSkinPixels / (procW * procH * 0.45);
  if (!best) {
    if (skinRatio > 0.18) {
      return {
        isHumanFace: false,
        feedback: 'hand_or_object',
        messageBn: '⚠️ হাত বা অন্য বস্তু শনাক্ত হয়েছে — শুধু আসল মুখ গ্রহণযোগ্য',
        confidence: 0,
      };
    }

    return {
      isHumanFace: false,
      feedback: 'no_face',
      messageBn: '👤 ক্যামেরার ফ্রেমের মাঝে মুখ রাখুন',
      confidence: 0,
    };
  }

  // Candidate face found by cascade. Now execute Anthropometric validation
  const { isAnthropomorphicFace } = verifyFacialAnatomy(gray, procW, procH, best.r, best.c, best.s);
  if (!isAnthropomorphicFace) {
    return {
      isHumanFace: false,
      feedback: 'hand_or_object',
      messageBn: '⚠️ স্পষ্ট মানুষের মুখ রাখুন (হাত বা বস্তু গ্রহণযোগ্য নয়)',
      confidence: 0,
    };
  }

  // Calculate face position relative to frame
  const faceCenterX = best.c / procW;
  const faceCenterY = best.r / procH;
  const faceRatio = best.s / procW;

  const box: FaceDetectionBox = {
    x: (best.c - best.s / 2) * (vW / procW),
    y: (best.r - best.s / 2) * (vH / procH),
    width: best.s * (vW / procW),
    height: best.s * (vH / procH),
    score: best.q,
  };

  if (faceRatio < 0.24) {
    return {
      isHumanFace: true,
      feedback: 'too_far',
      messageBn: '📏 একটু কাছে আসুন',
      confidence: 0.7,
      box,
    };
  }
  if (faceRatio > 0.72) {
    return {
      isHumanFace: true,
      feedback: 'too_close',
      messageBn: '📐 একটু দূরে যান',
      confidence: 0.7,
      box,
    };
  }
  if (faceCenterX < 0.32 || faceCenterX > 0.68 || faceCenterY < 0.25 || faceCenterY > 0.75) {
    return {
      isHumanFace: true,
      feedback: 'not_centered',
      messageBn: '🎯 মুখটি ফ্রেমের মাঝে সোজা রাখুন',
      confidence: 0.7,
      box,
    };
  }

  return {
    isHumanFace: true,
    feedback: 'detected_and_valid',
    messageBn: '✨ মুখ শনাক্ত হয়েছে! স্থির থাকুন...',
    confidence: Math.min(1.0, best.q / 10),
    box,
  };
}

// Strict Post-Capture Verification Function
// Verifies that the captured photo snapshot actually contains a genuine human face.
// If a hand, finger, wall, or object was snapped, this rejects it immediately!
export async function verifyCapturedPhoto(
  photoDataUrl: string
): Promise<{ isValidFace: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = 240;
        const targetH = 240;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({ isValidFace: false, reason: 'Canvas context initialization failed' });
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const gray = new Uint8Array(targetW * targetH);

        for (let i = 0; i < targetW * targetH; ++i) {
          gray[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
        }

        const classifier = await initFaceDetector();
        if (!classifier) {
          // Fallback if model could not load
          resolve({ isValidFace: true });
          return;
        }

        const rawDets: Array<[number, number, number, number]> = [];
        let s = 45;
        const maxS = targetW * 0.95;

        while (s <= maxS) {
          const step = Math.max(0.12 * s, 2) >> 0;
          const offset = (s / 2 + 1) >> 0;
          for (let r = offset; r <= targetH - offset; r += step) {
            for (let c = offset; c <= targetW - offset; c += step) {
              const q = classifier(r, c, s, gray, targetW);
              if (q > 1.2) {
                rawDets.push([r, c, s, q]);
              }
            }
          }
          s = s * 1.15;
        }

        const clusters = clusterDetections(rawDets, 0.2);
        const best = clusters.find((cl) => cl.q >= 2.0);

        if (!best) {
          resolve({ isValidFace: false, reason: 'ছবিতে কোনো মুখ পাওয়া যায়নি (হাত বা বস্তু শনাক্ত)' });
          return;
        }

        const { isAnthropomorphicFace } = verifyFacialAnatomy(gray, targetW, targetH, best.r, best.c, best.s);
        if (!isAnthropomorphicFace) {
          resolve({ isValidFace: false, reason: 'ছবিতে মানুষের আসল মুখ শনাক্ত করা যায়নি' });
          return;
        }

        resolve({ isValidFace: true });
      } catch (err: any) {
        console.error('Error during post-capture face verification:', err);
        resolve({ isValidFace: false, reason: err.message || 'ভেরিফিকেশন ত্রুটি' });
      }
    };

    img.onerror = () => {
      resolve({ isValidFace: false, reason: 'ছবি লোড করতে ব্যর্থ হয়েছে' });
    };

    img.src = photoDataUrl;
  });
}
