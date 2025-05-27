// Theme Colors
export const themeColors = {
  dark: {
    primary: 'bg-[#ffa300]',
    secondary: 'bg-[#1e1b1b]',
    background: 'bg-[#1e1b1b]',
    pageBackground: 'bg-[#1e1b1b]',
    cardBackground: 'bg-[#ffa300]',
    surface: 'bg-[#181818]',
    text: 'text-[white]',
    textHeader: 'text-[#7b3205]',
    textWhite: 'text-white',
    border: 'border-white',
  },
  light: {
    primary: 'bg-[#ffa300]',
    secondary: 'bg-gray-100',
    background: 'bg-stone-100',
    pageBackground: 'bg-stone-100',
    cardBackground: 'bg-[#ffa300]',
    surface: 'bg-gray-100',
    text: 'text-amber-900',
    textHeader: 'text-amber-900',
    textWhite: 'text-white',
    border: 'border-amber-900',
  },
} as const;

// Status Colors
export const statusColors = {
  role: {
    admin: 'bg-blue-600',
    user: 'bg-green-600',
    softwareOwner: 'bg-purple-600',
  },
  appointment: {
    scheduled: 'bg-blue-600',
    inProgress: 'bg-green-600',
    completed: 'bg-gray-600',
    cancelled: 'bg-red-600',
  },
  stall: {
    available: 'bg-green-600',
    inUse: 'bg-blue-500',
    needsCleaning: 'bg-red-500',
    refreshing: 'bg-yellow-500',
    outOfOrder: 'bg-gray-500',
  },
} as const;

// Service Type Colors
export const serviceColors = {
  shower: 'text-blue-500',
  laundry: 'text-green-500',
  haircut: 'text-purple-500',
} as const;

// UI Element Colors
export const uiColors = {
  button: {
    primary: {
      dark: 'bg-[#3e2802] text-[#ffa300]',
      light: 'bg-[#3e2802] text-[#ffa300]',
    },
    secondary: {
      dark: 'bg-[#1e1b1b] text-[#ffa300]',
      light: 'bg-[#ffa300] text-amber-900',
    },
  },
  hover: {
    button: {
      dark: 'hover:bg-[#291c00]',
      light: 'hover:bg-[#ffe0b2]',
    },
    form: {
      dark: 'hover:bg-[#2a1c01]',
      light: 'hover:bg-[#ffe0b2]',
    },
    table: {
      dark: 'hover:bg-[#2a1c01]',
      light: 'hover:bg-[#ffe0b2]',
    },
  },
  form: {
    input: {
      background: {
        dark: 'bg-[#1e1b1b]',
        light: 'bg-white',
      },
      text: {
        dark: 'text-[#ffa300]',
        light: 'text-amber-900',
      },
      border: {
        dark: 'border-white',
        light: 'border-amber-900',
      },
    },
  },
  table: {
    header: {
      background: {
        dark: 'bg-[#3e2802]',
        light: 'bg-orange-500',
      },
      text: {
        dark: 'text-[#ffa300]',
        light: 'text-amber-900',
      },
    },
    row: {
      background: {
        dark: 'bg-[#1e1b1b]',
        light: 'bg-white',
      },
      hover: 'hover:bg-[#2a1c01]',
    },
    divider: {
      dark: 'divide-[#3e2802]',
      light: 'divide-orange-500',
    },
  },
  modal: {
    background: {
      dark: 'bg-[#3e2802]',
      light: 'bg-orange-500',
    },
    text: {
      dark: 'text-[#ffa300]',
      light: 'text-amber-900',
    },
    overlay: 'bg-black bg-opacity-50',
  },
} as const;

// Helper function to get theme-aware color
export const getThemeColor = (theme: 'dark' | 'light', colorType: keyof typeof themeColors.dark) => {
  return themeColors[theme][colorType];
};

// Helper function to get status color
export const getStatusColor = (type: 'role' | 'appointment' | 'stall', status: string) => {
  return statusColors[type][status as keyof typeof statusColors[typeof type]];
};

// Helper function to get service color
export const getServiceColor = (service: keyof typeof serviceColors) => {
  return serviceColors[service];
};

// Helper function to get UI color
export const getUIColor = (
  element: keyof typeof uiColors,
  variant: string,
  theme?: 'dark' | 'light',
  property?: 'background' | 'text' | 'border'
) => {
  if (element === 'hover') {
    const hoverColors = uiColors.hover[variant as keyof typeof uiColors.hover];
    if (typeof hoverColors === 'string') return hoverColors;
    if (theme && typeof hoverColors === 'object' && 'dark' in hoverColors && 'light' in hoverColors) {
      return hoverColors[theme];
    }
    return '';
  }

  const elementColors = uiColors[element];
  if (!elementColors) return '';

  const variantColors = elementColors[variant as keyof typeof elementColors];
  if (!variantColors) return '';

  // Special handling for form input properties
  if (element === 'form' && typeof variantColors === 'object' && property && theme) {
    const propColors = variantColors[property];
    if (propColors && typeof propColors === 'object') {
      return propColors[theme];
    }
  }

  if (typeof variantColors === 'string') return variantColors;
  if (theme && 'dark' in variantColors && 'light' in variantColors) {
    return variantColors[theme];
  }

  return '';
}; 