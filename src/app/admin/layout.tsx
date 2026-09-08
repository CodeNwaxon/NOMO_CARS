"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [isCEO, setIsCEO] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }

    if (user.uid === CEO_UID) {
      setIsCEO(true);
      setAllowedRoutes(["all"]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "adminRoles", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setAllowedRoutes(docSnap.data().routes || []);
      } else {
        setAllowedRoutes([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (loading || authLoading) return;

    if (isCEO) {
      setHasAccess(true);
      return;
    }

    // Explicitly protect CEO-only route
    if (pathname?.startsWith("/admin/manage-admins")) {
      setHasAccess(false);
      return;
    }

    // Dashboard root route access
    if (pathname === "/admin") {
      setHasAccess(allowedRoutes.length > 0);
      return;
    }

    // General route access (startsWith handles sub-routes like /admin/reports/123)
    const hasSpecificAccess = allowedRoutes.some(route => 
      route !== "/admin" && pathname?.startsWith(route)
    );
    
    setHasAccess(hasSpecificAccess);

  }, [pathname, allowedRoutes, loading, authLoading, isCEO]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 drop-shadow-lg" />
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          You do not have the required permissions to access this specific module. If you believe this is an error, please contact the administrator.
        </p>
        <div className="flex gap-4">
          <Link href="/admin" className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition shadow-sm">
            Admin Home
          </Link>
          <Link href="/" className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition shadow-lg shadow-brand-primary/20">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
