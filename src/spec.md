# Specification

## Summary
**Goal:** Improve core 1:1 communication by fixing the call flow, adding in-chat photo sharing, gating chats/calls behind accepted friend requests, and updating the app’s branding to use the user-provided image.

**Planned changes:**
- Fix 1:1 voice/video call initiation so it reliably opens CallScreen, requests mic/camera permissions as needed, uses consistent voice vs video detection, and shows a clear in-UI error state when media acquisition fails (with a safe way to end/close the call).
- Add picture sharing in 1:1 chats: users can pick an image, send it as a message, and recipients can view it inline; update conversation list previews to show a label (e.g., “Photo”) for image messages.
- Persist image messages in the existing single-canister backend architecture while keeping existing text messages readable after upgrade (add migration only if required).
- Implement friend requests (send, list incoming pending, accept/reject, list friends) and enforce on the backend that starting chats, sending messages, and initiating calls only work for accepted friends; show English UI errors when blocked.
- Update NewChatDialog to send friend requests (instead of starting a conversation immediately) and add a “Requests” view to manage incoming requests.
- Replace existing generated branding in the UI with static frontend assets derived from the uploaded image (app icon + header logo), loaded only from frontend static files.

**User-visible outcome:** Users can reliably start voice/video calls with clear permission/error handling, share photos in 1:1 chats, and only chat/call after becoming friends via accepted requests; the app displays the new YGLSUP icon/logo derived from the uploaded image.
