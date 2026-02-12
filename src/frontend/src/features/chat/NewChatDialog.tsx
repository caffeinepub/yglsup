import { useState } from 'react';
import { useSearchUsers, useStartConversation, useGetRelationshipStatus, useSendFriendRequest, useAcceptFriendRequest, useDeclineFriendRequest } from '../../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, MessageSquare, UserPlus, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { FriendshipStatus } from '../../backend';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStart: (conversationId: ConversationId) => void;
  currentUser: InternalUserProfile;
}

function UserSearchResult({ 
  user, 
  currentUser,
  onConversationStart,
  onClose
}: { 
  user: InternalUserProfile; 
  currentUser: InternalUserProfile;
  onConversationStart: (conversationId: ConversationId) => void;
  onClose: () => void;
}) {
  const { data: relationshipStatus, isLoading: statusLoading } = useGetRelationshipStatus(user.principal);
  const startConversationMutation = useStartConversation();
  const sendFriendRequestMutation = useSendFriendRequest();
  const acceptFriendRequestMutation = useAcceptFriendRequest();
  const declineFriendRequestMutation = useDeclineFriendRequest();

  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleStartChat = async () => {
    try {
      const conversationId = await startConversationMutation.mutateAsync(user.principal);
      onConversationStart(conversationId);
      onClose();
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      await sendFriendRequestMutation.mutateAsync(user.principal);
      toast.success('Friend request sent!');
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('already exists')) {
        toast.error('Friend request already sent.');
      } else if (errorMessage.includes('blocked')) {
        toast.error('Cannot send friend request.');
      } else {
        toast.error('Failed to send friend request. Please try again.');
      }
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await acceptFriendRequestMutation.mutateAsync(user.principal);
      toast.success('Friend request accepted!');
    } catch (error: any) {
      console.error('Failed to accept friend request:', error);
      toast.error('Failed to accept request. Please try again.');
    }
  };

  const handleDeclineRequest = async () => {
    try {
      await declineFriendRequestMutation.mutateAsync(user.principal);
      toast.success('Friend request declined.');
    } catch (error: any) {
      console.error('Failed to decline friend request:', error);
      toast.error('Failed to decline request. Please try again.');
    }
  };

  const isLoading = 
    startConversationMutation.isPending || 
    sendFriendRequestMutation.isPending || 
    acceptFriendRequestMutation.isPending || 
    declineFriendRequestMutation.isPending;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-sm truncate">{user.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {user.principal.toString().slice(0, 20)}...
        </p>
      </div>
      <div className="shrink-0">
        {statusLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : relationshipStatus === FriendshipStatus.friends ? (
          <Button
            size="sm"
            onClick={handleStartChat}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
        ) : relationshipStatus === FriendshipStatus.pendingOutgoing ? (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="text-muted-foreground"
          >
            <Clock className="h-4 w-4 mr-1" />
            Pending
          </Button>
        ) : relationshipStatus === FriendshipStatus.pendingIncoming ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleAcceptRequest}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeclineRequest}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : relationshipStatus === FriendshipStatus.blocked ? (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="text-muted-foreground"
          >
            Blocked
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendFriendRequest}
            disabled={isLoading}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Friend
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NewChatDialog({
  open,
  onOpenChange,
  onConversationStart,
  currentUser,
}: NewChatDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(searchTerm);

  const filteredResults = searchResults.filter(
    (user) => user.principal.toString() !== currentUser.principal.toString()
  );

  const handleClose = () => {
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>Search for a user to start chatting</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm.trim() ? 'No users found' : 'Start typing to search'}
              </div>
            ) : (
              filteredResults.map((user) => (
                <UserSearchResult
                  key={user.principal.toString()}
                  user={user}
                  currentUser={currentUser}
                  onConversationStart={onConversationStart}
                  onClose={handleClose}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
