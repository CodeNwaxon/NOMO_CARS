"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Wrench, Settings, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { usePathname } from "next/navigation";

const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "";

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const pathname = usePathname();
  const [maintenanceSettings, setMaintenanceSettings] = useState<{ isActive: boolean, mode: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "maintenance"), (snap) => {
      if (snap.exists()) {
        setMaintenanceSettings(snap.data() as { isActive: boolean, mode: string });
      } else {
        setMaintenanceSettings({ isActive: false, mode: "all" });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
      </div>
    );
  }

  const isActive = maintenanceSettings?.isActive;
  const mode = maintenanceSettings?.mode || "all";

  let isBlocked = false;
  let isCEO = false;
  let isAdminAuthorized = false;

  if (isActive) {
    isBlocked = true;
    if (user && user.uid === CEO_UID) {
      isCEO = true;
      isAdminAuthorized = true;
    } else if (profile?.role === "admin" && mode === "users") {
      isAdminAuthorized = true;
    }

    // Only unblock if they are authorized AND they are on an /admin route
    if (isAdminAuthorized && pathname?.startsWith("/admin")) {
      isBlocked = false;
    }
  }

  const stopMaintenance = async () => {
    try {
      // Optimistically update the UI instantly
      setMaintenanceSettings(prev => prev ? { ...prev, isActive: false } : null);
      
      await updateDoc(doc(db, "adminSettings", "maintenance"), { isActive: false });
      toast.success("Maintenance mode deactivated.");
      
      // Force Next.js to reload the current route to properly mount the app
      window.location.reload();
    } catch (e) {
      toast.error("Failed to turn off maintenance.");
    }
  };

  // If we are showing the maintenance page
  if (isActive && isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans relative">
        {/* Sign in / out button on top right */}
        <div className="absolute top-6 right-6 z-50">
          {user ? (
            <button onClick={signOut} className="px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          ) : (
            <button onClick={signInWithGoogle} className="px-4 py-2 rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-md flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>

        {/* Maintenance Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
            <Wrench className="w-12 h-12 text-brand-primary animate-bounce" />
          </div>
          <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">Site Under Maintenance</h1>
          <p className="text-sm md:text-lg text-slate-600 dark:text-slate-400 max-w-lg mb-8 font-medium">
            We are currently updating our systems to bring you a better experience. We'll be back shortly.
          </p>
        </main>

        {/* CEO / Admin Overlay at bottom if authorized but on the maintenance page */}
        {isAdminAuthorized && (
          <div className="fixed bottom-0 left-0 w-full bg-red-600 text-white p-3 z-[9999] flex flex-col sm:flex-row justify-between items-center shadow-[0_-10px_40px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2 mb-3 sm:mb-0">
              <Wrench className="w-5 h-5 animate-spin" />
              <span className="font-bold text-sm sm:text-base">
                Maintenance Active {mode === 'all' ? '(Blocking All Users)' : '(Blocking Regular Users)'}
              </span>
            </div>

            <div className="flex gap-3">
              {isCEO && (
                <button
                  onClick={stopMaintenance}
                  className="px-4 py-1.5 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm"
                >
                  Stop Maintenance
                </button>
              )}
              <Link
                href="/admin/statistics"
                className="px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg transition-colors border border-red-700 shadow-sm flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4" /> Visit Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal site for admins when on /admin paths (or if maintenance is off)
  return (
    <>
      {children}

      {isActive && !isBlocked && isAdminAuthorized && (
        <div className="fixed bottom-0 left-0 w-full bg-red-600 text-white p-3 z-[9999] flex flex-col sm:flex-row justify-between items-center shadow-[0_-10px_40px_rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-2 mb-3 sm:mb-0">
            <Wrench className="w-5 h-5 animate-spin" />
            <span className="font-bold text-sm sm:text-base">
              Maintenance Active {mode === 'all' ? '(Blocking All Users)' : '(Blocking Regular Users)'}
            </span>
          </div>

          <div className="flex gap-3">
            {isCEO && (
              <button
                onClick={stopMaintenance}
                className="px-4 py-1.5 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm"
              >
                Stop Maintenance
              </button>
            )}
            <Link
              href="/admin/statistics"
              className="px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg transition-colors border border-red-700 shadow-sm flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" /> Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
