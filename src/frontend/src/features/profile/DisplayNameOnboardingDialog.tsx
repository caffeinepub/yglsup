import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocalActor } from '../../hooks/useLocalActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '../../constants/branding';
import { UserCircle } from 'lucide-react';
import { saveDisplayName, setOnboardingComplete } from '../../lib/localProfile';

interface DisplayNameOnboardingDialogProps {
  onComplete: () => void;
}

export default function DisplayNameOnboardingDialog({ onComplete }: DisplayNameOnboardingDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const { actor } = useLocalActor();

  const registerMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.register(name);
    },
    onSuccess: () => {
      saveDisplayName(displayName.trim());
      setOnboardingComplete();
      onComplete();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      registerMutation.mutate(displayName.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-lg">
              <UserCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to {APP_NAME}!</CardTitle>
          <CardDescription>
            Choose a display name to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-12"
                autoFocus
                maxLength={50}
              />
            </div>
            {registerMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to register. Please try again.
              </p>
            )}
            <Button
              type="submit"
              disabled={!displayName.trim() || registerMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              size="lg"
            >
              {registerMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating Profile...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
