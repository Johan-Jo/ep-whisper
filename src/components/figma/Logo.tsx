import { Check } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-3 h-10">
      <div className="relative w-10 h-10">
        {/* Main icon container */}
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center shadow-[0px_10px_15px_-3px_rgba(20,71,230,0.2),0px_4px_6px_-4px_rgba(20,71,230,0.2)]">
          <svg
            width="24"
            height="24"
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
        {/* Online indicator */}
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#00bc7d] border-2 border-neutral-950 rounded-full flex items-center justify-center">
          <Check size={10} className="text-neutral-950" strokeWidth={3} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-base font-bold text-neutral-50 leading-none">EP-Whisper</h1>
        <p className="text-[11px] text-[#a1a1a1] leading-none">Röstdriven offertassistent</p>
      </div>
    </div>
  );
}

