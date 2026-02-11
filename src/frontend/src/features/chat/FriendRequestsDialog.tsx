import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePendingFriendRequests, useAcceptFriendRequest, useDeclineFriendRequest, useGetUser } from '../../hooks/useQueries';
import { Check, X, Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FriendRequestsDialog({ open, onOpenChange }: FriendRequestsDialogProps) {
  const { data: pendingRequests = [], isLoading } = usePendingFriendRequests();
  const acceptMutation = useAcceptFriendRequest();
  const declineMutation = useDeclineFriendRequest();

  const handleAccept = async (requestor: any) => {
    try {
      await acceptMutation.mutateAsync(requestor);
      toast.success('Friend request accepted!');
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleDecline = async (requestor: any) => {
    try {
      await declineMutation.mutateAsync(requestor);
      toast.success('Friend request declined');
    } catch (error) {
      console.error('Failed to decline request:', error);
      toast.error('Failed to decline friend request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friend Requests</DialogTitle>
          <DialogDescription>
            {pendingRequests.length === 0
              ? 'No pending friend requests'
              : `${pendingRequests.length} pending request${pendingRequests.length > 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-4">
              <UserCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              No pending friend requests at the moment
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {pendingRequests.map((requestorPrincipal) => (
                <FriendRequestItem
                  key={requestorPrincipal.toString()}
                  requestorPrincipal={requestorPrincipal}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  isAccepting={acceptMutation.isPending}
                  isDeclining={declineMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FriendRequestItemProps {
  requestorPrincipal: any;
  onAccept: (requestor: any) => void;
  onDecline: (requestor: any) => void;
  isAccepting: boolean;
  isDeclining: boolean;
}

function FriendRequestItem({
  requestorPrincipal,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: FriendRequestItemProps) {
  const { data: requestor } = useGetUser(requestorPrincipal.toString());

  const initials = requestor
    ? requestor.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : requestorPrincipal.toString().slice(0, 2).toUpperCase();

  const displayName = requestor?.displayName || `${requestorPrincipal.toString().slice(0, 20)}...`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <Avatar className="h-12 w-12">
        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">Wants to connect</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => onAccept(requestorPrincipal)}
          disabled={isAccepting || isDeclining}
          className="h-9 w-9 text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onDecline(requestorPrincipal)}
          disabled={isAccepting || isDeclining}
          className="h-9 w-9 text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
