/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Starbucks Brand Colors
        'sb-green': '#006241',
        'sb-accent': '#00754A',
        'sb-house': '#1E3932',
        'sb-uplift': '#2b5148',
        'sb-light': '#d4e9e2',
        'sb-cream': '#f2f0eb',
        'sb-ceramic': '#edebe9',
        'sb-gold': '#cba258',
        'sb-gold-light': '#dfc49d',
        'sb-gold-lightest': '#faf6ee',
        'sb-text': 'rgba(0, 0, 0, 0.87)',
        'sb-text-soft': 'rgba(0, 0, 0, 0.58)',
        'sb-white-soft': 'rgba(255, 255, 255, 0.70)',
        
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      letterSpacing: {
        'tightest': '-0.01em',
        'sb-normal': '-0.16px',
      },
      borderRadius: {
        'sb-pill': '50px',
        'sb-card': '12px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'sb-card': '0px 0px .5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)',
        'sb-nav': '0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)',
        'sb-frap': '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)',
      },
      transitionTimingFunction: {
        'sb-spring': 'cubic-bezier(0.32, 2.32, 0.61, 0.27)',
      }
    },
  },
  plugins: [],
};
