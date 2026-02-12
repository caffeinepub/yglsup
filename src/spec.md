# Specification

## Summary
**Goal:** Restore voice/video calling in production by fixing WebRTC signaling/SDP lifecycle, incoming call detection, and backend call status transitions, and by improving frontend error visibility for debugging.

**Planned changes:**
- Fix outgoing call signaling so the RTCPeerConnection that creates the SDP offer is the same one that later applies the SDP answer, using the backend-stored offer/answer for the call session.
- Implement/fix backend getPendingIncomingCalls() to reliably return only actionable incoming calls for the authenticated user (e.g., initiated/ringing where caller != callee).
- Align backend call session lifecycle with the frontend flow by enforcing consistent status transitions for startCall, answerCall, and updateCallStatus, including participant-only access/mutation and protection against invalid transitions.
- Improve frontend call failure visibility by surfacing English error messages for backend/signaling/permission failures and logging underlying errors to the console, without modifying immutable hook/UI paths.

**User-visible outcome:** From a 1:1 chat, users can place and receive voice calls that reliably ring, connect after acceptance, and end cleanly; if something fails (permissions or signaling/backend issues), the call UI shows a clear English error and developers can see details in console logs.
