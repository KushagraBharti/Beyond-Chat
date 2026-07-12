# Read-only autostash inventory

Captured at: **2026-07-12 UTC**

Captured against commit: **`a90849180a3f1c230d989bebcf57442382c4778d`**

This inventory records Git object IDs, filenames, and diff statistics only. No
stash content or credential value was read. Neither stash was applied, popped,
dropped, rewritten, or otherwise mutated. Stashes are historical local state,
not part of the canonical repository baseline.

## `stash@{0}`

- Object: `e79335217946812b6a7b0fc36af60b09d3211077`
- Created: `2026-04-09 17:00:44 -0500`
- Subject: `On main: autostash`
- Stat: `weeklyUpdates/week7.md` — 147 insertions

## `stash@{1}`

- Object: `e4265f3b5cdab2e578e4186c1e2238ac2f67ede7`
- Created: `2026-04-02 16:27:44 -0500`
- Subject: `On main: autostash`
- Stat: 14 files, 102 insertions, 563 deletions
- Paths: eight legacy SQL files under `backend/sql-related-files/`;
  `backend/src/config.py`; `backend/src/main.py`; `backend/src/providers.py`;
  `backend/src/supabase_service.py`; `frontend/src/pages/public/LoginPage.tsx`;
  and `manual.md`

## Disposition

No current gate depends on either stash. Before any future apply/drop action, an
owner must compare filenames against the canonical migrations and current auth
implementation, check the stash for sensitive material using an approved
non-printing process, and record the decision. This capture is superseded only
by a later inventory that names this file, records a new capture time and commit,
and explains the stash mutation.
