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
      router.push("/");
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
    <div className="max-h-screen pt-12 md:pt-8 flex justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-secondary/20 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="glass-panel max-w-lg w-full rounded-3xl p-4 md:p-10 z-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-secondary to-brand-primary"></div>

        <div className="md:w-24 md:h-24 w-16 h-16 bg-brand-secondary/5 border-2 border-brand-secondary/30 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          {/* Orbiting ball */}
          <div className="absolute inset-0 rounded-full animate-[spin_3s_linear_infinite]">
            <div className="w-2.5 h-2.5 bg-brand-secondary rounded-full absolute -top-1 left-1/2 -translate-x-1/2 shadow-lg shadow-brand-secondary/60"></div>
          </div>

          <Clock className="w-10 h-10 text-brand-secondary animate-pulse relative z-10" />
          <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 z-20">
            <CheckCircle className="w-6 h-6 text-brand-primary" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Awaiting Approval</h1>
        <p className="text-xs md:text-sm text-foreground/80 mb-6 leading-relaxed">
          Thank you for registering with Nomo Cars, {profile?.firstName}! Our team is currently reviewing your application and documents.
        </p>

        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 md:p-4 mb-4 md:mb-6 text-sm text-foreground/80 text-left shadow-inner">
          <p className="font-bold mb-3 text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
            What happens next?
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-brand-secondary mt-0.5">•</span>
              <span>We verify your identity and documents.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-secondary mt-0.5">•</span>
              <span>You will receive an email once approved.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-secondary mt-0.5">•</span>
              <span>You can then access your dashboard to add vehicles.</span>
            </li>
          </ul>
        </div>

        <Link
          href="/"
          className="text-white inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-brand-secondary to-brand-primary rounded-xl font-medium hover:bg-card-bg transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
