import * as React from "react";
import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "mark" | "full";
  size?: number; // pixel size for the mark square
  className?: string;
  labelClassName?: string;
  showTrademark?: boolean;
};

const Mark: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className,
}) => {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ll-grad-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="ll-grad-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.25"
          />
        </filter>
      </defs>

      <rect
        x="0"
        y="0"
        width="40"
        height="40"
        rx="10"
        ry="10"
        fill="url(#ll-grad-a)"
        opacity="0.08"
      />

      <g filter="url(#soft-shadow)">
        <rect
          x="5"
          y="14"
          width="18"
          height="10"
          rx="5"
          ry="5"
          transform="rotate(-25 14 19)"
          fill="none"
          stroke="url(#ll-grad-a)"
          strokeWidth="2.5"
        />
        <rect
          x="17"
          y="14"
          width="18"
          height="10"
          rx="5"
          ry="5"
          transform="rotate(25 26 19)"
          fill="none"
          stroke="url(#ll-grad-b)"
          strokeWidth="2.5"
        />
        <path
          d="M14 26 C18 28, 22 28, 26 26"
          stroke="#06b6d4"
          strokeOpacity="0.6"
          strokeWidth="2"
          fill="none"
        />
      </g>

      <circle cx="20" cy="8.5" r="1.5" fill="#22d3ee" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  variant = "full",
  size = 28,
  className,
  labelClassName,
  showTrademark = false,
}) => {
  if (variant === "mark") {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <Mark size={size} />
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Line-Link"
    >
      <Mark size={size} />
      <span
        className={cn("font-bold tracking-tight text-white", labelClassName)}
      >
        Line-
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          Link
        </span>
        {showTrademark && (
          <sup className="ml-0.5 text-[10px] text-slate-400 align-top">™</sup>
        )}
      </span>
    </div>
  );
};

export const LogoMark = Mark;
