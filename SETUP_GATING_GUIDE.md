# 📦 Backend-Persisted Setup Gating Guide

This guide explains how the project setup gating system works with backend persistence and how to add new mandatory components in the future.

## 🚀 How it Works (Architecture)

The gating status is no longer just "in-memory." It is now a first-class citizen in the project's data.

1.  **Backend Storage**: The gating status for each mandatory item is stored in the `ProjectSettings` record in the database under the field `mandatorySetupStatuses`.
2.  **State Recovery**: When a project is loaded via `ProjectService.loadProject(id)`, the `uiStore` is automatically synchronized with these backend settings.
3.  **Automatic Unlocking**: Once all items in the backend settings are marked as `visited`, the project globally unlocks and restores full access to map tools.

---

## 🛠️ How to Add a New Mandatory Panel

If you need to add a new menu item that the user MUST visit/save before they can use the map, follow these **four steps**:

### Step 1: Register in the Menu Configuration
Find your item in `src/constants/workbenchMenu.ts` and set `isMandatory: true`.

```typescript
// src/constants/workbenchMenu.ts
{
  id: "your_new_panel_id",
  label: "New Safety Check",
  type: "ITEM",
  isMandatory: true // <--- Trigger indicators & gating
}
```

### Step 2: Initialize for New Projects
To ensure new projects start with this item as "Pending" (Red Dot), update the `initialStatuses` map in `ProjectService.ts`.

```typescript
// src/lib/services/ProjectService.ts
static async createProjectFromSettings(...) {
    const initialStatuses = {
        'set_proj': 'pending',
        'set_attr': 'pending',
        'itm_terrain': 'pending',
        'your_new_panel_id': 'pending' // <--- ADD THIS LINE
    };
    // ...
}
```

### Step 3: Implement Completion Logic in the Panel
In the component for your new panel, you must update the settings and the local UI state when the user performs the required action (usually clicking "Save").

```tsx
// YourNewPanel.tsx
import { useParams } from "next/navigation";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { ProjectService } from "@/lib/services/ProjectService";

export function YourNewPanel() {
  const params = useParams();
  const { settings, updateSettings } = useNetworkStore();
  const { setMenuStatus } = useUIStore();

  const handleSave = () => {
    // 1. Mark status as visited
    const updatedStatuses = { 
      ...(settings.mandatorySetupStatuses || {}), 
      "your_new_panel_id": "visited" 
    };

    // 2. Persist to network store
    updateSettings({ mandatorySetupStatuses: updatedStatuses });

    // 3. UI Status Sync
    setMenuStatus("your_new_panel_id", "visited");

    // 4. Force Save to Backend (Permanent)
    ProjectService.saveCurrentProject(params.id as string);
  };
}
```

---

## 🏗️ Technical File Locations

- **Interface Definition**: `src/types/network.ts` (See `mandatorySetupStatuses` in `ProjectSettings`).
- **Menu Structure**: `src/constants/workbenchMenu.ts`.
- **Gating Logic**: `src/store/uiStore.ts` (Functions: `isProjectInitialized`, `syncMenuStatusFromSettings`).
- **Data Loading/Sync**: `src/lib/services/ProjectService.ts` (Function: `loadProject`).

## 🎨 Visual States Reference

| State | Indicator | Database Value | UI Impact |
| :--- | :--- | :--- | :--- |
| **Pending** | 🔴 Pulsing Red | `"pending"` | Locks Map Toolbar |
| **Visited** | 🟢 Solid Green | `"visited"` | Contributes to unlocking |
| **None** | (Hidden) | `undefined` | Treated as "Completed" (Legacy support) |

> [!TIP]
> **Pro-Tip**: If you ever want to reset a project for testing, you can manually update the `mandatorySetupStatuses` to an empty object `{}` in your local storage or DB, and it will default back to an "Unlocked" (Legacy) state.
