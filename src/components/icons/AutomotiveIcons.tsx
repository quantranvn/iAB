/**
 * Standard Automotive Light Icons
 */

export function TurnSignalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function LowBeamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8V3" />
      <path d="M16 12h5" />
      <path d="M12 16v5" />
      <path d="M8 12H3" />
    </svg>
  );
}

export function HighBeamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v3" />
      <path d="m20.3 7.7-2.1 2.1" />
      <path d="M22 12h-3" />
      <path d="m20.3 16.3-2.1-2.1" />
      <path d="M12 19v3" />
      <path d="m7.7 16.3-2.1 2.1" />
      <path d="M5 12H2" />
      <path d="m7.7 7.7-2.1-2.1" />
    </svg>
  );
}

export function BrakeLightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6" />
      <path d="M12 16v.01" />
    </svg>
  );
}
