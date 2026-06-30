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
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl",
        "border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4",
        "max-w-md w-full",
        status === "loading" && "bg-slate-900/90 border-white/10 text-slate-200",
        status === "success" && "bg-emerald-950/90 border-emerald-500/30 text-emerald-300",
        status === "error" && "bg-red-950/90 border-red-500/30 text-red-300"
      )}
    >
      {status === "loading" && (
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
      )}
      {status === "success" && (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      )}
      {status === "error" && (
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <span className="text-sm flex-1">{message}</span>
      {onDismiss && status !== "loading" && (
        <button
          onClick={onDismiss}
          className="text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
