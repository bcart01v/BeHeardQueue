# BeHeard Queue Color System

## Theme Colors

### Dark Theme (from Stalls component)
- Primary: `#ffa300` (Orange)
- Secondary: `#3e2802` (Dark Brown)
- Background: `#1e1b1b` (Very Dark Gray)
- Surface: `#181818` (Almost Black)
- Text: `#ffa300` (Orange) and `#fff` (White)
- Border: `#fff` (White)

### Light Theme
- Primary: `bg-stone-100`
- Secondary: `bg-orange-500`
- Background: `bg-stone-100`
- Surface: `bg-gray-100`
- Text: `text-amber-900`

## Status Colors

### Role Badges
- Admin: `bg-blue-600` (Blue)
- User: `bg-green-600` (Green)
- Software Owner: `bg-purple-600` (Purple)

### Appointment Status
- Scheduled: `bg-blue-600` (Blue)
- In Progress: `bg-green-600` (Green)
- Completed: `bg-gray-600` (Gray)
- Cancelled: `bg-red-600` (Red)

### Stall Status
- Available: `bg-green-600` (Green)
- In Use: `bg-blue-500` (Blue)
- Needs Cleaning: `bg-red-500` (Red)
- Refreshing: `bg-yellow-500` (Yellow)
- Out of Order: `bg-gray-500` (Gray)

## Service Type Icons
- Shower: `text-blue-500` (Blue)
- Laundry: `text-green-500` (Green)
- Haircut: `text-purple-500` (Purple)

## UI Elements

### Buttons
- Primary Button (Dark): `bg-[#3e2802] text-[#ffa300]`
- Primary Button (Light): `bg-[#ffa300] text-[#3e2802]`
- Secondary Button (Dark): `bg-[#1e1b1b] text-[#ffa300]`
- Secondary Button (Light): `bg-[#f3f4f6] text-[#3e2802]`
- Hover State: `hover:bg-[#2a1c01]`

### Form Elements
- Input Background (Dark): `bg-[#1e1b1b]`
- Input Background (Light): `bg-white`
- Input Text (Dark): `text-[#ffa300]`
- Input Text (Light): `text-[#3e2802]`
- Border (Dark): `border-[#ffa300]`
- Border (Light): `border-[#3e2802]`

### Tables
- Header Background (Dark): `bg-[#3e2802]`
- Header Background (Light): `bg-[#ffa300]`
- Header Text (Dark): `text-[#ffa300]`
- Header Text (Light): `text-[#3e2802]`
- Row Background (Dark): `bg-[#1e1b1b]`
- Row Background (Light): `bg-white`
- Row Hover: `hover:bg-[#2a1c01]`
- Divider (Dark): `divide-[#3e2802]`
- Divider (Light): `divide-[#ffa300]`

### Modals
- Modal Background (Dark): `bg-[#3e2802]`
- Modal Background (Light): `bg-[#ffa300]`
- Modal Text (Dark): `text-[#ffa300]`
- Modal Text (Light): `text-[#3e2802]`
- Overlay: `bg-black bg-opacity-50`

## Notes
- All status colors (role badges, appointment status, stall status) remain constant regardless of theme
- Service type icon colors remain constant regardless of theme
- The color system follows a consistent pattern where dark theme uses orange (`#ffa300`) as primary and dark brown (`#3e2802`) as secondary, while light theme inverts these colors
- Hover states typically use a darker shade of the current color (`#2a1c01`)
- Background colors use a darker shade (`#1e1b1b`) for dark theme and white for light theme
- These dark mode values are now based on the Stalls component for maximum consistency
- Status colors and UI element colors are also taken directly from the Stalls component
- Update your color helpers and Tailwind config to match these values for a unified look 