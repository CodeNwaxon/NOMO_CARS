"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User as UserIcon, Car, Plus, Loader2 } from "lucide-react";
import ProfileTab from "./ProfileTab";
import VehiclesTab from "./VehiclesTab";

export default function DriverDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "vehicles">("profile");
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } else if (profile?.role !== "driver") {
        router.push("/driver/register");
      } else if (!profile?.isApproved) {
        router.push("/driver/awaiting-approval");
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile || !profile.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  const confirmSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation / Mobile Top Nav */}
      <aside className="w-full md:w-64 glass-panel md:min-h-screen border-b md:border-b-0 md:border-r border-card-border p-4 md:p-6 flex flex-col">
        <div className="mb-4 md:mb-10 flex justify-between items-center md:block">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Nomo Driver
            </h2>
            <p className="text-xs md:text-sm text-foreground/60 mt-1">Welcome, {profile.firstName}</p>
          </div>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="md:hidden flex items-center gap-1.5 p-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <nav className="flex flex-row md:flex-col gap-2 flex-1 md:flex-initial md:space-y-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 md:flex-initial md:w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${
              activeTab === "profile"
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                : "bg-card-bg md:bg-transparent hover:bg-card-bg/80 text-foreground/80 hover:text-foreground border border-card-border md:border-none"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="font-medium">My Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`flex-1 md:flex-initial md:w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${
              activeTab === "vehicles"
                ? "bg-brand-secondary text-white shadow-md shadow-brand-secondary/20"
                : "bg-card-bg md:bg-transparent hover:bg-card-bg/80 text-foreground/80 hover:text-foreground border border-card-border md:border-none"
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="font-medium">My Vehicles</span>
          </button>
        </nav>

        <div className="hidden md:block mt-auto pt-6 border-t border-card-border">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 relative overflow-y-auto h-screen">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        {activeTab === "profile" && <ProfileTab profile={profile} userId={user.uid} />}
        {activeTab === "vehicles" && <VehiclesTab userId={user.uid} />}
      </main>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Sign Out</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 py-3 bg-brand-accent text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-brand-accent/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
