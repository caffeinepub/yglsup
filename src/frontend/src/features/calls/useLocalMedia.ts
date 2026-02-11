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
  const optionsRef = useRef(options);

  // Track options changes
  useEffect(() => {
    optionsRef.current = options;
  }, [options.audio, options.video]);

  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const acquireMedia = async () => {
      if (!options.audio && !options.video) {
        // Clean up if no media requested
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setStream(null);
        setError(null);
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

        if (mounted) {
          streamRef.current = mediaStream;
          setStream(mediaStream);
        } else {
          // Component unmounted, clean up
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = normalizeMediaError(err);
          setError(errorMessage);
          console.error('Media acquisition error:', err);
        }
      } finally {
        if (mounted) {
          setIsAcquiring(false);
        }
      }
    };

    acquireMedia();

    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
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
