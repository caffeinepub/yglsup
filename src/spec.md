# Specification

## Summary
**Goal:** Fix chat start failures by using a consistent canonical conversation ID across backend and frontend, prevent existing chats from being reset, and ensure chat threads auto-scroll to the newest message with clearer English error messages.

**Planned changes:**
- Backend: Update `getConversations()` to return conversation metadata that includes the canonical `conversationId` used as the key in stored conversation records.
- Frontend: Stop reconstructing conversation IDs from participant pairs; use the backend-provided `conversationId` for conversation selection, message fetching, unread status checks, and related operations.
- Backend: Update `startConversation()` so that if a conversation already exists for two users, it returns the existing `conversationId` without overwriting stored conversation data (messages/lastSeen).
- Frontend: Implement reliable auto-scroll to the latest message when new messages arrive (including via polling), scrolling the actual `ScrollArea` viewport.
- Frontend: Improve chat start failure errors to reflect backend failure reasons (e.g., “You must be friends to chat”), with an English generic fallback for unexpected failures.

**User-visible outcome:** Users can consistently open existing chats without “Failed to chat/start conversation” errors, chat history is preserved when re-starting a chat with the same user, incoming/new messages automatically scroll into view, and chat start errors display clearer English reasons when applicable.
