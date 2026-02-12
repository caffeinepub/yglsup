import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Mic, MicOff, Video, Minimize2, AlertCircle } from 'lucide-react';
import { useCall } from './CallProvider';
import { useLocalMedia } from './useLocalMedia';

export default function CallScreen() {
  const { activeCall, isMuted, isMinimized, endCall, minimizeCall, toggleMute } = useCall();
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideoCall = activeCall?.kind === 'video';

  // Always call hooks unconditionally
  const { stream, isAcquiring, error, setAudioEnabled } = useLocalMedia({
    audio: !!activeCall,
    video: isVideoCall,
  });

  // Sync mute state with media stream
  useEffect(() => {
    if (activeCall) {
      setAudioEnabled(!isMuted);
    }
  }, [isMuted, setAudioEnabled, activeCall]);

  // Attach video stream to video element
  useEffect(() => {
    if (videoRef.current && stream && isVideoCall) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, isVideoCall]);

  // Early return after all hooks
  if (!activeCall) return null;

  // Hide when minimized but keep component mounted
  if (isMinimized) return null;

  const peerInitials = activeCall.peerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleEndCall = () => {
    endCall();
  };

  const handleMinimize = () => {
    minimizeCall();
  };

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-500/20 p-6">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white mb-3">Call Error</h2>
              <p className="text-white/80 text-lg leading-relaxed">{error}</p>
            </div>
            <div className="space-y-3 pt-4">
              <p className="text-sm text-white/60">
                Please check your device permissions and try again.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-900/95 backdrop-blur">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
              onClick={handleEndCall}
            >
              <Phone className="h-7 w-7 rotate-135" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show acquiring state
  if (isAcquiring) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <Avatar className="h-32 w-32 mx-auto border-4 border-emerald-500/30">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold">
                {peerInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">{activeCall.peerName}</h2>
              <div className="flex items-center justify-center gap-2 text-white/70">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <p>Starting {isVideoCall ? 'video' : 'voice'} call...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Video area or avatar */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        {isVideoCall ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Peer avatar overlay (since we don't have real video from peer) */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-white/20">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold">
                    {peerInitials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold text-white mb-2">{activeCall.peerName}</h2>
                <p className="text-white/70">Video call in progress...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Avatar className="h-32 w-32 mx-auto mb-6 border-4 border-emerald-500/30">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold">
                {peerInitials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-3xl font-semibold text-white mb-2">{activeCall.peerName}</h2>
            <p className="text-white/70 text-lg">Voice call in progress...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white"
            onClick={handleMinimize}
          >
            <Minimize2 className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`h-14 w-14 rounded-full border-white/20 ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {isVideoCall && (
            <Button
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white"
            >
              <Video className="h-6 w-6" />
            </Button>
          )}

          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
            onClick={handleEndCall}
          >
            <Phone className="h-7 w-7 rotate-135" />
          </Button>
        </div>
      </div>
    </div>
  );
}
