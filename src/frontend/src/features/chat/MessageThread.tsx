import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import MessageComposer from './MessageComposer';
import { useMessages, useMarkAsRead, useGetUser } from '../../hooks/useQueries';
import { useMessagePolling } from './useMessagePolling';
import { formatMessageTime } from './time';
import { cn } from '@/lib/utils';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useCall } from '../calls/CallProvider';
import { toast } from 'sonner';
import type { InternalUserProfile, ConversationId } from '../../backend';
import { CallKind } from '../../backend';

interface MessageThreadProps {
  conversationId: ConversationId;
  currentUser: InternalUserProfile;
  onBack: () => void;
}

export default function MessageThread({ conversationId, currentUser, onBack }: MessageThreadProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const markAsReadMutation = useMarkAsRead();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { startCall } = useCall();

  // Enable polling for this conversation
  useMessagePolling(conversationId);

  // Parse conversation ID to get other user
  const [user1, user2] = conversationId.split('-');
  const otherUserId = user1 === currentUser.principal.toString() ? user2 : user1;

  // Fetch other user's profile
  const { data: otherUser } = useGetUser(otherUserId);

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

  const otherUserInitials = otherUser
    ? otherUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : otherUserId.slice(0, 2).toUpperCase();

  const otherUserDisplayName = otherUser?.displayName || `${otherUserId.slice(0, 15)}...`;

  const handleStartCall = async (kind: CallKind) => {
    if (!otherUser) {
      toast.error('Cannot start call: User not found');
      return;
    }

    try {
      // Trigger call UI - CallScreen will handle WebRTC setup and backend call creation
      startCall(
        otherUser.principal,
        otherUser.displayName,
        kind,
        '' // Empty callId - will be set by CallScreen after backend call is created
      );

      toast.success(`Starting ${kind} call...`);
    } catch (error: any) {
      console.error('Failed to start call:', error);
      toast.error(error.message || 'Failed to start call');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Thread Header */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 bg-white dark:bg-gray-900 shadow-sm shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-1 h-9 w-9 shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9 mr-2.5 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold text-sm">
              {otherUserInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[15px] truncate">{otherUserDisplayName}</p>
            <p className="text-[11px] text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => handleStartCall(CallKind.video)}
            disabled={!otherUser}
            title="Video call"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => handleStartCall(CallKind.voice)}
            disabled={!otherUser}
            title="Voice call"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-gray-50 to-emerald-50/20 dark:from-gray-900 dark:to-emerald-950/20">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-3 space-y-2 min-h-full">
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
                        'max-w-[75%] rounded-lg shadow-sm',
                        isSelf
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm',
                        hasImage && 'p-1.5',
                        !hasImage && 'px-3 py-1.5'
                      )}
                    >
                      {hasImage && (
                        <img
                          src={message.image!.getDirectURL()}
                          alt="Shared image"
                          className="rounded-md max-w-full h-auto max-h-64 object-contain mb-0.5"
                        />
                      )}
                      {hasText && (
                        <p className={cn('text-[14px] break-words leading-snug', hasImage && 'px-1.5 pb-0.5')}>{message.text}</p>
                      )}
                      <p
                        className={cn(
                          'text-[10px] mt-0.5',
                          isSelf ? 'text-emerald-100' : 'text-muted-foreground',
                          hasImage && 'px-1.5'
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
      </div>

      {/* Message Composer - Fixed at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 safe-bottom">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}
