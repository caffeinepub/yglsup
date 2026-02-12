import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useConversations, useUnreadConversations, useGetUser, useDeleteConversation } from '../../hooks/useQueries';
import { formatRelativeTime } from './time';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface ConversationListProps {
  currentUser: InternalUserProfile;
  selectedConversationId: ConversationId | null;
  onSelectConversation: (id: ConversationId) => void;
  onConversationDeleted: (id: ConversationId) => void;
}

export default function ConversationList({
  currentUser,
  selectedConversationId,
  onSelectConversation,
  onConversationDeleted,
}: ConversationListProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const { data: unreadConversations = [] } = useUnreadConversations();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="h-5 w-5 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center">
          No conversations yet. Start a new chat!
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
          // Use canonical conversationId from backend metadata
          const conversationId = conversation.conversationId;
          const isUnread = unreadConversations.includes(conversationId);
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
              onDelete={() => onConversationDeleted(conversationId)}
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
  onDelete: () => void;
}

function ConversationItem({
  conversationId,
  otherUserId,
  lastMessage,
  lastUpdate,
  isUnread,
  isSelected,
  currentUserId,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const { data: otherUser } = useGetUser(otherUserId);
  const deleteConversationMutation = useDeleteConversation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      toast.success('Chat deleted successfully');
      onDelete();
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      const errorMessage = error.message || 'Failed to delete chat';
      toast.error(errorMessage);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group',
          isSelected && 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
        )}
      >
        <button
          onClick={onSelect}
          className="flex-1 flex items-start gap-2.5 text-left min-w-0"
        >
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold text-sm">
              {otherUserInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className={cn('text-[15px] font-medium truncate', isUnread && 'text-emerald-700 dark:text-emerald-400')}>
                {otherUserDisplayName}
              </p>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                {formatRelativeTime(lastUpdate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p
                className={cn(
                  'text-[13px] truncate',
                  isUnread ? 'font-normal text-gray-900 dark:text-gray-100' : 'text-muted-foreground'
                )}
              >
                {lastMessageText}
              </p>
              {isUnread && (
                <Badge className="ml-2 shrink-0 bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-5 px-1.5">
                  New
                </Badge>
              )}
            </div>
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8"
          title="Delete chat"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the conversation and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteConversationMutation.isPending}
            >
              {deleteConversationMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
