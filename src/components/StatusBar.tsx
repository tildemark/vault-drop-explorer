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
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl",
        "border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4",
        "max-w-md w-full",
        status === "loading" && "bg-slate-900/95 border-white/10 text-slate-200 shadow-indigo-500/5",
        status === "success" && "bg-slate-900/95 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]",
        status === "error" && "bg-slate-900/95 border-red-500/30 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
      )}
    >
      {status === "loading" && (
        <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-400 shrink-0" />
      )}
      {status === "success" && (
        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
      )}
      {status === "error" && (
        <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
      )}
      <span className="text-xs sm:text-sm flex-1 break-all break-words font-medium leading-none">{message}</span>
      {onDismiss && status !== "loading" && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
