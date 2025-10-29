# Delete Work Session – Specification

**Status**: Draft  
**Last Updated**: 2025-10-29  
**Author**: Codex (w/ Athahar)

---

## Executive Summary

Service providers need a lightweight way to remove mistakenly logged work sessions while preserving transparency for clients. This feature introduces a delete action for unpaid sessions in the provider-facing client detail view. Deleting a session permanently removes it from billing totals, recalculates hours and balance due, and leaves an audit trail entry on both the client and service provider timelines.

---

## Goals
- Allow service providers to delete unpaid work sessions from the client detail screen.
- Confirm destructive intent through a modal with clear session context.
- Update derived totals (hours worked, balance due) immediately after deletion.
- Surface an immutable timeline activity reflecting who deleted what and when.
- Keep the client-facing experience in sync (client login view mirrors the deletion event).

## Non-Goals
- Editing previously logged sessions (duration, notes).
- Bulk deletion or multi-select workflows.
- Deleting sessions that are already invoiced or marked as paid.
- Historical reconstruction of deleted sessions beyond the timeline entry.

---

## User Experience

- **Entry Point**: Each unpaid session row in the provider client detail screen exposes a three-dot overflow menu with a `Delete` action. The control is hidden/disabled for paid or locked sessions. (Swipe-to-delete can be revisited later as an additive accelerator, but overflow remains the canonical entry point for discoverability and consistency.)
- **Confirmation Modal**:
  - Title: `Delete work session?`
  - Body primary line: `Delete work session for John — 25 min [9:10 am–9:35 am] on Oct 12 2025?`
  - Supporting copy: `This removes the session from totals and cannot be undone.`
  - Buttons: `Delete session` (destructive primary) and `Cancel`.
  - Modal uses the provider’s preferred timezone formatting, matching existing session rows.
- **Success State**:
  - Modal closes; the deleted session disappears from the list.
  - Toast/snackbar: `Work session deleted. Totals updated.`
  - Client header stats (hours worked, balance due) update in the same frame to reflect the new totals.
  - Activity timeline prepends: `Deleted by Mary — 25 min [9:10 am–9:35 am] on Oct 12 2025.` stamped with deletion timestamp.
  - Client login timeline mirrors the same entry for visibility.
- **Error Handling**:
  - Paid/locked session → show disabled state with tooltip/inline message `Linked to a payment` (exact copy TBD).
  - If the delete call fails (network/server), keep the session visible and show error toast `Couldn’t delete session. Try again.` with retry behavior matching existing patterns.

---

## Permissions & Constraints

- Eligibility: only sessions with status `unpaid` (and not tied to invoices or payments) can be deleted.
- Actor: service providers may delete sessions they own for that client; no separate admin surface in MVP (ops can fall back to direct SQL if needed).
- RLS: update Supabase row-level policies to allow the owner provider to soft-delete their unpaid sessions while keeping the operation blocked for other roles.
- No date range limits for providers; historical unpaid sessions remain eligible.
- All deletions are destructive from the user perspective (no undo), backed by a soft delete in data for audit purposes.

---

## Data Model & Persistence

- **Work Session Table**:
  - Add columns if not present: `deleted_at` (timestamp), `deleted_by_user_id` (UUID), `delete_reason` (enum/string, default `mistake`).
  - Business logic to exclude soft-deleted rows from standard queries (session lists, totals).
- **Totals Update**:
  - Recalculate `hours_worked_total` and `balance_due` atomically in the same transaction as the delete flag.
  - Derived amount should use existing rate-calculation utilities to avoid drift.
- **Audit Trail**:
  - Timeline table stores a new entry referencing the session ID, actor, timestamp, original duration, start/end times, and client/provider IDs.
  - Preserve the original rate/amount for future reporting even though totals drop.
- **Reporting**:
  - Flag deleted sessions in exports/dashboards; confirm whether they should surface or remain hidden.

---

## API Contract (Proposed)

- **Endpoint**: `DELETE /work-sessions/{id}`
  - Auth: provider (or admin) token scoped to the client owning the session.
  - Validation: reject with `409 Conflict` if session is paid, invoiced, already deleted, or belongs to another provider.
  - On success: return payload
    ```json
    {
      "deletedSessionId": "uuid",
      "deletedAt": "2025-10-12T16:35:00Z",
      "updatedClientSummary": {
        "totalMinutes": 360,
        "balanceDue": "120.00",
        "currency": "USD"
      },
      "activityEntry": {
        "id": "uuid",
        "type": "session_deleted",
        "displayText": "Deleted by Mary — 25 min [9:10 am–9:35 am] on Oct 12 2025.",
        "timestamp": "2025-10-12T16:35:05Z"
      }
    }
    ```
  - Frontend uses `updatedClientSummary` to refresh UI and `activityEntry` for timeline injection.
- **Error States**:
  - `404` if session not found.
  - `409` if state transitioned to paid/locked between fetch and delete.
  - `422` for optimistic lock/version mismatch (if implemented).

---

## Timeline & Transparency

- Provider timeline entry appears immediately after deletion.
- Client login timeline consumes the same feed to ensure transparency.
- Entries include actor display name and the exact session metadata (duration, start/end, date).
- Consider adding optional delta (e.g., `Balance adjusted −$40`) if we decide to expose monetary changes.

---

## Analytics & Logging

- Event `work_session_deleted` emitted with properties:
  - `session_id`, `client_id`, `provider_id`
  - `duration_minutes`, `amount`
  - `reason` (default `mistake`)
  - `surface` (`provider_client_detail`)
- Log every delete attempt and failure for audit (especially 409/422 cases).
- Timeline entries already act as an audit log visible to both parties.

---

## Acceptance Criteria

- Provider can delete an unpaid session; modal shows the correct client name, date, duration, and time range.
- Post-delete, session is removed from list and totals update without page refresh.
- Timeline shows a deletion entry including actor name in both provider and client views.
- Attempts to delete a paid or invoiced session are blocked with appropriate messaging.
- API safeguards prevent deleting sessions belonging to other providers.
- Deleted session data remains queryable via admin/audit tools (soft delete).

---

## Edge Cases & Handling

- **Race Conditions**: If a session is marked paid while modal is open, delete returns `409` and UI surfaces `Session can no longer be deleted.`.
- **Offline/Retry**: On network failure, leave session visible; allow manual retry.
- **Timezone**: Respect the existing timezone logic when formatting times in modal and timeline.
- **Idempotency**: Multiple delete attempts on the same session return success once, then `404/409` subsequently without corrupting totals.

---

## Implementation Checklist

1. Backend: add soft-delete fields, transactional delete logic, totals recalculation, and new API endpoint.
2. Backend: insert timeline entry and analytics logging.
3. Frontend: enable delete action, modal UI, call new API, update client summary state, push toast.
4. Frontend: inject returned activity entry into timeline store (provider + client contexts).
5. QA: manual test matrix (provider delete, blocked paid session, error retry, timeline visibility).
6. Documentation: update provider-facing support docs if necessary.

---

## Open Questions

1. Should the toast or timeline entry surface the balance change (e.g., `Balance adjusted −$40`)?  
2. Do operations/admin tools need a separate view of deleted sessions in exports or reports?  
3. Should admins also have access to the same delete endpoint for cleanup, or is provider-only sufficient?  
4. Do we need to capture a free-form reason for deletion beyond the default `mistake`?
