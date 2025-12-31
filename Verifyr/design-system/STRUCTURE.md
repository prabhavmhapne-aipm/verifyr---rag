# Design System Folder Structure

Complete file structure of the Verifyr Design System.

```
design-system/
│
├── README.md                    # Main design system documentation
├── DESIGN-TOKENS.md            # Quick reference for all design tokens
├── STRUCTURE.md                 # This file - folder structure overview
├── design-system.css            # Master import file (imports all CSS)
├── base.css                     # Base reset and global styles
│
├── tokens/                      # Design Tokens
│   ├── colors.css               # Color palette and variables
│   ├── typography.css           # Font families, sizes, weights
│   ├── spacing.css              # Spacing scale and utilities
│   ├── shadows.css              # Box shadow definitions
│   └── borders.css              # Border radius and border styles
│
├── components/                  # Component Styles
│   ├── buttons.css              # Button styles and variants
│   ├── cards.css                # Card components
│   ├── navigation.css           # Navigation and header styles
│   ├── forms.css                # Form inputs and elements
│   ├── modals.css               # Modal dialogs
│   └── sections.css             # Section layouts (hero, trust, etc.)
│
├── animations/                   # Animations
│   ├── keyframes.css            # Animation keyframes
│   └── transitions.css          # Transition definitions
│
└── layout/                      # Layout System
    ├── grid.css                 # Grid system
    ├── containers.css           # Container and max-width definitions
    └── responsive.css            # Breakpoints and responsive utilities
```

## File Count

- **Total Files**: 18
- **Token Files**: 5
- **Component Files**: 6
- **Animation Files**: 2
- **Layout Files**: 3
- **Documentation Files**: 4

## Import Order

When using the design system, import files in this order:

1. **Tokens** (colors, typography, spacing, shadows, borders)
2. **Animations** (keyframes, transitions)
3. **Base** (reset and global styles)
4. **Layout** (grid, containers, responsive)
5. **Components** (buttons, cards, navigation, forms, modals, sections)

Or simply use the master file:
```html
<link rel="stylesheet" href="design-system/design-system.css">
```

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Import the entire design system -->
    <link rel="stylesheet" href="design-system/design-system.css">
</head>
<body>
    <!-- Your HTML using design system classes -->
</body>
</html>
```

## Maintenance

- Update tokens in `tokens/` folder
- Update components in `components/` folder
- Add new animations in `animations/` folder
- Update responsive breakpoints in `layout/responsive.css`
- Keep documentation files updated

