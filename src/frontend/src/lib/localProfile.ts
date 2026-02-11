const DISPLAY_NAME_KEY = 'yglsup_display_name';
const ONBOARDING_COMPLETE_KEY = 'yglsup_onboarding_complete';

/**
 * Get the stored display name from localStorage
 */
export function getDisplayName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

/**
 * Save display name to localStorage
 */
export function saveDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

/**
 * Clear display name from localStorage
 */
export function clearDisplayName(): void {
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function setOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

/**
 * Clear onboarding state
 */
export function clearOnboardingState(): void {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

/**
 * Clear all local profile data
 */
export function clearAllProfileData(): void {
  clearDisplayName();
  clearOnboardingState();
}
