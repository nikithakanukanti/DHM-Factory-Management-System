# DHM Pyrotech Enterprises — Factory Management System
## Client Handover & Operational Manual

---

### 1. Executive Summary
The **DHM Factory Management System** is a dedicated industrial operations and digital weighbridge application designed for **DHM Pyrotech Enterprises**. It digitizes vehicle weighbridge logs, inward raw material tracking, outward product dispatches, reactor batch operations, and administrative reporting.

---

### 2. Core Workflow & Operations Architecture

```
[Gate / Weighbridge]
       │
       ▼
[Vehicle Register] ────► [Movement Type]
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [Sales Register]              [Purchase Register]
   (Finished Goods Outward)        (Raw Material Inward)
   - Fuel Oil                      - Waste Rubber Tyres
   - Carbon Black Powder           - Metal Steel Scrap
   - Metal Steel Scrap             - Gross, Tare & Net KG
   - Gross, Tare & Net KG
               │                             │
               └──────────────┬──────────────┘
                              ▼
                     [Operations Dashboard]
                     - Daily Live Vehicle Count
                     - Real-Time Dispatched / Inward Tonnage
                     - Batch Operating Logs
                              │
                              ▼
                     [Executive Reports]
                     - Date-Filtered Excel (.xlsx)
                     - Date-Filtered PDF (.pdf)
```

#### Step 1: Vehicle Gate Entry (Weighbridge)
- Every truck entering the plant is logged in **Vehicle Register**.
- Operator inputs: **Date**, **Vehicle Number**, **Gross Weight**, **Tare Weight**, **Commodity**, and **Target Register**:
  - Selecting **Sales Register** automatically records and synchronizes an outward finished goods dispatch.
  - Selecting **Purchase Register** automatically records and synchronizes an inward raw material receipt.
- **Automatic Master-Sync**: Any subsequent updates or deletions in Vehicle Register stay synchronized with the respective Sales or Purchase record.

#### Step 2: Sales Register (Dispatch Outward)
- Tracks dispatches of finished goods: Fuel Oil, Carbon Black Powder, and Metal Scrap.
- Calculates exact net weight (Gross Weight − Tare Weight) and exports in daily summaries.

#### Step 3: Purchase Register (Raw Material Inward)
- Tracks inward consignments: Local and Imported Waste Rubber Tyres.
- Captures truck number, gross weight, tare weight, and net weight received.

#### Step 4: Reactor Timing (Plant Operations)
- Pyrolysis batch monitoring for **Reactor 1** and **Reactor 2**.
- Records daily operating and burning start times for quality and production tracking.

#### Step 5: Dashboard & Reporting
- Executive dashboard showing today's weighbridge throughput, total tonnage received/dispatched, and live plant status.
- **Filtered Exports**: Export official audit reports to Excel or PDF with custom **From Date** and **To Date** filters.

---

### 3. User Roles & Security

| Role | Access Level | Permissions |
| :--- | :--- | :--- |
| **Administrator** | Full Access | Complete access to Dashboard, Vehicle Register, Sales Register, Purchase Register, Reactor Timing, Date-Filtered Reports, and User Management. Can modify historical records and add/remove staff accounts. |
| **Supervisor** | Shift Operations | Daily gate entry, sales/purchase logging, and reactor timing. Can edit or delete current-day shift records (calculated in Indian Standard Time `Asia/Kolkata`). Restricted from administrative reports and user management. |

#### Default Credentials:
- **Admin**: `admin` / `Admin@123`
- **Supervisor**: `supervisor` / `Supervisor@123`
*(Passwords can be customized or new staff accounts created in the Users module).*

---

### 4. Technical Configuration & Deployment

#### Frontend (Vercel)
- **Framework**: React 19 + Vite + React Router v7
- **Environment Variable**: `VITE_API_URL=https://dhm-backend.onrender.com`
- **Authentication**: Dual-layer security (Bearer token header fallback + cross-site credentials) ensuring seamless access without browser third-party cookie dropouts.

#### Backend (Render)
- **Framework**: Spring Boot 3.2.4 (Java 17)
- **Database**: Managed MySQL (`dhm_db`)
- **Port**: Automatic port assignment via `${PORT:-8090}`
- **Timezone**: Indian Standard Time (`Asia/Kolkata`) configured for accurate factory shift management.

---

### 5. Client Verification Checklist
- [x] Login with Admin and Supervisor demo accounts.
- [x] Register an arriving vehicle at weighbridge with Gross & Tare weights.
- [x] Verify automatic synchronization into Sales or Purchase Register.
- [x] Edit a vehicle entry and verify the linked record reflects updates.
- [x] Log a batch timing in Reactor Timing.
- [x] Download date-filtered Excel and PDF reports from the Reports module.
- [x] Create a new Supervisor account in User Management.
