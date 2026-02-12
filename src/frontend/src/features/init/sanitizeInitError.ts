/**
 * Sanitizes initialization errors for safe display to users
 * Ensures no sensitive secrets are exposed in error messages
 */

export type ErrorKind = 'authorization' | 'network' | 'timeout' | 'unknown';

export interface SanitizedError {
  summary: string;
  technicalDetail?: string;
  kind: ErrorKind;
}

const SENSITIVE_PATTERNS = [
  /caffeineAdminToken/gi,
  /token[=:]\s*[^\s&]+/gi,
  /secret[=:]\s*[^\s&]+/gi,
  /password[=:]\s*[^\s&]+/gi,
];

/**
 * Removes sensitive information from error messages
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Classifies error type based on message content
 */
function classifyError(message: string, errorName?: string): ErrorKind {
  const lowerMessage = message.toLowerCase();
  
  // Check error name first for explicit classification
  if (errorName === 'NetworkError') {
    return 'network';
  }
  if (errorName === 'AuthorizationError') {
    return 'authorization';
  }
  
  // Network-related errors
  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('networkerror') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('health check failed') ||
    lowerMessage.includes('failed to connect') ||
    lowerMessage.includes('connection refused') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('could not reach')
  ) {
    return 'network';
  }

  // Authorization-related errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('authorization failed') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('authentication')
  ) {
    return 'authorization';
  }

  // Timeout errors
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('deadline exceeded')
  ) {
    return 'timeout';
  }

  return 'unknown';
}

/**
 * Converts an initialization error into user-safe summary, classification, and optional technical detail
 */
export function sanitizeInitError(error: Error | null): SanitizedError {
  if (!error) {
    return {
      summary: 'Unknown initialization error',
      kind: 'unknown',
    };
  }

  const sanitizedMessage = sanitizeMessage(error.message);
  const sanitizedStack = error.stack ? sanitizeMessage(error.stack) : undefined;
  const kind = classifyError(sanitizedMessage, error.name);

  // Provide user-friendly summaries based on error kind
  switch (kind) {
    case 'network':
      return {
        summary: 'Failed to connect to the network',
        technicalDetail: sanitizedMessage,
        kind: 'network',
      };

    case 'authorization':
      return {
        summary: 'Authorization failed',
        technicalDetail: sanitizedMessage,
        kind: 'authorization',
      };

    case 'timeout':
      return {
        summary: 'Connection timed out',
        technicalDetail: sanitizedMessage,
        kind: 'timeout',
      };

    default:
      return {
        summary: 'Failed to initialize connection',
        technicalDetail: sanitizedStack || sanitizedMessage,
        kind: 'unknown',
      };
  }
}
