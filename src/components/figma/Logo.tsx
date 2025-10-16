export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center shadow-lg">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary-foreground"
          >
            <path
              d="M12 3L4 7V11C4 16.55 7.84 21.54 13 23C18.16 21.54 22 16.55 22 11V7L12 3Z"
              fill="currentColor"
              fillOpacity="0.2"
            />
            <path
              d="M12 3L4 7V11C4 16.55 7.84 21.54 13 23C18.16 21.54 22 16.55 22 11V7L12 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-lg font-bold text-foreground leading-none">EP-Whisper</h1>
        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Röstdriven offertassistent</p>
      </div>
    </div>
  );
}

