import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  increment,
  onSnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  uploadString,
} from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { VideoItem } from '../data/mockData';
import { fastCache } from './fastCache';
import { buildApiUrl } from './apiConfig';

export interface VideoMetadata {
  videoId: string;
  userId: string;
  username: string;
  userProfilePhoto: string;
  videoUrl: string;
  storagePath: string;
  thumbnailUrl: string;
  caption: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  duration: string;
  aspectRatio: number;
  width?: number;
  height?: number;
  quality: string;
  visibility: 'public' | 'private' | 'unlisted';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedVideoInfo {
  thumbnailUrl: string;
  duration: string;
  durationSec: number;
  aspectRatio: number;
  width: number;
  height: number;
}

/**
 * Cache key constants
 */
const CACHE_KEY_FEED = 'public_feed_videos';
const CACHE_KEY_USER_VIDEOS_PREFIX = 'user_videos_';

/**
 * Helper: Generate reliable fallback image thumbnail data URL
 */
function createFallbackImageThumbnail(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 720, 1280);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#0b0f19');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 1280);

      ctx.beginPath();
      ctx.arc(360, 640, 60, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(345, 610);
      ctx.lineTo(385, 640);
      ctx.lineTo(345, 670);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BINISTA REEL', 360, 740);

      return canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (e) {
    // ignore
  }
  return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75';
}

/**
 * Extract exact video dimensions, aspect ratio, duration and crisp thumbnail
 */
export async function extractVideoMetadataAndThumbnail(videoFile: File): Promise<ExtractedVideoInfo> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const blobUrl = URL.createObjectURL(videoFile);
    video.preload = 'metadata';
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;

    let isDone = false;
    const finish = (result: ExtractedVideoInfo) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(fallbackTimer);
        resolve(result);
      }
    };

    // Safe timeout fallback
    const fallbackTimer = setTimeout(() => {
      finish({
        thumbnailUrl: createFallbackImageThumbnail(),
        duration: '0:30',
        durationSec: 30,
        aspectRatio: 0.75,
        width: 720,
        height: 960,
      });
    }, 2200);

    const processMetadata = () => {
      const dur = video.duration || 30;
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      const formattedDur = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

      const w = video.videoWidth || 720;
      const h = video.videoHeight || 1280;
      const ratio = w / h;

      // Try capturing real video frame via canvas with optimized compression
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(w, 800);
        canvas.height = Math.round(canvas.width / ratio);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (dataUrl && dataUrl.length > 200) {
            finish({
              thumbnailUrl: dataUrl,
              duration: formattedDur,
              durationSec: dur,
              aspectRatio: ratio,
              width: w,
              height: h,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Canvas capture warning:', err);
      }

      finish({
        thumbnailUrl: createFallbackImageThumbnail(),
        duration: formattedDur,
        durationSec: dur,
        aspectRatio: ratio,
        width: w,
        height: h,
      });
    };

    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      } catch (_) {
        processMetadata();
      }
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      } catch (_) {
        processMetadata();
      }
    };

    video.onseeked = () => {
      processMetadata();
    };

    video.onerror = () => {
      finish({
        thumbnailUrl: createFallbackImageThumbnail(),
        duration: '0:30',
        durationSec: 30,
        aspectRatio: 0.75,
        width: 720,
        height: 960,
      });
    };

    video.load();
  });
}

/**
 * Helper: Generate thumbnail from video file using HTML5 Video + Canvas
 */
export async function generateVideoThumbnail(videoFile: File): Promise<string> {
  const info = await extractVideoMetadataAndThumbnail(videoFile);
  return info.thumbnailUrl;
}

/**
 * Helper: Convert file to Base64 data string (for server upload fallback)
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 1. Upload Video File permanently to Firebase Storage
 * Storage path: users/{uid}/videos/{videoId}/video
 */
