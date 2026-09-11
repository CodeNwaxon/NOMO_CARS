"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNotifications } from "@/context/NotificationContext";

const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
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

  // Real-time toast notifications for admins
  useEffect(() => {
    if (!hasAccess || !user) return;

    let isInitialLoadV = true;
    const vQ = query(collection(db, "vehicles"), where("isApproved", "==", false));
    const unsubV = onSnapshot(vQ, (snap) => {
      if (isInitialLoadV) {
        isInitialLoadV = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
          const v = change.doc.data();
          // Only notify on modified if it was explicitly marked as edited
          if (change.type === "modified" && !v.editedSinceLastApproval) return;

          toast.custom((t) => (
            <div className={`max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-slate-800 ${t.visible ? 'animate-in slide-in-from-top-4' : 'animate-out slide-out-to-top-4'}`}>
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider text-brand-primary mb-1">
                    {change.type === "modified" ? "Vehicle Re-submitted" : "New Vehicle Pending"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    A driver has submitted a <b>{v.details?.make} {v.details?.model}</b> for review.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/admin/vehicle-approvals');
                  }}
                  className="flex-1 rounded-xl py-2.5 text-xs md:text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors shadow-md"
                >
                  View Details
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 rounded-xl py-2.5 text-xs md:text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), { duration: 8000, position: 'top-right' });
        }
      });
    });

    let isInitialLoadD = true;
    const dQ = query(collection(db, "users"), where("role", "==", "driver"), where("isApproved", "==", false));
    const unsubD = onSnapshot(dQ, (snap) => {
      if (isInitialLoadD) {
        isInitialLoadD = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
          const d = change.doc.data();
          if (change.type === "modified") return; // Usually drivers don't edit profiles to become pending again, but if they do, we'd add a flag

          toast.custom((t) => (
            <div className={`max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-slate-800 ${t.visible ? 'animate-in slide-in-from-top-4' : 'animate-out slide-out-to-top-4'}`}>
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider text-emerald-500 mb-1">
                    New Driver Pending
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <b>{d.firstName} {d.lastName}</b> has registered and is awaiting approval.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/admin/driver-approvals');
                  }}
                  className="flex-1 rounded-xl py-2.5 text-xs md:text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-md"
                >
                  View Details
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 rounded-xl py-2.5 text-xs md:text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), { duration: 8000, position: 'top-right' });
        }
      });
    });

    return () => {
      unsubV();
      unsubD();
    };
  }, [hasAccess, user, router]);

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
