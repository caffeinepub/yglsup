import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Mic, MicOff, Video, Minimize2, AlertCircle, Info } from 'lucide-react';
import { useCall } from './CallProvider';
import { useLocalMedia } from './useLocalMedia';
import { useCallSignaling } from './useCallSignaling';
import { useUpdateCallStatus, useStartCall } from '../../hooks/useQueries';
import { createPeerConnection, createOffer, addLocalStream, setupRemoteStream, setRemoteAnswer } from './webrtc';
import { CallStatus, CallKind } from '../../backend';
import { toast } from 'sonner';
import CallDiagnostics from './CallDiagnostics';

export default function CallScreen() {
  const { activeCall, isMuted, isMinimized, endCall, minimizeCall, toggleMute, updateCallStatus, updateCallId, setPeerConnection, peerConnection } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const updateCallStatusMutation = useUpdateCallStatus();
  const startCallMutation = useStartCall();
  const signalingSetupDoneRef = useRef(false);
  const [signalingError, setSignalingError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const isVideoCall = activeCall?.kind === 'video';
  const isOutgoing = activeCall?.direction === 'outgoing';
  const hasCallId = !!(activeCall?.callId && activeCall.callId !== '');

  // Always call hooks unconditionally
  const { stream, isAcquiring, error, setAudioEnabled } = useLocalMedia({
    audio: !!activeCall,
    video: isVideoCall,
  });

  // Use signaling hook to track call status and get session data
  const { callSession, error: signalingHookError } = useCallSignaling({
    callId: hasCallId ? activeCall?.callId || null : null,
    enabled: hasCallId,
    onStatusChange: (status) => {
      updateCallStatus(status);
      if (status === CallStatus.ended || status === CallStatus.missed) {
        endCall();
      }
    },
  });

  // Setup WebRTC signaling for outgoing calls
  useEffect(() => {
    if (!activeCall || !stream || !isOutgoing || signalingSetupDoneRef.current || hasCallId) {
      return;
    }

    const setupOutgoingCall = async () => {
      try {
        // Create peer connection
        const pc = createPeerConnection();
        setPeerConnection(pc);

        // Add local stream
        addLocalStream(pc, stream);

        // Setup remote stream handler
        setupRemoteStream(pc, (remote) => {
          setRemoteStream(remote);
        });

        // Create offer
        const offerSdp = await createOffer(pc);

        // Convert local kind to backend CallKind enum
        const backendKind = activeCall.kind === 'video' ? CallKind.video : CallKind.voice;

        // Start call on backend with real SDP
        const callSession = await startCallMutation.mutateAsync({
          callee: activeCall.peerId,
          kind: backendKind,
          offer: offerSdp,
        });

        // Update call ID in provider
        updateCallId(callSession.id);

        // Update status to ringing once callId is assigned
        updateCallStatus(CallStatus.ringing);
        await updateCallStatusMutation.mutateAsync({
          callId: callSession.id,
          status: CallStatus.ringing,
        });

        // Mark setup as done
        signalingSetupDoneRef.current = true;
      } catch (err: any) {
        console.error('Failed to setup outgoing call:', err);
        setSignalingError(err.message || 'Failed to start call');
        toast.error('Failed to start call: ' + (err.message || 'Unknown error'));
      }
    };

    setupOutgoingCall();
  }, [activeCall, stream, isOutgoing, hasCallId]);

  // Poll for answer from callee (for outgoing calls)
  useEffect(() => {
    if (!activeCall || !isOutgoing || !hasCallId || !peerConnection || !callSession) {
      return;
    }

    const applyAnswer = async () => {
      try {
        if (callSession.answer && peerConnection.signalingState === 'have-local-offer') {
          await setRemoteAnswer(peerConnection, callSession.answer);
          // Update status to in progress
          updateCallStatus(CallStatus.inProgress);
        }
      } catch (err: any) {
        console.error('Failed to apply answer:', err);
        setSignalingError('Failed to connect call');
        toast.error('Failed to connect call: ' + (err.message || 'Unknown error'));
      }
    };

    applyAnswer();
  }, [callSession?.answer, activeCall, isOutgoing, hasCallId, peerConnection]);

  // Sync mute state with media stream
  useEffect(() => {
    if (activeCall) {
      setAudioEnabled(!isMuted);
    }
  }, [isMuted, setAudioEnabled, activeCall]);

  // Attach local video stream to video element
  useEffect(() => {
    if (localVideoRef.current && stream && isVideoCall) {
      localVideoRef.current.srcObject = stream;
    }
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [stream, isVideoCall]);

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && isVideoCall) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream, isVideoCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      signalingSetupDoneRef.current = false;
      setSignalingError(null);
    };
  }, [activeCall?.callId]);

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

  const handleEndCall = async () => {
    if (activeCall && hasCallId) {
      try {
        await updateCallStatusMutation.mutateAsync({
          callId: activeCall.callId,
          status: CallStatus.ended,
        });
      } catch (error: any) {
        console.error('Failed to update call status:', error);
        toast.error('Failed to end call on server');
      }
    }
    endCall();
  };

  const handleMinimize = () => {
    minimizeCall();
  };

  const getCallStatusText = () => {
    if (isAcquiring) return 'Starting call...';
    if (!hasCallId) return 'Connecting...';
    switch (activeCall.status) {
      case CallStatus.initiated:
        return 'Calling...';
      case CallStatus.ringing:
        return 'Ringing...';
      case CallStatus.inProgress:
        return `${isVideoCall ? 'Video' : 'Voice'} call in progress`;
      default:
        return 'Connecting...';
    }
  };

  // Show error state
  if (error || signalingError || signalingHookError) {
    const errorMessage = error || signalingError || signalingHookError || 'Unknown error';
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
              <p className="text-white/80 text-lg leading-relaxed">{errorMessage}</p>
            </div>
            <div className="space-y-3 pt-4">
              <p className="text-sm text-white/60">
                Please check your device permissions and try again.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900/95 backdrop-blur">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
              onClick={handleEndCall}
            >
              <Phone className="h-6 w-6 rotate-135" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show acquiring/connecting state
  if (isAcquiring || !hasCallId || activeCall.status === CallStatus.initiated || activeCall.status === CallStatus.ringing) {
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
                <p>{getCallStatusText()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics toggle button */}
        <div className="absolute top-4 right-4">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-white"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>

        {/* Diagnostics panel */}
        {showDiagnostics && (
          <CallDiagnostics
            peerName={activeCall.peerName}
            direction={activeCall.direction}
            status={activeCall.status}
            hasCallId={hasCallId}
            signalingError={signalingError || signalingHookError || null}
          />
        )}

        <div className="p-6 bg-gray-900/95 backdrop-blur">
          <div className="flex items-center justify-center">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
              onClick={handleEndCall}
            >
              <Phone className="h-6 w-6 rotate-135" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Video area or avatar */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        {isVideoCall ? (
          <div className="relative w-full h-full">
            {/* Remote video (peer) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Peer avatar overlay when no remote stream */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="text-center">
                  <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-white/20">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold">
                      {peerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-semibold text-white mb-2">{activeCall.peerName}</h2>
                  <p className="text-white/70">{getCallStatusText()}</p>
                </div>
              </div>
            )}
            {/* Local video (self) - picture-in-picture */}
            <div className="absolute top-4 right-4 w-32 h-40 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Avatar className="h-32 w-32 mx-auto mb-6 border-4 border-emerald-500/30">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-4xl font-bold">
                {peerInitials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold text-white mb-2">{activeCall.peerName}</h2>
            <p className="text-white/70">{getCallStatusText()}</p>
          </div>
        )}

        {/* Diagnostics toggle button */}
        <div className="absolute top-4 right-4">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-white"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>

        {/* Diagnostics panel */}
        {showDiagnostics && (
          <CallDiagnostics
            peerName={activeCall.peerName}
            direction={activeCall.direction}
            status={activeCall.status}
            hasCallId={hasCallId}
            signalingError={signalingError || signalingHookError || null}
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <Button
            size="icon"
            variant="ghost"
            className={`h-14 w-14 rounded-full ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            } text-white shadow-lg`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
            onClick={handleEndCall}
          >
            <Phone className="h-6 w-6 rotate-135" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-14 w-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
            onClick={handleMinimize}
          >
            <Minimize2 className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