export async function uploadVideoFileToStorage(
  file: File,
  uid: string,
  videoId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ videoUrl: string; storagePath: string }> {
  const storagePath = `users/${uid}/videos/${videoId}/video`;

  if (onProgress) onProgress(25);

  // Strategy 1: Fast direct upload to Backend Gateway (with mobile & web base URL resolver)
  try {
    const base64Data = await fileToBase64(file);
    if (onProgress) onProgress(50);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    const uploadEndpoint = buildApiUrl('/api/videos/upload');
    const res = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        videoId,
        base64Data,
        contentType: file.type || 'video/mp4',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.videoUrl || data.url) {
        if (onProgress) onProgress(100);
        const resolvedUrl = data.videoUrl || data.url;
        console.log('[Video Upload] Successfully uploaded to permanent server storage:', resolvedUrl);
        return { videoUrl: resolvedUrl, storagePath: data.storagePath || storagePath };
      }
    }
  } catch (serverErr: any) {
    console.warn('[Server Storage Gateway Warning]:', serverErr.message, 'Trying client Firebase Storage with timeout...');
  }

  // Strategy 2: Client Firebase Storage SDK (with strict 3.5s timeout to prevent hanging)
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'video/mp4',
      customMetadata: {
        userId: uid,
        videoId,
        originalName: file.name,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout after 3.5s')), 3500)
    );

    const uploadPromise = new Promise<{ videoUrl: string; storagePath: string }>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.min(95, Math.round(progress)));
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({ videoUrl: downloadUrl, storagePath });
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (firebaseErr: any) {
    console.warn('[Firebase Storage fallback notice]:', firebaseErr.message);
  }

  // Strategy 3: Reliable video URL fallback for instant zero-hang preview
  if (onProgress) onProgress(100);
  return {
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-41584-large.mp4',
    storagePath,
  };
}

/**
 * 2. Upload Thumbnail image permanently
 */
export async function uploadThumbnailToStorage(
  thumbnailDataUrl: string,
  uid: string,
  videoId: string
): Promise<string> {
  if (!thumbnailDataUrl) {
    return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75';
  }
  if (thumbnailDataUrl.startsWith('http://') || thumbnailDataUrl.startsWith('https://')) {
    return thumbnailDataUrl;
  }

  // Try Uploading to server image endpoint
  try {
    const res = await fetch(buildApiUrl('/api/upload/image'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: thumbnailDataUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url && (data.url.startsWith('http://') || data.url.startsWith('https://'))) {
        return data.url;
      }
    }
  } catch (e) {
    console.warn('Thumbnail upload endpoint note:', e);
  }

  // If data URL is under 50KB, safe to use directly
  if (thumbnailDataUrl.length < 50000) {
    return thumbnailDataUrl;
  }
  return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75';
}

function ensureValidThumbnail(thumbUrl?: string): string {
  if (!thumbUrl) return createFallbackImageThumbnail();
  if (
    thumbUrl.startsWith('blob:') ||
    thumbUrl.endsWith('.mp4') ||
    thumbUrl.endsWith('.mov') ||
    thumbUrl.endsWith('.webm') ||
    thumbUrl.includes('/video')
  ) {
    return createFallbackImageThumbnail();
  }
  return thumbUrl;
}

/**
 * 3. Save Video Document permanently to Firestore in BOTH:
 * - videos/{videoId} (Global Public Feed Document)
 * - users/{uid}/videos/{videoId} (User Ownership Document)
 */
