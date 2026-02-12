# Specification

## Summary
**Goal:** Fix app startup “Initialization Failed” by making admin-token handling non-fatal during actor initialization, improving init error recovery UX, and adding a permissionless backend health-check to better distinguish network vs authorization failures.

**Planned changes:**
- Update frontend actor initialization to treat missing/empty admin token as optional and avoid calling `_initializeAccessControlWithSecret` with an empty string.
- Update local actor initialization to surface `_initializeAccessControlWithSecret` failures as initialization errors using sanitized messages, so the app shows `InitErrorScreen` rather than hanging/crashing.
- Improve `InitErrorScreen` messaging to distinguish authorization/token failures vs network failures (via existing `sanitizeInitError`) and provide safe user guidance for authorization-related issues; keep Retry/Reset working without getting stuck on “Initializing...”.
- Add a lightweight backend query health-check method (e.g., `health()`/`ping()`) that requires no user permission, and call it during frontend initialization to detect unreachable-canister conditions and route failures into `initError`.

**User-visible outcome:** The app starts reliably even without an admin token; when initialization fails, users see a clear error screen that differentiates authorization/token issues from network reachability issues and can recover using Retry or Reset without being stuck on an indefinite loading state.
