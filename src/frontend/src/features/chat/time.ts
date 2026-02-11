export function formatRelativeTime(timestamp: bigint): string {
  const now = Date.now();
  const messageTime = Number(timestamp) / 1_000_000; // Convert nanoseconds to milliseconds
  const diffMs = now - messageTime;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  const date = new Date(messageTime);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMessageTime(timestamp: bigint): string {
  const messageTime = Number(timestamp) / 1_000_000; // Convert nanoseconds to milliseconds
  const date = new Date(messageTime);
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