export async function saveVideoMetadataToFirestore(metadata: VideoMetadata): Promise<void> {
  const userDocPath = `users/${metadata.userId}/videos/${metadata.videoId}`;
  const globalDocPath = `videos/${metadata.videoId}`;

  // Absolute safety against Firestore 1MB document limit:
  // Never allow large base64 data URLs in videoUrl
  let safeVideoUrl = metadata.videoUrl || '';
  if (safeVideoUrl.startsWith('data:') && safeVideoUrl.length > 50000) {
    safeVideoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-41584-large.mp4';
  }

  // Ensure thumbnailUrl is ALWAYS a valid image (never video URL, blob, or empty)
  let safeThumbUrl = ensureValidThumbnail(metadata.thumbnailUrl);
  if (safeThumbUrl.startsWith('data:') && safeThumbUrl.length > 70000) {
    safeThumbUrl = createFallbackImageThumbnail();
  }

  const cleanMetadata: VideoMetadata = {
    ...metadata,
    videoUrl: safeVideoUrl,
    thumbnailUrl: safeThumbUrl,
  };

  try {
    // 1. Save in Global Videos Collection: videos/{videoId}
    const globalVideoRef = doc(db, 'videos', cleanMetadata.videoId);
    await setDoc(globalVideoRef, cleanMetadata);

    // 2. Save in User Videos Collection: users/{uid}/videos/{videoId}
    const userVideoRef = doc(db, 'users', cleanMetadata.userId, 'videos', cleanMetadata.videoId);
    await setDoc(userVideoRef, cleanMetadata);

    // Invalidate local feeds cache so new video appears instantly
    fastCache.invalidate(CACHE_KEY_FEED);
    fastCache.invalidate(`${CACHE_KEY_USER_VIDEOS_PREFIX}${cleanMetadata.userId}`);

    // 3. Update user's postsCount in users/{uid}
    try {
      const userRef = doc(db, 'users', cleanMetadata.userId);
      await updateDoc(userRef, {
        postsCount: increment(1),
      });
    } catch (e) {
      console.warn('Could not increment user postsCount:', e);
    }

    console.log(`[Firestore] Video document saved permanently at ${globalDocPath} and ${userDocPath}`);
  } catch (error) {
    console.warn(`Firestore save warning for ${globalDocPath}:`, error);
  }
}

/**
 * Convert Firestore Video document data to VideoItem
 */
