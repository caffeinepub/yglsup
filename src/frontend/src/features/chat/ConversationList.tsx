import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useConversations, useUnreadConversations, useGetUser } from '../../hooks/useQueries';
import { formatRelativeTime } from './time';
import { cn } from '@/lib/utils';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface ConversationListProps {
  currentUser: InternalUserProfile;
  selectedConversationId: ConversationId | null;
  onSelectConversation: (id: ConversationId) => void;
}

export default function ConversationList({
  currentUser,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const { data: unreadConversations = [] } = useUnreadConversations();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground text-center">
          No conversations yet. Start a new chat to begin!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {conversations.map((conversation) => {
          const [user1, user2] = conversation.participants;
          const otherUserId =
            user1.toString() === currentUser.principal.toString() ? user2 : user1;
          const isUnread = unreadConversations.includes(
            `${user1.toString()}-${user2.toString()}` as ConversationId
          );
          const conversationId = `${user1.toString()}-${user2.toString()}` as ConversationId;
          const isSelected = conversationId === selectedConversationId;

          return (
            <ConversationItem
              key={conversationId}
              conversationId={conversationId}
              otherUserId={otherUserId.toString()}
              lastMessage={conversation.lastMessage}
              lastUpdate={conversation.lastUpdate}
              isUnread={isUnread}
              isSelected={isSelected}
              currentUserId={currentUser.principal.toString()}
              onSelect={() => onSelectConversation(conversationId)}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface ConversationItemProps {
  conversationId: ConversationId;
  otherUserId: string;
  lastMessage: any;
  lastUpdate: bigint;
  isUnread: boolean;
  isSelected: boolean;
  currentUserId: string;
  onSelect: () => void;
}

function ConversationItem({
  otherUserId,
  lastMessage,
  lastUpdate,
  isUnread,
  isSelected,
  currentUserId,
  onSelect,
}: ConversationItemProps) {
  const { data: otherUser } = useGetUser(otherUserId);

  const otherUserInitials = otherUser
    ? otherUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : otherUserId.slice(0, 2).toUpperCase();

  const otherUserDisplayName = otherUser?.displayName || `${otherUserId.slice(0, 20)}...`;

  const getLastMessagePreview = () => {
    if (!lastMessage) return 'No messages yet';
    
    const isSelf = lastMessage.sender.toString() === currentUserId;
    const prefix = isSelf ? 'You: ' : '';
    
    // If message has an image
    if (lastMessage.image) {
      // If there's also text, show it
      if (lastMessage.text && lastMessage.text.trim()) {
        return `${prefix}${lastMessage.text}`;
      }
      // Otherwise show "Photo"
      return `${prefix}Photo`;
    }
    
    // Text-only message
    return `${prefix}${lastMessage.text}`;
  };

  const lastMessageText = getLastMessagePreview();

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left',
        isSelected && 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
          {otherUserInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className={cn('text-sm font-semibold truncate', isUnread && 'text-emerald-700 dark:text-emerald-400')}>
            {otherUserDisplayName}
          </p>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {formatRelativeTime(lastUpdate)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-muted-foreground'
            )}
          >
            {lastMessageText}
          </p>
          {isUnread && (
            <Badge className="ml-2 shrink-0 bg-emerald-600 hover:bg-emerald-600 text-white">
              New
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
