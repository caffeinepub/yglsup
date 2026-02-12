import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalActor } from '../../hooks/useLocalActor';
import { CallStatus } from '../../backend';
import type { CallSession } from '../../backend';

interface UseCallSignalingOptions {
  callId: string | null;
  enabled: boolean;
  onStatusChange?: (status: CallStatus) => void;
  onOfferAvailable?: (offer: string) => void;
  onAnswerAvailable?: (answer: string) => void;
}

export function useCallSignaling({
  callId,
  enabled,
  onStatusChange,
  onOfferAvailable,
  onAnswerAvailable,
}: UseCallSignalingOptions) {
  const { actor } = useLocalActor();
  const previousStatusRef = useRef<CallStatus | null>(null);
  const offerNotifiedRef = useRef(false);
  const answerNotifiedRef = useRef(false);

  const { data: callSession, error } = useQuery<CallSession | null>({
    queryKey: ['callSession', callId],
    queryFn: async () => {
      if (!actor || !callId) return null;
      try {
        return await actor.getCallSession(callId);
      } catch (error: any) {
        console.error('Failed to fetch call session:', error);
        throw new Error('Failed to fetch call session: ' + (error.message || 'Unknown error'));
      }
    },
    enabled: enabled && !!actor && !!callId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: 3,
  });

  useEffect(() => {
    if (callSession) {
      // Notify status changes
      if (callSession.status !== previousStatusRef.current) {
        previousStatusRef.current = callSession.status;
        onStatusChange?.(callSession.status);
      }

      // Notify offer availability (for callee)
      if (callSession.offer && !offerNotifiedRef.current) {
        offerNotifiedRef.current = true;
        onOfferAvailable?.(callSession.offer);
      }

      // Notify answer availability (for caller)
      if (callSession.answer && !answerNotifiedRef.current) {
        answerNotifiedRef.current = true;
        onAnswerAvailable?.(callSession.answer);
      }
    }
  }, [callSession, onStatusChange, onOfferAvailable, onAnswerAvailable]);

  // Reset notification flags when callId changes
  useEffect(() => {
    offerNotifiedRef.current = false;
    answerNotifiedRef.current = false;
    previousStatusRef.current = null;
  }, [callId]);

  return { 
    callSession,
    error: error ? String(error) : null,
  };
}
