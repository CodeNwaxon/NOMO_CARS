"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AwaitingApproval() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/driver");
    } else if (!loading && profile?.isApproved) {
      router.push("/driver/dashboard");
    }
  }, [user, profile, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-secondary/20 rounded-full blur-3xl animate-pulse-slow"></div>
      
      <div className="glass-panel max-w-lg w-full rounded-3xl p-10 z-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-secondary to-brand-primary"></div>
        
        <div className="w-24 h-24 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <Clock className="w-12 h-12 text-brand-secondary animate-pulse" />
          <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1">
            <CheckCircle className="w-6 h-6 text-brand-primary" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Awaiting Approval</h1>
        <p className="text-foreground/80 mb-6 leading-relaxed">
          Thank you for registering with Nomo Cars, {profile?.firstName}! Our team is currently reviewing your application and documents.
        </p>
        
        <div className="bg-background/50 rounded-xl p-4 mb-8 text-sm text-foreground/70 text-left border border-card-border">
          <p className="font-medium mb-2 text-foreground">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>We verify your identity and documents.</li>
            <li>You will receive an email once approved.</li>
            <li>You can then access your dashboard to add vehicles.</li>
          </ul>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-4 bg-background border border-card-border rounded-xl font-medium hover:bg-card-bg transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
