import { useGetPendingFriendRequests, useGetUser, useAcceptFriendRequest, useDeclineFriendRequest } from '../../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Check, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FriendRequestItem({ principalString }: { principalString: string }) {
  const { data: user, isLoading: userLoading } = useGetUser(principalString);
  const acceptMutation = useAcceptFriendRequest();
  const declineMutation = useDeclineFriendRequest();

  if (userLoading || !user) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(user.principal);
      toast.success(`You are now friends with ${user.displayName}!`);
    } catch (error: any) {
      console.error('Failed to accept friend request:', error);
      toast.error('Failed to accept request. Please try again.');
    }
  };

  const handleDecline = async () => {
    try {
      await declineMutation.mutateAsync(user.principal);
      toast.success('Friend request declined.');
    } catch (error: any) {
      console.error('Failed to decline friend request:', error);
      toast.error('Failed to decline request. Please try again.');
    }
  };

  const isLoading = acceptMutation.isPending || declineMutation.isPending;

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
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </div>
    </div>
  );
}

export default function FriendRequestsDialog({ open, onOpenChange }: FriendRequestsDialogProps) {
  const { data: pendingRequests = [], isLoading } = useGetPendingFriendRequests();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friend Requests</DialogTitle>
          <DialogDescription>
            {pendingRequests.length === 0 
              ? 'No pending friend requests' 
              : `You have ${pendingRequests.length} pending friend ${pendingRequests.length === 1 ? 'request' : 'requests'}`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
                  <UserPlus className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                No pending friend requests at the moment
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {pendingRequests.map((principal) => (
                <FriendRequestItem
                  key={principal.toString()}
                  principalString={principal.toString()}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
