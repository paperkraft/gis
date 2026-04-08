# Project Setup Gating System

This system ensures that users complete mandatory project configuration (Project Settings, Default Attributes, Terrain, etc.) before they can access drawing tools and advanced map controls.

## 🚀 Overview

The gating system uses a configuration-driven approach to:
1.  **Guidance**: Indicators (dots) show users exactly which menus require attention.
2.  **Enforcement**: Disables map toolbars and side-controls until mandatory setup steps are "Saved" or "Selected".
3.  **Backward Compatibility**: Automatically detects existing projects (or sessions) where status is missing and allows full access to ensure no disruption for older projects.

---

## 🛠️ Configuration Guide

### 1. Register a Mandatory Menu Item
New mandatory items are defined in `src/data/workbenchMenu.ts`. Add the `isMandatory: true` property to any `ITEM`.

```typescript
// src/data/workbenchMenu.ts
{
  id: "your_item_id",
  type: "ITEM",
  label: "My New Setting",
  modalType: "YOUR_MODAL",
  isMandatory: true // <--- Add this
}
```

### 2. Trigger Completion (State Change)
A "pending" item (pulsing red) only turns "completed" (solid green) when an explicit action is taken in its respective panel (e.g., clicking a "Save" button).

In your component/panel:
1.  Import `useUIStore`.
2.  Call `setMenuStatus("item_id", "visited")`.

```tsx
// Example Panel
import { useUIStore } from "@/store/uiStore";

export function YourPanel() {
  const { setMenuStatus } = useUIStore();

  const handleSave = () => {
    // 1. Perform your data saving logic...
    
    // 2. Mark the menu item as completed
    setMenuStatus("your_item_id", "visited");
    
    toast.success("Settings Saved!");
  };
}
```

---

## 🏗️ Technical Architecture

### State Management (`uiStore.ts`)
- **`menuStatus`**: A dictionary tracking item IDs to their state (`pending`, `visited`, or `none`).
- **`initializeNewProjectMenuStatus`**: Automatically scans the menu configuration for `isMandatory` items and resets them to `pending`. This is called during project creation.
- **`isProjectInitialized`**: A derived selector that checks if any `pending` items exist.
    - If **no items** are `pending` (empty or all visited) -> **Unlocked**.
    - If **any item** is `pending` -> **Locked**.

### UI Gating
The gating is applied in the following components:
- **Map Toolbar**: `src/components/map/MapToolbar.tsx`
- **Map Controls**: `src/components/map/MapControls.tsx`

These components check `isProjectInitialized`. If `false`, they pass a `disabled` prop to the controls, which desaturates the UI and adds a **"(Setup Required)"** tooltip.

---

## 🎨 Visual States

| State | Visual | Meaning |
| :--- | :--- | :--- |
| **Pending** | `pulsing red dot` | Mandatory item that hasn't been configured yet. |
| **Visited** | `solid green dot` | Completion action (Save/Select) has been performed. |
| **Section** | `aggregated dot` | Section headers (e.g. "NETWORKS") stay red until **all** mandatory children are green. |

---

## ⚠️ Important Notes
- **Persistence**: Status is currently stored in memory (transient). Reloading the project defaults to an **unlocked** state for session safety.
- **Legacy Support**: Projects that do not trigger the `initializeNewProjectMenuStatus` (existing projects) will have an empty `menuStatus` and will be **unlocked by default**.
