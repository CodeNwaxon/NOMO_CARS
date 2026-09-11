"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User as UserIcon, Car, MessageCircle, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import ProfileTab from "./ProfileTab";
import VehiclesTab from "./VehiclesTab";
import MessagesTab from "./MessagesTab";

export default function DriverDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const { totalUnread } = useChat();
  const [activeTab, setActiveTab] = useState<"profile" | "vehicles" | "messages">("profile");
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam === "messages" || tabParam === "vehicles" || tabParam === "profile") {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } else if (profile?.role !== "driver") {
        router.push("/driver/register");
      } else if (!profile?.isApproved && !profile?.isRejected) {
        router.push("/driver/awaiting-approval");
      } else if (profile?.isApproved) {
        // Enforce limits lazily on background load
        import("@/actions/enforcement").then((m) => {
          m.enforceDriverLimits(user.uid).catch(console.error);
        });
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile || (!profile.isApproved && !profile.isRejected)) {
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

  if (profile.isDisabled) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Account Disabled</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Your account has been temporarily disabled by an administrator. You currently do not have access to the platform. Please contact support for assistance.
        </p>
        <button 
          onClick={confirmSignOut}
          className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-lg flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* REJECTION OVERLAY */}
      {profile.isRejected && (
        <div className="absolute inset-0 z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900 shadow-2xl rounded-3xl max-w-lg w-full p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Application Rejected</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Unfortunately, your driver application was not approved by our team.
            </p>
            
            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 mb-8 text-left border border-red-100 dark:border-red-900/30">
              <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-1">Reason for Rejection</p>
              <p className="text-red-900 dark:text-red-200 text-sm">{profile.rejectionReason || "No specific reason provided."}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                href="/passenger/home"
                className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Go to Passenger Profile
              </Link>
              <Link 
                href="/driver/register"
                className="px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
              >
                Reapply Now
              </Link>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => setActiveTab("messages")}
            className="md:hidden relative flex items-center gap-1.5 p-2 rounded-lg text-brand-primary hover:bg-brand-primary/10 transition-colors"
          >
            <span className="font-bold text-sm">Chat</span>
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </div>
          </button>
        </div>

        <nav className="flex flex-row md:flex-col gap-2 flex-1 md:flex-initial md:space-y-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 md:flex-initial md:w-full flex items-center justify-center md:justify-start gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all whitespace-nowrap text-[11px] md:text-sm ${
              activeTab === "profile"
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                : "bg-card-bg md:bg-transparent hover:bg-card-bg/80 text-foreground/80 hover:text-foreground border border-card-border md:border-none"
            }`}
          >
            <UserIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span className="font-medium">My Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`flex-1 md:flex-initial md:w-full flex items-center justify-center md:justify-start gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all whitespace-nowrap text-[11px] md:text-sm ${
              activeTab === "vehicles"
                ? "bg-brand-secondary text-white shadow-md shadow-brand-secondary/20"
                : "bg-card-bg md:bg-transparent hover:bg-card-bg/80 text-foreground/80 hover:text-foreground border border-card-border md:border-none"
            }`}
          >
            <Car className="w-3 h-3 md:w-4 md:h-4" />
            <span className="font-medium">My Vehicles</span>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`hidden md:flex flex-1 md:flex-initial md:w-full items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap text-sm relative ${
              activeTab === "messages"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "bg-card-bg md:bg-transparent hover:bg-card-bg/80 text-foreground/80 hover:text-foreground border border-card-border md:border-none"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">Messages</span>
            {totalUnread > 0 && (
              <span className="ml-auto md:ml-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>
          <Link href="/purchase-history" className="flex-1 md:flex-initial md:w-full flex items-center justify-center md:justify-start px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[11px] md:text-sm font-medium text-foreground/80 hover:bg-card-bg/80 hover:text-foreground whitespace-nowrap underline md:no-underline">
            <span className="md:hidden">Purchases</span>
            <span className="hidden md:inline">Purchase History</span>
          </Link>
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
        
        {activeTab === "profile" && <ProfileTab profile={profile} userId={user.uid} onSignOut={() => setShowSignOutModal(true)} />}
        {activeTab === "vehicles" && <VehiclesTab userId={user.uid} vipStars={profile.vipStars || 0} ticketExpiry={profile.ticketExpiry} lastTicketDays={profile.lastTicketDays} />}
        {activeTab === "messages" && <MessagesTab userId={user.uid} />}
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
