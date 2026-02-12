import { useState, useEffect, useCallback } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { loadOrCreateIdentity } from '../lib/localIdentity';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { getSecretParameter } from '../utils/urlParams';
import { sanitizeInitError } from '../features/init/sanitizeInitError';

interface UseLocalActorReturn {
  actor: backendInterface | null;
  identity: Identity | null;
  principal: Principal | null;
  isFetching: boolean;
  initError: Error | null;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
}

/**
 * Hook to create backend actor using locally-generated identity with health-check based initialization and optional admin-token setup
 */
export function useLocalActor(): UseLocalActorReturn {
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  const initActor = useCallback(async () => {
    try {
      setIsFetching(true);
      setInitError(null);

      // Load or create local identity
      const localIdentity = loadOrCreateIdentity();
      
      setIdentity(localIdentity);
      setPrincipal(localIdentity.getPrincipal());

      // Create actor with local identity
      const actorOptions = {
        agentOptions: {
          identity: localIdentity,
        },
      };

      const backendActor = await createActorWithConfig(actorOptions);
      
      // Health check: verify canister is reachable before proceeding
      try {
        await backendActor.checkHealth();
      } catch (healthError) {
        console.error('Health check failed:', healthError);
        const err = healthError instanceof Error ? healthError : new Error('Health check failed: ' + String(healthError));
        // Sanitize and set error so InitErrorScreen shows network-related summary
        const sanitized = sanitizeInitError(err);
        const networkError = new Error(sanitized.summary);
        networkError.name = 'NetworkError';
        setInitError(networkError);
        setActor(null);
        return;
      }

      // Initialize access control only if admin token is non-empty
      const adminToken = getSecretParameter('caffeineAdminToken');
      if (adminToken && adminToken.trim() !== '') {
        try {
          await backendActor._initializeAccessControlWithSecret(adminToken);
        } catch (tokenError) {
          console.error('Admin token initialization failed:', tokenError);
          // Convert token failure into sanitized authorization error
          const err = tokenError instanceof Error ? tokenError : new Error('Authorization failed: ' + String(tokenError));
          const sanitized = sanitizeInitError(err);
          const authError = new Error(sanitized.summary);
          authError.name = 'AuthorizationError';
          setInitError(authError);
          setActor(null);
          return;
        }
      }

      setActor(backendActor);
    } catch (error) {
      console.error('Failed to initialize local actor:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      const sanitized = sanitizeInitError(err);
      const initErr = new Error(sanitized.summary);
      setInitError(initErr);
      // Clear actor on error so UI can detect failure
      setActor(null);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const retry = useCallback(async () => {
    await initActor();
  }, [initActor]);

  const reset = useCallback(async () => {
    // Import reset utility dynamically to avoid circular deps
    const { resetLocalAppData } = await import('../features/init/resetLocalAppData');
    await resetLocalAppData();
    await initActor();
  }, [initActor]);

  useEffect(() => {
    initActor();
  }, [initActor]);

  return { actor, identity, principal, isFetching, initError, retry, reset };
}
