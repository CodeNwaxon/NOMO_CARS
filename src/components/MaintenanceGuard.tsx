"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Wrench, Settings } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "";

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
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

  if (isActive) {
    isBlocked = true; // Assume blocked by default if active
    if (user && user.uid === CEO_UID) {
      isBlocked = false; // CEO is never blocked from seeing the site
      isCEO = true;
    } else if (profile?.role === "admin" && mode === "users") {
      isBlocked = false; // Admins are allowed if mode is 'users'
    }
  }

  // If we are showing the maintenance page
  if (isActive && isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
        {/* Minimal Header */}
        <header className="w-full px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-black text-xl overflow-hidden shrink-0 relative">
               <span className="absolute">N</span>
            </div>
            <span className="font-bold text-xl hidden sm:block text-slate-900 dark:text-white">Nomo Cars</span>
          </div>
          <div>
            {user ? (
              <button onClick={signOut} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                Sign Out
              </button>
            ) : (
              <button onClick={signInWithGoogle} className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-md">
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Maintenance Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
            <Wrench className="w-12 h-12 text-brand-primary animate-bounce" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">Site Under Maintenance</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mb-8">
            We are currently updating our systems to bring you a better experience. We'll be back shortly. Thank you for your patience!
          </p>
        </main>
      </div>
    );
  }

  const stopMaintenance = async () => {
    try {
      await updateDoc(doc(db, "adminSettings", "maintenance"), { isActive: false });
      toast.success("Maintenance mode deactivated.");
    } catch (e) {
      toast.error("Failed to turn off maintenance.");
    }
  };

  // If CEO is logged in and maintenance is active, show the normal site but inject the CEO tools overlay at the bottom
  // We also show this if an admin is logged in, mode is 'users', and isActive is true
  return (
    <>
      {children}
      
      {isActive && !isBlocked && (
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
    </>
  );
}
