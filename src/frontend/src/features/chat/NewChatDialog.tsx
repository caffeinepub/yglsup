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
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      if (error.message?.includes('friendship')) {
        toast.error('Cannot start conversation with this user');
      } else {
        toast.error('Failed to start conversation');
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
          <DialogDescription>Search for users to start a conversation</DialogDescription>
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

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResults.length === 0 && searchTerm.trim() ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
            ) : filteredResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Start typing to search for users
              </p>
            ) : (
              filteredResults.map((user) => {
                const initials = user.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={user.principal.toString()}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.principal.toString().slice(0, 30)}...
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartConversation(user)}
                      disabled={startConversationMutation.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      <MessageSquare className="h-4 w-4 mr-1.5" />
                      Chat
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
