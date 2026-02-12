import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { CallProvider } from './features/calls/CallProvider';
import CallScreen from './features/calls/CallScreen';
import CallChip from './features/calls/CallChip';
import IncomingCallManager from './features/calls/IncomingCallManager';
import ChatShell from './features/chat/ChatShell';
import NameStartView from './features/auth/NameStartView';
import { InitErrorScreen } from './features/init/InitErrorScreen';
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
  const { actor, principal, isFetching, initError, retry, reset } = useLocalActor();
  const [isRetrying, setIsRetrying] = useState(false);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retry();
    } finally {
      // Ensure isRetrying is cleared even if retry throws
      setIsRetrying(false);
    }
  };

  const handleReset = async () => {
    setIsRetrying(true);
    try {
      await reset();
      // Reset local UI state as well
      setDisplayName(null);
      setShowNameEntry(true);
    } finally {
      // Ensure isRetrying is cleared even if reset throws
      setIsRetrying(false);
    }
  };

  // Show loading state while initializing (only when actively fetching and no error)
  if (isFetching && !initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed
  if (initError || (!actor && !isFetching)) {
    return (
      <InitErrorScreen
        error={initError}
        onRetry={handleRetry}
        onReset={handleReset}
        isRetrying={isRetrying}
      />
    );
  }

  // Show name entry if needed
  if (showNameEntry || !displayName) {
    return <NameStartView onComplete={handleNameComplete} />;
  }

  // Ensure we have actor and principal before rendering main app
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
      <CallScreen />
      <CallChip />
      <IncomingCallManager />
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
