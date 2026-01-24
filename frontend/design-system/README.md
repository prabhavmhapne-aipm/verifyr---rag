# Verifyr Design System

This folder contains all design components, elements, styling, fonts, colors, and standards for the Verifyr website.

## Folder Structure

```
design-system/
├── README.md                 # This file - Design system overview
├── tokens/
│   ├── colors.css           # Color palette and variables
│   ├── typography.css        # Font families, sizes, weights
│   ├── spacing.css           # Spacing scale and margins/padding
│   ├── shadows.css           # Box shadow definitions
│   └── borders.css           # Border radius and border styles
├── components/
│   ├── buttons.css           # Button styles and variants
│   ├── cards.css             # Card components
│   ├── navigation.css        # Navigation and header styles
│   ├── forms.css             # Form inputs and elements
│   ├── modals.css            # Modal dialogs
│   └── sections.css         # Section layouts (hero, trust, etc.)
├── animations/
│   ├── keyframes.css         # Animation keyframes
│   └── transitions.css       # Transition definitions
└── layout/
    ├── grid.css              # Grid system
    ├── containers.css         # Container and max-width definitions
    └── responsive.css        # Breakpoints and responsive utilities
```

## Design Principles

### Colors
- **Primary Blue**: #3B82F6 - Main brand color
- **Dark Blue**: #1E40AF - Darker variant for hover states
- **Light Blue**: #DBEAFE - Background accents
- **Accent**: #60A5FA - Secondary accent color
- **Dark**: #0F172A - Primary text color
- **Gray**: #64748B - Secondary text color
- **Light Gray**: #F1F5F9 - Backgrounds and subtle elements
- **White**: #FFFFFF - Base background

### Typography
- **Primary Font**: DM Sans (400, 500, 700)
- **Display Font**: Sora (600, 700, 800)
- **Base Line Height**: 1.6
- **Letter Spacing**: -0.02em to -0.03em for headings

### Spacing Scale
- Uses rem units for consistency
- Common values: 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4rem, 8rem

### Border Radius
- Small: 12px (buttons, small elements)
- Medium: 16px (cards, inputs)
- Large: 24px (sections, large cards)
- Full: 50px (pill-shaped elements)

### Shadows
- Subtle: 0 2px 12px rgba(0, 0, 0, 0.04)
- Medium: 0 4px 12px rgba(0, 0, 0, 0.08)
- Elevated: 0 8px 24px rgba(0, 0, 0, 0.08)
- Colored: 0 4px 12px rgba(59, 130, 246, 0.2)

### Breakpoints
- Mobile: max-width 768px
- Tablet: 769px - 1024px
- Desktop: 1025px+

## Usage

To use the design system in your HTML file, import the CSS files in this order:

```html
<link rel="stylesheet" href="design-system/tokens/colors.css">
<link rel="stylesheet" href="design-system/tokens/typography.css">
<link rel="stylesheet" href="design-system/tokens/spacing.css">
<link rel="stylesheet" href="design-system/tokens/shadows.css">
<link rel="stylesheet" href="design-system/tokens/borders.css">
<link rel="stylesheet" href="design-system/components/buttons.css">
<!-- ... other component files ... -->
```

## Maintenance

When updating design elements:
1. Update the relevant token file (colors, typography, etc.)
2. Update component files that use those tokens
3. Update this README if design principles change
4. Test across all breakpoints

