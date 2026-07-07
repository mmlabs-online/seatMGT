# Feature Backlog — Seat & Device Tracking System

> All confirmed features rewritten as user stories. Each story keeps its
> original feature ID (`CODE-NN`) for traceability back to the product brief.
> Format: **As a** \<role\>, **I want** \<capability\>, **so that** \<value\>.

**Roles**
- **Admin** — full control, including room / seat / layout CRUD.
- **Manager** — approves requests, assigns seats directly, manages accounts, members, and own devices.
- **User** — views all seats, requests seats (pending approval), manages own devices.

**Status legend:** ✅ Confirmed · 🟡 Depends on an open decision

**Locked invariants** (enforced server-side, referenced by the stories below)
1. One occupant per seat maximum.
2. One person may occupy multiple seats.
3. One primary device per seat, owned by the seat's current occupant.
4. Unlimited secondary ("borrowed") devices per seat, owned by anyone.
5. Devices may exist unassigned in inventory.
6. Seat status is *derived* from occupant assignment, never stored.
7. Seat codes are auto-generated from `room code + port sequence` (e.g. `C302-01`).
8. When an occupant leaves a seat, their primary device auto-demotes to secondary.

---

## AUT — Authentication & Account

**AUT-01 — Login / logout** ✅
As a member of the organization, I want to log in and out securely, so that only authorized people can access the system and I can end my session when done.
- Valid credentials grant access; invalid ones are rejected with a clear message.
- Logout terminates the session immediately.

**AUT-02 — Session management** ✅
As a logged-in user, I want my session to persist safely across page loads, so that I stay authenticated without re-entering credentials on every action.
- Sessions expire after inactivity / configured lifetime.
- Session identity is available to both API and UI for access checks.

**AUT-03 — Account management** ✅
As an Admin, I want to create, edit, and delete accounts, so that I control who can access the system (no self-signup).
- Only Admin (and Manager per scope) can create accounts.
- Editing an account updates its profile; deleting revokes access.

**AUT-04 — Assign role to account** ✅
As an Admin, I want to assign a role to each account, so that every user has the correct level of access.
- Each account has exactly one global role.
- Changing a role takes effect on the next authorized action.

**AUT-05 — Role-based access tiers** ✅
As an Admin, I want the system to enforce distinct tiers (User · Manager · Admin), so that permissions map to responsibilities.
- Each tier exposes only its permitted actions.
- *(Open: optional Viewer tier — read-only.)*

> 🟡 Open decision: custom auth vs. SSO / Active Directory integration.

---

## ROO — Room

**ROO-01 — Manage rooms** ✅
As an Admin, I want to create, edit, and delete rooms (code, name, description), so that the system reflects the organization's physical spaces.
- Room code is unique (e.g. `C302`).
- Deleting a room handles its seats safely (blocked or cascaded per rule).

**ROO-02 — Auto-generate port codes** ✅
As an Admin, I want seat/port codes generated automatically from the room code plus a sequence, so that codes stay consistent and collision-free.
- Adding a seat produces the next code (`C302-01`, `C302-02`, …).
- Codes are never entered manually.

---

## SEA — Seat

**SEA-01 — Manage seats** ✅
As an Admin, I want to create, edit, and delete seats bound to a single room, so that each network port is represented as a seat record.
- Seat code equals its port code (`C302-01`).
- Each seat belongs to exactly one room.

**SEA-02 — Derived seat status** ✅
As any user, I want a seat to show as empty or occupied based on its occupant, so that availability is always accurate and never stale.
- Status is computed from `occupantMemberId`, never stored independently (invariant 6).

**SEA-03 — Assign / remove occupant** ✅
As a Manager, I want to assign or remove a seat's occupant, so that I can keep seating accurate as people move.
- Assigning respects invariant 1 (one occupant per seat).
- Removing an occupant triggers primary-device auto-demotion (invariant 8).

**SEA-04 — Tag seat with Group / Project** ✅
As a Manager, I want to tag a seat with a Group or Project label, so that I can organize seating informationally.
- Tags are labels only — no access constraints attached (see GRP).

**SEA-05 — Seat detail view** ✅
As any user, I want to view a seat's full detail (code, room, status, occupant, primary & secondary devices), so that I understand its complete state at a glance.
- Detail reflects live occupant and device data.

---

## DEV — Device

**DEV-01 — Manage devices** ✅
As a device owner (User / Manager / Admin), I want to create, edit, and delete devices (Type, Inventory Number, MAC, Name, owner), so that all physical assets are tracked with a clear owner.
- Each device has exactly one owner.

