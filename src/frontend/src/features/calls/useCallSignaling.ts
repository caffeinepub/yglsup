import { useEffect, useRef } from 'react';
import { useGetCallSession } from '../../hooks/useQueries';
import { CallStatus } from '../../backend';
import type { CallId } from '../../backend';

interface UseCallSignalingOptions {
  callId: CallId | null;
  enabled: boolean;
  onStatusChange?: (status: CallStatus) => void;
  onOfferReceived?: (offer: string) => void;
  onAnswerReceived?: (answer: string) => void;
}

interface UseCallSignalingReturn {
  callSession: ReturnType<typeof useGetCallSession>['data'];
  isLoading: boolean;
  error: string | null;
}

export function useCallSignaling({
  callId,
  enabled,
  onStatusChange,
  onOfferReceived,
  onAnswerReceived,
}: UseCallSignalingOptions): UseCallSignalingReturn {
  const { data: callSession, isLoading, error: queryError } = useGetCallSession(enabled ? callId : null);
  
  const lastStatusRef = useRef<CallStatus | null>(null);
  const lastOfferRef = useRef<string | null>(null);
  const lastAnswerRef = useRef<string | null>(null);

  // Reset refs when callId changes
  useEffect(() => {
    lastStatusRef.current = null;
    lastOfferRef.current = null;
    lastAnswerRef.current = null;
  }, [callId]);

  // Notify on status change
  useEffect(() => {
    if (callSession && callSession.status !== lastStatusRef.current) {
      lastStatusRef.current = callSession.status;
      onStatusChange?.(callSession.status);
    }
  }, [callSession?.status, onStatusChange]);

  // Notify on offer received
  useEffect(() => {
    if (callSession?.offer && callSession.offer !== lastOfferRef.current) {
      lastOfferRef.current = callSession.offer;
      onOfferReceived?.(callSession.offer);
    }
  }, [callSession?.offer, onOfferReceived]);

  // Notify on answer received
  useEffect(() => {
    if (callSession?.answer && callSession.answer !== lastAnswerRef.current) {
      lastAnswerRef.current = callSession.answer;
      onAnswerReceived?.(callSession.answer);
    }
  }, [callSession?.answer, onAnswerReceived]);

  // Convert query error to user-friendly message
  const errorMessage = queryError 
    ? 'Failed to fetch call session' 
    : null;

  return {
    callSession,
    isLoading,
    error: errorMessage,
  };
}
