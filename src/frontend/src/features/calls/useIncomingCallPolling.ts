import { useEffect, useRef, useState } from 'react';
import { useLocalActor } from '../../hooks/useLocalActor';
import type { CallSession } from '../../backend';

interface UseIncomingCallPollingReturn {
  incomingCalls: CallSession[];
  isPolling: boolean;
  error: string | null;
}

export function useIncomingCallPolling(): UseIncomingCallPollingReturn {
  const { actor } = useLocalActor();
  const [incomingCalls, setIncomingCalls] = useState<CallSession[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!actor) {
      setIncomingCalls([]);
      setError(null);
      return;
    }

    const pollIncomingCalls = async () => {
      try {
        setIsPolling(true);
        const calls = await actor.getPendingIncomingCalls();
        setIncomingCalls(calls);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on success
      } catch (err: any) {
        console.error('Failed to poll incoming calls:', err);
        retryCountRef.current += 1;
        
        if (retryCountRef.current >= maxRetries) {
          setError('Failed to check for incoming calls');
        }
      } finally {
        setIsPolling(false);
      }
    };

    // Initial poll
    pollIncomingCalls();

    // Set up polling interval (every 2 seconds)
    intervalRef.current = setInterval(pollIncomingCalls, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [actor]);

  return {
    incomingCalls,
    isPolling,
    error,
  };
}
