interface LoadingIndicatorProps {
  label?: string;
  compact?: boolean;
}

export function LoadingIndicator({
  label = 'Đang tải…',
  compact = false,
}: LoadingIndicatorProps) {
  return (
    <span className={`loading-indicator ${compact ? 'compact' : ''}`}>
      <svg
        className="loading-spinner"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="spinner-track"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          className="spinner-head"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="18 42"
          strokeLinecap="round"
        />
      </svg>
      <span className="loading-text" role="status" aria-live="polite">
        {label}
      </span>
    </span>
  );
}
