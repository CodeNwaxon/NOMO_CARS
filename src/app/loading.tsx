import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsating ring */}
        <div className="absolute inset-0 w-24 h-24 bg-brand-primary/20 rounded-full animate-ping"></div>
        
        {/* Inner static container */}
        <div className="relative w-16 h-16 bg-card-bg border border-card-border shadow-xl rounded-2xl flex items-center justify-center z-10 animate-in zoom-in duration-300">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      </div>
      
      <div className="mt-8 text-center animate-pulse">
        <h2 className="text-lg font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
          Loading...
        </h2>
        <p className="text-xs text-foreground/50 mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}
