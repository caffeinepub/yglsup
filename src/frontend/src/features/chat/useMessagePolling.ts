import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ConversationId } from '../../backend';

const POLLING_INTERVAL = 3000; // 3 seconds

export function useMessagePolling(conversationId: ConversationId | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      // Refetch messages for the active conversation
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      // Also refresh conversations list to update metadata
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Refresh unread status
      queryClient.invalidateQueries({ queryKey: ['unreadConversations'] });
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [conversationId, queryClient]);
}
