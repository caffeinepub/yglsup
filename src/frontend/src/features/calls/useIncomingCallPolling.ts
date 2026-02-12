import { useQuery } from '@tanstack/react-query';
import { useLocalActor } from '../../hooks/useLocalActor';
import type { CallSession } from '../../backend';

export function useIncomingCallPolling() {
  const { actor, isFetching } = useLocalActor();

  const { data: incomingCalls = [], error } = useQuery<CallSession[]>({
    queryKey: ['incomingCalls'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getPendingIncomingCalls();
      } catch (error: any) {
        console.error('Failed to fetch incoming calls:', error);
        throw new Error('Failed to fetch incoming calls: ' + (error.message || 'Unknown error'));
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: 3,
  });

  return {
    incomingCalls,
    hasIncomingCall: incomingCalls.length > 0,
    error: error ? String(error) : null,
  };
}
