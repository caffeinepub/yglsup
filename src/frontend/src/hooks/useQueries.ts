import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalActor } from './useLocalActor';
import { Principal } from '@icp-sdk/core/principal';
import { ExternalBlob } from '../backend';
import type { ConversationMetadata, Message, InternalUserProfile, ConversationId } from '../backend';

export function useConversations() {
  const { actor, isFetching } = useLocalActor();

  return useQuery<ConversationMetadata[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!actor) return [];
      const conversations = await actor.getConversations();
      // Sort by last update time, most recent first
      return conversations.sort((a, b) => Number(b.lastUpdate - a.lastUpdate));
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useMessages(conversationId: ConversationId) {
  const { actor, isFetching } = useLocalActor();

  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessages(conversationId);
    },
    enabled: !!actor && !isFetching && !!conversationId,
  });
}

export function useUnreadConversations() {
  const { actor, isFetching } = useLocalActor();

  return useQuery<ConversationId[]>({
    queryKey: ['unreadConversations'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUnreadConversations();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useSearchUsers(searchTerm: string) {
  const { actor, isFetching } = useLocalActor();

  return useQuery<InternalUserProfile[]>({
    queryKey: ['searchUsers', searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm.trim()) return [];
      return actor.searchUsers(searchTerm.trim());
    },
    enabled: !!actor && !isFetching && searchTerm.trim().length > 0,
  });
}

export function useGetUser(principalString: string) {
  const { actor, isFetching } = useLocalActor();

  return useQuery<InternalUserProfile | null>({
    queryKey: ['user', principalString],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const principal = Principal.fromText(principalString);
        return actor.getUser(principal);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!principalString,
  });
}

export function useSendMessage() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      text, 
      image 
    }: { 
      conversationId: ConversationId; 
      text: string; 
      image?: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.sendMessage(conversationId, text, image || null);
    },
    onSuccess: (_, variables) => {
      // Immediately refresh messages for this conversation
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      // Refresh conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useStartConversation() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: Principal) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.startConversation(otherUserId);
    },
    onSuccess: () => {
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkAsRead() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: ConversationId) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.markAsRead(conversationId);
    },
    onSuccess: () => {
      // Refresh unread conversations
      queryClient.invalidateQueries({ queryKey: ['unreadConversations'] });
    },
  });
}

// Friend request hooks
export function useFriends() {
  const { actor, isFetching } = useLocalActor();

  return useQuery<Principal[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFriends();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePendingFriendRequests() {
  const { actor, isFetching } = useLocalActor();

  return useQuery<Principal[]>({
    queryKey: ['pendingFriendRequests'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingFriendRequests();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useSendFriendRequest() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Principal) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.sendFriendRequest(target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestor: Principal) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.acceptFriendRequest(requestor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestor: Principal) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.declineFriendRequest(requestor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests'] });
    },
  });
}
