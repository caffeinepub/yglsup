import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import MessageComposer from './MessageComposer';
import { useMessages, useMarkAsRead, useGetUser } from '../../hooks/useQueries';
import { useMessagePolling } from './useMessagePolling';
import { formatMessageTime } from './time';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface MessageThreadProps {
  conversationId: ConversationId;
  currentUser: InternalUserProfile;
}

export default function MessageThread({ conversationId, currentUser }: MessageThreadProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const markAsReadMutation = useMarkAsRead();
  const scrollRef = useRef<HTMLDivElement>(null);

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
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
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
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
