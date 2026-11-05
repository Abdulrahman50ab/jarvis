# Settings UI Controls (`website/src/components/settings/controls.tsx`)

## Toggle Switch Architecture
- **Track**: `h-6 w-11 rounded-full p-0.5` (24px height, 44px width, 2px padding on all sides).
- **Background States**:
  - Inactive: `bg-[var(--toggle-off)]`
  - Active: `bg-[var(--accent)]`
- **Thumb Knob**: `h-5 w-5 rounded-full bg-white shadow-sm ring-0` (20px by 20px).
- **Travel / Transformation**:
  - Inactive (`false`): `translate-x-0` (left 2px padding, 20px remaining on right).
  - Active (`true`): `translate-x-5` (20px translate, leaving exactly 2px padding on right).
- **Micro-Interactions**:
  - Touch feedback: `active:scale-95`
  - Keyboard navigation: `focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2`

## Settings Modal Navigation Scrollability
- **Sidebar Container**: `md:min-h-0 md:flex md:flex-col`
- **Navigation Area**: `min-h-0 flex-1 space-y-1 overflow-y-auto pr-1`
- **Ensured Visibility**: All 9 sections (Connections, Model, Voice, Chat, Appearance, Privacy, Shortcuts, Advanced, About) are smoothly accessible across all viewport sizes, with zero truncation.
- **Content Area**: `min-h-0 flex-1 overflow-y-auto pb-8` ensures trailing cards and sliders have adequate breathing room before the modal footer.
