import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalActor } from '../../hooks/useLocalActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { saveDisplayName } from '../../lib/localProfile';

interface ChangeDisplayNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
}

export default function ChangeDisplayNameDialog({
  open,
  onOpenChange,
  currentName,
}: ChangeDisplayNameDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const { actor } = useLocalActor();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateDisplayName(name);
    },
    onSuccess: (updatedProfile) => {
      // Save locally
      saveDisplayName(updatedProfile.displayName);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Close dialog
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== currentName) {
      updateMutation.mutate(trimmedName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Display Name</DialogTitle>
          <DialogDescription>
            Update your display name. This will be visible to other users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">New Display Name</Label>
              <Input
                id="newName"
                type="text"
                placeholder="Enter new name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={updateMutation.isPending}
                maxLength={50}
                autoFocus
              />
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to update name. Please try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName || updateMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Updating...
                </>
              ) : (
                'Update Name'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