**DEV-02 — Placement status** ✅
As any user, I want to see whether a device is placed at a seat or sitting in inventory, so that I always know where equipment is.
- A device is either at one seat or unassigned in inventory (invariant 5).

**DEV-03 — Device role at seat** ✅
As a Manager, I want a device placed at a seat to be marked primary or secondary, so that ownership rules at each seat are clear.
- Primary must be owned by the seat's current occupant (invariant 3).
- Secondary may be owned by anyone.

**DEV-04 — Borrow / place a device at another seat** ✅
As a device owner (or a Manager), I want to place my device as a secondary at someone else's seat, so that borrowed equipment is tracked correctly.
- A borrowed device is always secondary, never primary.

**DEV-05 — Move devices** ✅
As a Manager, I want to move a device between seats or back to inventory, so that equipment relocation stays recorded.
- Moving updates placement and role consistently.

**DEV-06 — Auto-demote on occupant exit** ✅
As the system, I want a departing occupant's primary device to auto-demote to secondary, so that invariant 3 is never violated.
- Triggered automatically when the seat's occupant is removed (invariant 8).

---

## MEM — Member

**MEM-01 — Manage members** ✅
As a Manager, I want to create, edit, and delete members (name, employee code, linked account), so that people are represented as records distinct from login accounts.
- A member can be linked to an account.

**MEM-02 — Member overview** ✅
As a Manager, I want to view a member's occupied seats and owned devices, so that I can see a person's full footprint in one place.
- Lists all seats occupied and all devices owned by the member.

---

## GRP — Group / Project

**GRP-01 — Manage groups / projects** ✅
As a Manager, I want to create, edit, and delete groups/projects, so that I can maintain organizational labels.
- Group/Project is an informational label only — no access constraints.

**GRP-02 — Apply group / project tag** ✅
As a Manager, I want to apply a group/project tag to a seat, so that seating can be grouped for reporting and clarity.
- A seat may carry a group/project label without affecting permissions.

---

## LAY — Layout Designer

**LAY-01 — Drag-and-drop layout with persistence** ✅
As an Admin, I want to arrange seats on a drag-and-drop canvas and save their positions, so that the on-screen layout mirrors the real floor plan.
- Seat coordinates persist across sessions.
- Built with grid-snap via dnd-kit.

**LAY-02 — Canvas cell ↔ seat 1:1** ✅
As an Admin, I want each canvas cell to map 1:1 to a seat record, so that the visual layout stays in sync with underlying data.
- Adding a tile auto-generates its port code (ROO-02).

> 🟡 Open decision: simple grid vs. freeform layout with a floor-plan background image.

---

## REG — Registration / Assignment

**REG-01 — Request a seat** 🟡
As a User, I want to submit a request for an empty seat, so that I can claim a seat without needing direct admin action.
- A pending SeatRequest is created for an empty seat.
- 🟡 Open: which room scope a User may request in.

**REG-02 — Approve or assign directly** ✅
As a Manager, I want to approve a seat request or assign a seat directly, so that I control final seating while bypassing the queue when needed.
- Approving assigns the requesting User as occupant.
- Managers/Admins may assign directly without any request (approval flow is User-only).

**REG-03 — Self-release seat / device** 🟡
As a User, I want to release my own seat or remove my own device, so that I can free up resources I no longer need.
- Releasing a seat clears occupancy and triggers device auto-demotion (invariant 8).

---

## DSH — Dashboard & Reporting

**DSH-01 — Overview metrics** ✅
As a Manager, I want an overview of rooms, seats, occupancy rate, and devices placed vs. in inventory, so that I can assess capacity and utilization at a glance.
- Metrics are computed from live database aggregates.

**DSH-02 — Search & filter** ✅
As any user, I want to search and filter across seats, devices, and members, so that I can quickly find the record I need.
- Filters cover the primary entities and return live results.

> 🟡 Open decision: Excel export · audit-log surfacing.

---

## SYS — System / Platform

**SYS-01 — RBAC enforced on API and UI** ✅
As the organization, I want role permissions enforced on both the server and the interface, so that unauthorized actions are impossible, not merely hidden.
- Server mutations reject unauthorized calls.
- UI hides or disables actions the role cannot perform.

**SYS-02 — Business-rule validation** ✅
As the organization, I want all invariants validated server-side, so that invalid states can never be saved.
- Enforces: one occupant per seat, primary device owned by occupant, derived status, auto-demotion, and the rest of the locked invariants.

---

*10 groups · 31 features. Stories tagged 🟡 depend on an open decision noted inline.*