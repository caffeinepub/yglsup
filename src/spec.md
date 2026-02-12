# Specification

## Summary
**Goal:** Let users delete 1:1 conversations and stabilize the full call lifecycle so calling UI and media devices don’t get stuck or desync.

**Planned changes:**
- Add an authenticated backend method to delete a conversation by ConversationId, only allowing participants, and ensure deleted conversations no longer appear in conversation lists and their messages can’t be fetched.
- Add frontend conversation-list UI to delete a 1:1 chat with an English confirmation prompt, refresh the list after deletion, and clear the thread view if the deleted conversation was selected.
- Audit and fix the end-to-end voice/video call lifecycle across backend and frontend (initiate, ringing/in-progress, minimize/restore, mute/unmute, end) to prevent runtime errors, stuck sessions, duplicated streams, and unreleased media tracks.
- Improve call error handling for media permission/device failures and backend initiation failures with clear English UI states/toasts and correct reset of any loading/initiating state.
- Ensure no new friend-request features, UI entry points, routes, or backend methods are introduced as part of these changes.

**User-visible outcome:** Users can delete a 1:1 chat from the conversation list (with confirmation) and calls (voice/video) start, minimize/restore, mute/unmute, and end reliably with clear English errors when something fails.
