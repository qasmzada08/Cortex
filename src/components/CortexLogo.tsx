interface CortexLogoProps {
  className?: string;
}

export function CortexLogo({ className = 'w-7 h-7' }: CortexLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cortex-c-grad" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22F7FF" />
          <stop offset="40%" stopColor="#3B82F6" />
          <stop offset="72%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#F048FF" />
        </linearGradient>
        <linearGradient id="cortex-c-accent" x1="16" y1="52" x2="54" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="55%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#22F7FF" />
        </linearGradient>
      </defs>

      <path
        d="M47 12H32C19.6 12 12 20.6 12 32C12 43.4 19.6 52 32 52H47V42.5H33C26.2 42.5 21.8 38.2 21.8 32C21.8 25.8 26.2 21.5 33 21.5H47V12Z"
        stroke="url(#cortex-c-grad)"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />

      <path
        d="M36 21.5H52V30H39.5C36 30 33.6 27.8 32 25"
        stroke="url(#cortex-c-accent)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 42.5H52V34H39.5C36 34 33.6 36.2 32 39"
        stroke="url(#cortex-c-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M15 23C21 20 26.5 24 24.5 31.5C22.8 38 27.5 42.5 35 42.8"
        stroke="url(#cortex-c-accent)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M15 41C19.8 42.5 25.5 38.2 25.5 31C25.5 24 30 19.5 38.5 16"
        stroke="url(#cortex-c-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