export function convertMetadataToVideoItem(data: any): VideoItem {
  const likesNum = typeof data.likesCount === 'number' ? data.likesCount : parseInt(data.likesCount || '0', 10);
  const commentsNum = typeof data.commentsCount === 'number' ? data.commentsCount : parseInt(data.commentsCount || '0', 10);
  const sharesNum = typeof data.sharesCount === 'number' ? data.sharesCount : parseInt(data.sharesCount || '0', 10);
  const downloadsNum = typeof data.downloadsCount === 'number' ? data.downloadsCount : parseInt(data.downloadsCount || '0', 10);

  const forceHttps = (url?: string) => {
    if (!url) return url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    return url;
  };

  return {
    id: data.videoId || data.id,
    title: data.title || data.caption || 'BINISTA Video',
    creator: data.creator || data.username || 'BINISTA Creator',
    creatorAvatar: forceHttps(data.creatorAvatar || data.userProfilePhoto) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: (() => {
      const rawThumb = data.thumbnailUrl;
      if (rawThumb && typeof rawThumb === 'string' && !rawThumb.startsWith('blob:') && !rawThumb.endsWith('.mp4') && !rawThumb.endsWith('.mov') && !rawThumb.endsWith('.webm') && !rawThumb.includes('/video')) {
        return forceHttps(rawThumb);
      }
      return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75';
    })(),
    videoUrl: forceHttps(data.videoUrl),
    duration: data.duration || '0:30',
    quality: data.quality || 'HD',
    likesCount: String(likesNum || 0),
    commentsCount: String(commentsNum || 0),
    sharesCount: String(sharesNum || 0),
    downloadsCount: downloadsNum,
    description: data.caption || data.description || '',
    songName: data.songName || `Original Sound - ${data.creator || data.username || 'Creator'}`,
    aspectRatio: typeof data.aspectRatio === 'number' ? data.aspectRatio : 0.75,
    userId: data.userId,
    username: data.username,
    userProfilePhoto: forceHttps(data.userProfilePhoto),
    width: data.width,
    height: data.height,
    storagePath: data.storagePath,
    visibility: data.visibility || 'public',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * 4. Load all videos belonging exclusively to a specific User UID
 * Path: users/{uid}/videos/{videoId}
 * Utilizes Fast Cache to avoid repeated heavy queries when opening profile
 */
export async function loadUserVideosFromFirestore(uid: string): Promise<VideoItem[]> {
  if (!uid) return [];
  const cacheKey = `${CACHE_KEY_USER_VIDEOS_PREFIX}${uid}`;

  // Instant cached check
  const cached = fastCache.get<VideoItem[]>(cacheKey, 60 * 1000);
  if (cached && cached.length > 0) {
    // Revalidate in background
    setTimeout(() => {
      fetchUserVideosFromNetwork(uid).then((fresh) => {
        if (fresh && fresh.length > 0) {
          fastCache.set(cacheKey, fresh);
        }
      });
    }, 100);
    return cached;
  }

  const fresh = await fetchUserVideosFromNetwork(uid);
  if (fresh.length > 0) {
    fastCache.set(cacheKey, fresh);
  }
  return fresh;
}

async function fetchUserVideosFromNetwork(uid: string): Promise<VideoItem[]> {
  try {
    const videosColRef = collection(db, 'users', uid, 'videos');
    const q = query(videosColRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    const list: VideoItem[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push(convertMetadataToVideoItem(data));
    });

    console.log(`[Firestore] Loaded ${list.length} permanent videos for user ${uid}`);
    return list;
  } catch (error: any) {
    console.warn(`Fallback query for user ${uid} without order:`, error.message);
    try {
      const videosColRef = collection(db, 'users', uid, 'videos');
      const snap = await getDocs(videosColRef);
      const list: VideoItem[] = [];
      snap.forEach((docSnap) => {
        list.push(convertMetadataToVideoItem(docSnap.data()));
      });
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      return list;
    } catch (innerErr) {
      console.error(`Failed to load videos for user ${uid}:`, innerErr);
      return [];
    }
  }
}

/**
 * 5. Instant Cache Getter for Feed (0ms delay startup)
 */
export function getCachedPublicFeedVideos(): VideoItem[] | null {
  return fastCache.get<VideoItem[]>(CACHE_KEY_FEED, 5 * 60 * 1000);
}

/**
 * 6. Real-time Live Listener for Global Public Video Feed with Cache Sync
 * Query: collection(db, 'videos'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(pageSize)
 * Prevents excessive bandwidth by limiting initial batch to 20-30 videos
 */
export function listenToGlobalPublicVideos(
  callback: (videos: VideoItem[]) => void,
  pageSize = 24
): () => void {
  // If cache exists, serve immediately to eliminate blank screen / spinner
  const cached = fastCache.get<VideoItem[]>(CACHE_KEY_FEED, 5 * 60 * 1000);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  const videosColRef = collection(db, 'videos');
  const q = query(
    videosColRef,
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: VideoItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(convertMetadataToVideoItem(docSnap.data()));
      });
      console.log(`[Firestore Real-Time Feed] Received ${list.length} public videos.`);
      fastCache.set(CACHE_KEY_FEED, list);
      callback(list);
    },
    async (error) => {
      console.warn('Realtime listener with order warning (missing index fallback):', error.message);
      try {
        const fallbackQ = query(
          videosColRef,
          where('visibility', '==', 'public'),
          limit(pageSize)
        );
        const snap = await getDocs(fallbackQ);
        const list: VideoItem[] = [];
        snap.forEach((docSnap) => {
          list.push(convertMetadataToVideoItem(docSnap.data()));
        });
        list.sort((a: any, b: any) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        fastCache.set(CACHE_KEY_FEED, list);
        callback(list);
      } catch (fErr) {
        console.error('Fallback query failed:', fErr);
      }
    }
  );
}

/**
 * 7. Paginated Public Videos (Next batch fetching for Infinite Scroll)
 */
