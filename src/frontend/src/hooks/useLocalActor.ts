import { useState, useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { loadOrCreateIdentity } from '../lib/localIdentity';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { getSecretParameter } from '../utils/urlParams';

interface UseLocalActorReturn {
  actor: backendInterface | null;
  identity: Identity | null;
  principal: Principal | null;
  isFetching: boolean;
}

/**
 * Hook to create backend actor using locally-generated identity
 */
export function useLocalActor(): UseLocalActorReturn {
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initActor = async () => {
      try {
        setIsFetching(true);

        // Load or create local identity
        const localIdentity = loadOrCreateIdentity();
        
        if (mounted) {
          setIdentity(localIdentity);
          setPrincipal(localIdentity.getPrincipal());
        }

        // Create actor with local identity
        const actorOptions = {
          agentOptions: {
            identity: localIdentity,
          },
        };

        const backendActor = await createActorWithConfig(actorOptions);
        
        // Initialize access control
        const adminToken = getSecretParameter('caffeineAdminToken') || '';
        await backendActor._initializeAccessControlWithSecret(adminToken);

        if (mounted) {
          setActor(backendActor);
        }
      } catch (error) {
        console.error('Failed to initialize local actor:', error);
      } finally {
        if (mounted) {
          setIsFetching(false);
        }
      }
    };

    initActor();

    return () => {
      mounted = false;
    };
  }, []);

  return { actor, identity, principal, isFetching };
}
