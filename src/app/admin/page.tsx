"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, BarChart3, AlertTriangle, Settings, Users, CreditCard, LayoutDashboard, Megaphone } from "lucide-react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);

  const [driverApprovalsCount, setDriverApprovalsCount] = useState(0);
  const [vehicleApprovalsCount, setVehicleApprovalsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;

    if (user.uid === CEO_UID) {
      setAllowedRoutes(["all"]);
      setLoading(false);
    } else {
      const unsubRoles = onSnapshot(doc(db, "adminRoles", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setAllowedRoutes(docSnap.data().routes || []);
        } else {
          setAllowedRoutes([]);
        }
        setLoading(false);
      });
      // Do not return here, we need the listeners below to run
    }
  }, [user, authLoading]);

  // Shared Notifications Listeners
  useEffect(() => {
    if (loading || !user) return;

    let unsubDrivers: (() => void) | undefined;
    let unsubVehicles: (() => void) | undefined;
    let unsubR: (() => void) | undefined;
    let unsubH: (() => void) | undefined;

    // 1. Listen to adminSettings/notifications for seen arrays
    const unsubNotifs = onSnapshot(doc(db, "adminSettings", "notifications"), (docSnap) => {
      const data = docSnap.exists() ? docSnap.data() : {};
      const seenDrivers: string[] = data.seenDriverApprovals || [];
      const seenVehicles: string[] = data.seenVehicleApprovals || [];
      const seenReports: string[] = data.seenReports || [];
      const seenHelpMessages: string[] = data.seenHelpMessages || [];

      // 2. Listen to unapproved drivers
      if (unsubDrivers) unsubDrivers();
      const driversQ = query(collection(db, "users"), where("role", "==", "driver"), where("isApproved", "==", false));
      unsubDrivers = onSnapshot(driversQ, (snap) => {
        const newCount = snap.docs.filter(d => !seenDrivers.includes(d.id)).length;
        setDriverApprovalsCount(newCount);
      });

      // 3. Listen to unapproved vehicles
      if (unsubVehicles) unsubVehicles();
      const vehiclesQ = query(collection(db, "vehicles"), where("isApproved", "==", false));
      unsubVehicles = onSnapshot(vehiclesQ, (snap) => {
        const newCount = snap.docs.filter(d => !seenVehicles.includes(d.id)).length;
        setVehicleApprovalsCount(newCount);
      });

      // 4. Listen to reports & help messages
      if (unsubR) unsubR();
      if (unsubH) unsubH();

      let pendingReportsCount = 0;
      let pendingHelpCount = 0;

      const updateBadge = () => {
        setReportsCount(pendingReportsCount + pendingHelpCount);
      };

      unsubR = onSnapshot(query(collection(db, "reports")), (snap) => {
        pendingReportsCount = snap.docs.filter(d => !seenReports.includes(d.id)).length;
        updateBadge();
      });

      unsubH = onSnapshot(query(collection(db, "contact_messages")), (snap) => {
        pendingHelpCount = snap.docs.filter(d => !seenHelpMessages.includes(d.id)).length;
        updateBadge();
      });
    });

    return () => {
      unsubNotifs();
      if (unsubDrivers) unsubDrivers();
      if (unsubVehicles) unsubVehicles();
      if (unsubR) unsubR();
      if (unsubH) unsubH();
    };
  }, [user, loading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  const hasAccess = (route: string) => allowedRoutes.includes("all") || allowedRoutes.includes(route);

  // If layout allowed them here but they have 0 routes, it means they are an empty admin
  if (allowedRoutes.length === 0 && user?.uid !== CEO_UID) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Modules Assigned</h1>
        <p className="text-gray-500 mb-6">You have been assigned as an admin but have no access modules yet.</p>
        <Link href="/" className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors">Return Home</Link>
      </div>
    );
  }

  const cards = [
    {
      id: "manage-admins",
      title: "Admin Management",
      description: "Create and manage admin roles and access levels. (CEO Only)",
      icon: Users,
      href: "/admin/manage-admins",
      color: "bg-green-500",
      requires: "/admin/manage-admins"
    },
    {
      id: "driver-approvals",
      title: "Manage Drivers",
      description: "Review pending registrations and manage active drivers.",
      icon: Users, // Wait, I should import UserCheck maybe, but I'll use Users for now
      href: "/admin/driver-approvals",
      color: "bg-emerald-500",
      requires: "/admin/driver-approvals",
      badgeCount: driverApprovalsCount
    },
    {
      id: "vehicle-approvals",
      title: "Manage Vehicles",
      description: "Review pending registrations and manage approved vehicles.",
      icon: LayoutDashboard, // I'll use LayoutDashboard as generic icon
      href: "/admin/vehicle-approvals",
      color: "bg-teal-500",
      requires: "/admin/vehicle-approvals",
      badgeCount: vehicleApprovalsCount
    },
    {
      id: "manage-purchases",
      title: "Manage Purchases",
      description: "Configure VIP cards and ticket prices.",
      icon: CreditCard,
      href: "/admin/manage-purchases",
      color: "bg-amber-500",
      requires: "/admin/manage-purchases"
    },
    {
      id: "reports",
      title: "Reports & Help",
      description: "Manage user misconduct reports and support messages.",
      icon: AlertTriangle,
      href: "/admin/reports",
      color: "bg-red-500",
      requires: "/admin/reports",
      badgeCount: reportsCount
    },
    {
      id: "broadcast",
      title: "Broadcasts",
      description: "Send general messages, alerts, and automate welcome emails.",
      icon: Megaphone,
      href: "/admin/broadcast",
      color: "bg-indigo-500",
      requires: "/admin/broadcast"
    },
    {
      id: "site-settings",
      title: "Site Settings",
      description: "Update global CMS, FAQs, policies, and landing page content.",
      icon: Settings,
      href: "/admin/site-settings",
      color: "bg-purple-500",
      requires: "/admin/site-settings"
    },
    {
      id: "statistics",
      title: "Statistics & Overview",
      description: "View platform metrics, user counts, and revenue.",
      icon: BarChart3,
      href: "/admin/statistics",
      color: "bg-blue-500",
      requires: "/admin/statistics"
    },

  ];

  const visibleCards = cards.filter(c => hasAccess(c.requires));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-20 px-3 md:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-brand-primary" />
            Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base">Welcome back. Select a module to manage.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {visibleCards.map((card) => (
            <Link key={card.id} href={card.href} className="group block h-full">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                {/* Bubble Notification */}
                {card.badgeCount !== undefined && card.badgeCount > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-md">
                    {card.badgeCount} New
                  </div>
                )}

                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand-primary transition-colors">{card.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed mt-auto">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
