import { useEffect, useRef, useState } from 'react';

interface UseLocalMediaOptions {
  audio: boolean;
  video: boolean;
}

interface UseLocalMediaReturn {
  stream: MediaStream | null;
  isAcquiring: boolean;
  error: string | null;
  toggleAudio: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  cleanup: () => void;
}

function normalizeMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permission denied. Please allow access to your camera and microphone.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera or microphone found. Please connect a device and try again.';
      case 'NotSupportedError':
        return 'Your browser does not support media devices.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Could not access media device. It may be in use by another application.';
      case 'OverconstrainedError':
        return 'Could not satisfy media constraints. Please try again.';
      case 'AbortError':
        return 'Media acquisition was aborted.';
      default:
        return `Media error: ${err.message || 'Unknown error'}`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to access media devices';
}

export function useLocalMedia(options: UseLocalMediaOptions): UseLocalMediaReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const acquireMedia = async () => {
      // Don't acquire if cleanup is in progress
      if (cleanupInProgressRef.current) {
        return;
      }

      if (!options.audio && !options.video) {
        // Clean up if no media requested
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setStream(null);
        setError(null);
        setIsAcquiring(false);
        return;
      }

      setIsAcquiring(true);
      setError(null);

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: options.audio,
          video: options.video,
        });

        currentStream = mediaStream;

        if (mounted && !cleanupInProgressRef.current) {
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setIsAcquiring(false);
        } else {
          // Component unmounted or cleanup started, clean up immediately
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        if (mounted && !cleanupInProgressRef.current) {
          const errorMessage = normalizeMediaError(err);
          setError(errorMessage);
          console.error('Media acquisition error:', err);
          setIsAcquiring(false);
        }
      }
    };

    acquireMedia();

    return () => {
      mounted = false;
      cleanupInProgressRef.current = true;
      
      // Clean up current stream
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // Reset cleanup flag after a short delay
      setTimeout(() => {
        cleanupInProgressRef.current = false;
      }, 100);
    };
  }, [options.audio, options.video]);

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  const setAudioEnabled = (enabled: boolean) => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });
    }
  };

  const cleanup = () => {
    cleanupInProgressRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    setTimeout(() => {
      cleanupInProgressRef.current = false;
    }, 100);
  };

  return {
    stream,
    isAcquiring,
    error,
    toggleAudio,
    setAudioEnabled,
    cleanup,
  };
}
