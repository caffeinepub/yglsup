import { useEffect, useRef, useState } from 'react';
import { useIncomingCallPolling } from './useIncomingCallPolling';
import { useGetUser } from '../../hooks/useQueries';
import { useCall } from './CallProvider';
import { useLocalActor } from '../../hooks/useLocalActor';
import { useAnswerCall, useUpdateCallStatus } from '../../hooks/useQueries';
import IncomingCallDialog from './IncomingCallDialog';
import { createPeerConnection, createAnswer, addLocalStream, setupRemoteStream } from './webrtc';
import { CallStatus, CallKind } from '../../backend';
import type { CallSession } from '../../backend';
import { toast } from 'sonner';

export default function IncomingCallManager() {
  const { incomingCalls, error: pollingError } = useIncomingCallPolling();
  const [currentIncomingCall, setCurrentIncomingCall] = useState<CallSession | null>(null);
  const { actor } = useLocalActor();
  const { receiveCall, updateCallStatus, setPeerConnection } = useCall();
  const answerCallMutation = useAnswerCall();
  const updateCallStatusMutation = useUpdateCallStatus();
  const notifiedCallsRef = useRef<Set<string>>(new Set());

  // Get caller info for the current incoming call
  const callerPrincipalString = currentIncomingCall?.caller.toString() || '';
  const { data: callerUser } = useGetUser(callerPrincipalString);

  // Detect new incoming calls
  useEffect(() => {
    if (incomingCalls.length > 0) {
      // Find first call we haven't notified about
      const newCall = incomingCalls.find((call) => !notifiedCallsRef.current.has(call.id));
      if (newCall) {
        notifiedCallsRef.current.add(newCall.id);
        setCurrentIncomingCall(newCall);
      }
    }
  }, [incomingCalls]);

  // Auto-dismiss dialog if call status changes to ended/missed
  useEffect(() => {
    if (currentIncomingCall) {
      const currentCall = incomingCalls.find((c) => c.id === currentIncomingCall.id);
      if (!currentCall || currentCall.status === CallStatus.ended || currentCall.status === CallStatus.missed) {
        setCurrentIncomingCall(null);
      }
    }
  }, [incomingCalls, currentIncomingCall]);

  const handleAccept = async () => {
    if (!currentIncomingCall || !actor || !callerUser) {
      toast.error('Cannot accept call: Missing information');
      return;
    }

    try {
      // Create peer connection
      const pc = createPeerConnection();
      setPeerConnection(pc);

      // Setup remote stream handler
      const remoteStreamPromise = new Promise<MediaStream>((resolve) => {
        setupRemoteStream(pc, (remote) => {
          resolve(remote);
        });
      });

      // Get local media
      const isVideo = currentIncomingCall.kind === CallKind.video;
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });

      // Add local stream to peer connection
      addLocalStream(pc, localStream);

      // Create answer using the offer from the call session
      if (!currentIncomingCall.offer) {
        throw new Error('No offer available in call session');
      }
      const answerSdp = await createAnswer(pc, currentIncomingCall.offer);

      // Send answer to backend
      await answerCallMutation.mutateAsync({
        callId: currentIncomingCall.id,
        answer: answerSdp,
      });

      // Update call status to inProgress so caller knows we're connected
      await updateCallStatusMutation.mutateAsync({
        callId: currentIncomingCall.id,
        status: CallStatus.inProgress,
      });

      // Open call UI with inProgress status
      receiveCall(
        currentIncomingCall.caller,
        callerUser.displayName,
        currentIncomingCall.kind,
        currentIncomingCall.id
      );

      // Update local call state to inProgress
      updateCallStatus(CallStatus.inProgress);

      // Clear dialog
      setCurrentIncomingCall(null);

      toast.success('Call connected');
    } catch (error: any) {
      console.error('Failed to accept call:', error);
      toast.error('Failed to accept call: ' + (error.message || 'Unknown error'));
      setPeerConnection(null);
    }
  };

  const handleDecline = async () => {
    if (!currentIncomingCall) return;

    try {
      // Mark call as missed
      await updateCallStatusMutation.mutateAsync({
        callId: currentIncomingCall.id,
        status: CallStatus.missed,
      });

      // Clear dialog
      setCurrentIncomingCall(null);

      toast.info('Call declined');
    } catch (error: any) {
      console.error('Failed to decline call:', error);
      toast.error('Failed to decline call: ' + (error.message || 'Unknown error'));
      // Still clear the dialog
      setCurrentIncomingCall(null);
    }
  };

  // Show polling error as toast
  useEffect(() => {
    if (pollingError) {
      console.error('Incoming call polling error:', pollingError);
      toast.error('Failed to check for incoming calls');
    }
  }, [pollingError]);

  if (!currentIncomingCall || !callerUser) return null;

  return (
    <IncomingCallDialog
      open={true}
      callerName={callerUser.displayName}
      callKind={currentIncomingCall.kind}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
