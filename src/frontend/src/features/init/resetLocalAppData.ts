import { clearIdentity } from '../../lib/localIdentity';
import { clearAllProfileData } from '../../lib/localProfile';
import { clearSessionParameter } from '../../utils/urlParams';

/**
 * Resets all locally persisted app data
 * Clears identity, profile, onboarding state, and session parameters
 */
export async function resetLocalAppData(): Promise<void> {
  try {
    // Clear local identity
    clearIdentity();

    // Clear profile and onboarding state
    clearAllProfileData();

    // Clear session parameters (e.g., admin token)
    clearSessionParameter('caffeineAdminToken');

    console.log('Local app data reset successfully');
  } catch (error) {
    console.error('Error resetting local app data:', error);
    throw error;
  }
}
