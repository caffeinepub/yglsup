import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MessageComposer from './MessageComposer';
import { useMessages, useMarkAsRead, useGetUser, useFriends, useSendFriendRequest } from '../../hooks/useQueries';
import { useMessagePolling } from './useMessagePolling';
import { useCall } from '../calls/CallProvider';
import { useLocalActor } from '../../hooks/useLocalActor';
import { formatMessageTime } from './time';
import { cn } from '@/lib/utils';
import { ArrowLeft, Phone, Video, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InternalUserProfile, ConversationId, CallKind } from '../../backend';
import { CallKind as CallKindEnum } from '../../backend';

interface MessageThreadProps {
  conversationId: ConversationId;
  currentUser: InternalUserProfile;
}

export default function MessageThread({ conversationId, currentUser }: MessageThreadProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const markAsReadMutation = useMarkAsRead();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { actor } = useLocalActor();
  const { startCall } = useCall();
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  // Enable polling for this conversation
  useMessagePolling(conversationId);

  // Parse conversation ID to get other user
  const [user1, user2] = conversationId.split('-');
  const otherUserId = user1 === currentUser.principal.toString() ? user2 : user1;

  // Fetch other user's profile and friends list
  const { data: otherUser } = useGetUser(otherUserId);
  const { data: friends = [] } = useFriends();
  const sendFriendRequestMutation = useSendFriendRequest();

  // Check if users are friends
  const isFriend = friends.some((f) => f.toString() === otherUserId);

  // Mark as read when conversation is opened
  useEffect(() => {
    if (conversationId) {
      markAsReadMutation.mutate(conversationId);
    }
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initiateCallMutation = useMutation({
    mutationFn: async (kind: CallKind) => {
      if (!actor || !otherUser) throw new Error('Not ready');
      const callId = await actor.initiateCall(otherUser.principal, kind);
      return { callId, kind };
    },
    onSuccess: ({ callId, kind }) => {
      if (otherUser) {
        startCall(otherUser.principal, otherUser.displayName, kind, callId);
      }
      setIsInitiatingCall(false);
    },
    onError: (error: any) => {
      console.error('Failed to initiate call:', error);
      setIsInitiatingCall(false);
      if (error.message?.includes('friendship')) {
        toast.error('You must be friends to start a call');
      } else {
        toast.error('Failed to start call. Please try again.');
      }
    },
  });

  const handleStartCall = (kind: CallKind) => {
    if (!otherUser || isInitiatingCall || !isFriend) return;
    setIsInitiatingCall(true);
    initiateCallMutation.mutate(kind);
  };

  const handleSendFriendRequest = async () => {
    if (!otherUser) return;
    try {
      await sendFriendRequestMutation.mutateAsync(otherUser.principal);
      toast.success('Friend request sent!');
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      if (error.message?.includes('already pending')) {
        toast.error('Friend request already sent');
      } else if (error.message?.includes('already friends')) {
        toast.error('You are already friends');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  const otherUserInitials = otherUser
    ? otherUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : otherUserId.slice(0, 2).toUpperCase();

  const otherUserDisplayName = otherUser?.displayName || `${otherUserId.slice(0, 15)}...`;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Thread Header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="md:hidden mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
              {otherUserInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{otherUserDisplayName}</p>
            {isFriend ? (
              <p className="text-xs text-muted-foreground">Online</p>
            ) : (
              <Badge variant="outline" className="text-xs">Not friends</Badge>
            )}
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-2">
          {isFriend ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall(CallKindEnum.voice)}
                disabled={isInitiatingCall}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="Start voice call"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall(CallKindEnum.video)}
                disabled={isInitiatingCall}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="Start video call"
              >
                <Video className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendFriendRequest}
              disabled={sendFriendRequestMutation.isPending}
              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            >
              {sendFriendRequestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1.5" />
              )}
              Add Friend
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-gradient-to-br from-gray-50 to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/20">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSelf = message.sender.toString() === currentUser.principal.toString();
              const hasImage = !!message.image;
              const hasText = message.text.trim().length > 0;

              return (
                <div
                  key={message.id.toString()}
                  className={cn('flex', isSelf ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl shadow-sm',
                      isSelf
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm',
                      hasImage && 'p-2',
                      !hasImage && 'px-4 py-2'
                    )}
                  >
                    {hasImage && (
                      <img
                        src={message.image!.getDirectURL()}
                        alt="Shared image"
                        className="rounded-lg max-w-full h-auto max-h-80 object-contain mb-1"
                      />
                    )}
                    {hasText && (
                      <p className={cn('text-sm break-words', hasImage && 'px-2 pb-1')}>{message.text}</p>
                    )}
                    <p
                      className={cn(
                        'text-xs mt-1',
                        isSelf ? 'text-emerald-100' : 'text-muted-foreground',
                        hasImage && 'px-2'
                      )}
                    >
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Composer */}
      {isFriend ? (
        <MessageComposer conversationId={conversationId} />
      ) : (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              You must be friends to send messages
            </p>
            <Button
              onClick={handleSendFriendRequest}
              disabled={sendFriendRequestMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {sendFriendRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Friend Request
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
