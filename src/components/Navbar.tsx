"use client";

import Link from "next/link";
import { LogIn, ChevronDown, LayoutDashboard, LogOut, Headphones, Home, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDashboardRedirect = () => {
    if (profile?.role === "driver") {
      router.push("/driver/dashboard");
    } else {
      router.push("/passenger/dashboard");
    }
  };

  const isLandingPage = pathname === "/";

  return (
    <nav className={`w-full flex items-center justify-between py-3 px-4 md:p-4 z-50 ${isLandingPage ? 'absolute top-0 left-0 right-0' : 'sticky top-0 bg-background/80 backdrop-blur-md border-b dark:border-white/10 border-black/10'}`}>
      {/* Left: Home */}
      <div>
        {!isLandingPage ? (
          <Link href="/" className="flex items-center gap-2 px-2 py-2 md:px-4 md:py-2 text-sm dark:text-white text-gray-900 rounded-xl md:rounded-full font-medium border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-none">
            <Home className="w-5 h-5 md:w-4 md:h-4 " />
            <span className="hidden sm:inline text-sm">Home</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 text-sm dark:text-white text-gray-900 font-bold tracking-widest">

          </div>
        )}
      </div>

      {/* Right: Auth / Help */}
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/help" className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 text-sm dark:text-white text-gray-900 rounded-xl md:rounded-full font-medium border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-none">
          <Headphones className="w-5 h-5 md:w-4 md:h-4" />
          <span>Help</span>
        </Link>

        {!user ? (
          <button
            onClick={signInWithGoogle}
            className="text-xs md:text-sm flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2  bg-brand-primary text-white rounded-xl md:rounded-full font-medium hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 md:gap-3 p-1.5 pr-3 md:p-2 md:pr-4 dark:bg-slate-900/80 bg-white/80 backdrop-blur-md border dark:border-white/20 border-black/10 rounded-full hover:border-brand-primary/50 transition-all shadow-lg dark:text-white text-gray-900"
            >
              <div className="w-7 h-7 md:w-10 md:h-10 rounded-full overflow-hidden bg-card-border border-2 border-brand-primary flex-shrink-0">
                {profile?.displayImage || user.photoURL ? (
                  <img src={profile?.displayImage || user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-primary font-bold bg-slate-800 uppercase">
                    {profile?.username?.charAt(0) || user.email?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start justify-center text-left max-w-[100px] overflow-hidden">
                <span className="text-[10px] md:text-sm font-bold leading-tight truncate w-full dark:text-white text-gray-900 capitalize">
                  {profile?.username || user.displayName || "User"}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 dark:text-gray-400 text-gray-600 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 md:w-56 w-48 dark:bg-slate-900 bg-white border dark:border-white/10 border-black/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-2 flex flex-col gap-1">
                  <div className="px-2 md:px-4 py-1.5 md:py-2">
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate font-medium w-full">
                      {user.email}
                    </p>
                  </div>
                  <div className="h-[1px] dark:bg-white/10 bg-black/5 mx-2 mb-1"></div>
                  {user.uid === process.env.NEXT_PUBLIC_ADMIN_UID && (
                    <>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push("/admin");
                        }}
                        className="flex items-center gap-3 w-full px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-left dark:text-gray-200 text-gray-700 hover:bg-yellow-500/20 rounded-lg transition-colors group"
                      >
                        <ShieldCheck className="w-5 h-5 dark:text-gray-400 text-gray-500 group-hover:text-yellow-600 dark:group-hover:text-yellow-400" />
                        <span className="text-xs md:text-sm font-medium group-hover:text-yellow-600 dark:group-hover:text-yellow-400">CEO Panel</span>
                      </button>
                      <div className="h-[1px] dark:bg-white/10 bg-black/5 mx-2 my-1"></div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleDashboardRedirect();
                    }}
                    className="flex items-center gap-3 w-full px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-left dark:text-gray-200 text-gray-700 hover:bg-brand-primary/20 rounded-lg transition-colors group"
                  >
                    <LayoutDashboard className="w-5 h-5 dark:text-gray-400 text-gray-500 group-hover:text-brand-primary" />
                    <span className="text-xs md:text-sm font-medium group-hover:text-brand-primary dark:group-hover:text-white">My Dashboard</span>
                  </button>
                  <div className="h-[1px] dark:bg-white/10 bg-black/5 mx-2 my-1"></div>
                  <button
                    onClick={() => {
                      signOut();
                      setDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-left dark:text-gray-200 text-gray-700 hover:bg-red-500/20 rounded-lg transition-colors group"
                  >
                    <LogOut className="w-5 h-5 dark:text-gray-400 text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
                    <span className="font-medium group-hover:text-red-500 dark:group-hover:text-red-400">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
