import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { CallProvider } from './features/calls/CallProvider';
import ChatShell from './features/chat/ChatShell';
import NameStartView from './features/auth/NameStartView';
import { useLocalActor } from './hooks/useLocalActor';
import { getDisplayName, isOnboardingComplete } from './lib/localProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const [showNameEntry, setShowNameEntry] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { actor, principal, isFetching } = useLocalActor();

  useEffect(() => {
    const savedName = getDisplayName();
    const onboardingDone = isOnboardingComplete();
    
    if (savedName && onboardingDone) {
      setDisplayName(savedName);
      setShowNameEntry(false);
    }
  }, []);

  const handleNameComplete = async (name: string) => {
    setDisplayName(name);
    setShowNameEntry(false);

    // Register with backend
    if (actor) {
      try {
        await actor.saveCallerUserProfile({ name });
      } catch (error) {
        console.error('Failed to save profile to backend:', error);
      }
    }
  };

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showNameEntry || !displayName) {
    return <NameStartView onComplete={handleNameComplete} />;
  }

  if (!actor || !principal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  const currentUser = {
    principal,
    displayName,
  };

  return (
    <CallProvider>
      <ChatShell currentUser={currentUser} />
    </CallProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
