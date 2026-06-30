import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType = "idle" | "loading" | "success" | "error";

interface StatusBarProps {
  status: StatusType;
  message: string;
  onDismiss?: () => void;
}

export function StatusBar({ status, message, onDismiss }: StatusBarProps) {
  if (status === "idle") return null;

  return (
    <div
      style={{ left: "50%", transform: "translateX(-50%)" }}
      className={cn(
        "fixed bottom-6 z-50",
        "flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl",
        "border transition-all duration-300 animate-in slide-in-from-bottom-4",
        "max-w-md w-[calc(100%-32px)] sm:w-full",
        status === "loading" && "bg-indigo-600 border-indigo-500 text-white shadow-[0_4px_25px_rgba(99,102,241,0.3)]",
        status === "success" && "bg-emerald-600 border-emerald-500 text-white shadow-[0_4px_25px_rgba(16,185,129,0.3)]",
        status === "error" && "bg-rose-600 border-rose-500 text-white shadow-[0_4px_25px_rgba(244,63,94,0.3)]"
      )}
    >
      {status === "loading" && (
        <Loader2 className="h-4.5 w-4.5 animate-spin text-white shrink-0" />
      )}
      {status === "success" && (
        <CheckCircle2 className="h-4.5 w-4.5 text-white shrink-0" />
      )}
      {status === "error" && (
        <AlertCircle className="h-4.5 w-4.5 text-white shrink-0" />
      )}
      <span className="text-xs sm:text-sm flex-1 break-all break-words font-semibold leading-normal">{message}</span>
      {onDismiss && status !== "loading" && (
        <button
          onClick={onDismiss}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
