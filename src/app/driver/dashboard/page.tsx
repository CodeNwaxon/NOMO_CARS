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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/driver");
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 glass-panel md:min-h-screen border-r border-card-border p-6 flex flex-col">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
            Nomo Driver
          </h2>
          <p className="text-sm text-foreground/60 mt-1">Welcome, {profile.firstName}</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "profile"
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                : "hover:bg-card-bg/80 text-foreground/80 hover:text-foreground"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="font-medium">My Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "vehicles"
                ? "bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20"
                : "hover:bg-card-bg/80 text-foreground/80 hover:text-foreground"
            }`}
          >
            <Car className="w-5 h-5" />
            <span className="font-medium">My Vehicles</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-card-border">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-accent hover:bg-brand-accent/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 relative overflow-y-auto h-screen">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        {activeTab === "profile" && <ProfileTab profile={profile} userId={user.uid} />}
        {activeTab === "vehicles" && <VehiclesTab userId={user.uid} />}
      </main>
    </div>
  );
}