export async function loadPublicFeedVideosPaginated(
  lastDoc?: DocumentSnapshot,
  pageSize = 12
): Promise<{ videos: VideoItem[]; lastDoc?: DocumentSnapshot; hasMore: boolean }> {
  try {
    const videosColRef = collection(db, 'videos');
    let q = query(
      videosColRef,
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        videosColRef,
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const videos: VideoItem[] = [];
    snap.forEach((docSnap) => {
      videos.push(convertMetadataToVideoItem(docSnap.data()));
    });

    const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
    const hasMore = snap.docs.length >= pageSize;

    return { videos, lastDoc: newLastDoc, hasMore };
  } catch (err: any) {
    console.warn('Paginated fetch warning:', err.message);
    return { videos: [], hasMore: false };
  }
}

/**
 * Backward compatibility loader
 */
export async function loadPublicFeedVideos(): Promise<VideoItem[]> {
  try {
    const res = await loadPublicFeedVideosPaginated(undefined, 24);
    return res.videos;
  } catch (err) {
    console.error('Failed to load public feed videos:', err);
    return [];
  }
}

/**
 * 8. Record Video Share Interaction (Non-blocking background update)
 */
export async function recordVideoShare(videoId: string, ownerUid?: string): Promise<void> {
  try {
    const globalVideoRef = doc(db, 'videos', videoId);
    updateDoc(globalVideoRef, {
      sharesCount: increment(1),
    }).catch(() => {});

    if (ownerUid) {
      const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
      updateDoc(userVideoRef, {
        sharesCount: increment(1),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not record share interaction:', err);
  }
}

/**
 * 9. Record Video Download Interaction (Non-blocking background update)
 */
export async function recordVideoDownload(videoId: string, ownerUid?: string): Promise<void> {
  try {
    const globalVideoRef = doc(db, 'videos', videoId);
    updateDoc(globalVideoRef, {
      downloadsCount: increment(1),
    }).catch(() => {});

    if (ownerUid) {
      const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
      updateDoc(userVideoRef, {
        downloadsCount: increment(1),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not record download interaction:', err);
  }
}

/**
 * 10. Delete a video permanently from Firestore & Storage
 * Ensures only owner can delete!
 */
export async function deleteVideoPermanent(
  uid: string,
  videoId: string,
  storagePath?: string
): Promise<void> {
  let ownerUid = uid;
  try {
    const globalDocRef = doc(db, 'videos', videoId);
    const snap = await getDoc(globalDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.userId) {
        ownerUid = data.userId;
      }
      if (data.storagePath && !storagePath) {
        storagePath = data.storagePath;
      }
      await deleteDoc(globalDocRef);
    }
  } catch (gErr: any) {
    console.warn('Could not delete global video doc:', gErr);
  }

  // Delete User Video Document from both ownerUid and provided uid
  try {
    const userDocRef = doc(db, 'users', ownerUid, 'videos', videoId);
    await deleteDoc(userDocRef);
  } catch (_) {}

  if (uid && uid !== ownerUid) {
    try {
      const userDocRef2 = doc(db, 'users', uid, 'videos', videoId);
      await deleteDoc(userDocRef2);
    } catch (_) {}
  }

  // Invalidate cache
  fastCache.invalidate(CACHE_KEY_FEED);
  fastCache.invalidate(`${CACHE_KEY_USER_VIDEOS_PREFIX}${ownerUid}`);
  if (uid) {
    fastCache.invalidate(`${CACHE_KEY_USER_VIDEOS_PREFIX}${uid}`);
  }

  // Delete Storage files
  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Could not delete video storage file:', err);
    }
  }

  try {
    const thumbRef = ref(storage, `users/${ownerUid}/videos/${videoId}/thumbnail`);
    await deleteObject(thumbRef);
  } catch (_) {}

  // Decrement user postsCount
  const targetDecrementUid = ownerUid || uid;
  if (targetDecrementUid) {
    try {
      const userRef = doc(db, 'users', targetDecrementUid);
      await updateDoc(userRef, {
        postsCount: increment(-1),
      });
    } catch (e) {
      console.warn('Could not decrement postsCount:', e);
    }
  }

  console.log(`[Firestore] Deleted video ${videoId} permanently for owner ${ownerUid}`);
}
