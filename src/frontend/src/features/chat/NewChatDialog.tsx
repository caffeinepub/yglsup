import { useState } from 'react';
import { useSearchUsers, useStartConversation } from '../../hooks/useQueries';
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
import { Search, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStart: (conversationId: ConversationId) => void;
  currentUser: InternalUserProfile;
}

export default function NewChatDialog({
  open,
  onOpenChange,
  onConversationStart,
  currentUser,
}: NewChatDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(searchTerm);
  const startConversationMutation = useStartConversation();

  const handleStartConversation = async (otherUser: InternalUserProfile) => {
    try {
      const conversationId = await startConversationMutation.mutateAsync(otherUser.principal);
      onConversationStart(conversationId);
      setSearchTerm('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      
      // Parse backend error messages for user-friendly display
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('friends') || errorMessage.includes('friendship')) {
        toast.error('You must be friends to start a chat.');
      } else if (errorMessage.includes('yourself')) {
        toast.error('Cannot start a conversation with yourself.');
      } else {
        toast.error('Failed to start chat. Please try again.');
      }
    }
  };

  const filteredResults = searchResults.filter(
    (user) => user.principal.toString() !== currentUser.principal.toString()
  );

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
              filteredResults.map((user) => {
                const initials = user.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={user.principal.toString()}
                    onClick={() => handleStartConversation(user)}
                    disabled={startConversationMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
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
                    <MessageSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
