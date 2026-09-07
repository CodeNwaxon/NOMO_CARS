"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, BarChart3, AlertTriangle, Settings, Users, CreditCard, LayoutDashboard } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/driver/login");
      return;
    }

    const fetchAccess = async () => {
      if (!user) return;
      if (user.uid === CEO_UID) {
        setAllowedRoutes(["all"]);
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "adminRoles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAllowedRoutes(docSnap.data().routes || []);
        } else {
          setAllowedRoutes([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccess();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  const hasAccess = (route: string) => allowedRoutes.includes("all") || allowedRoutes.includes(route);

  if (allowedRoutes.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">You do not have permission to view the admin dashboard.</p>
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
      requires: "manage-admins"
    },
    {
      id: "manage-purchases",
      title: "Manage Purchases",
      description: "Configure VIP cards and ticket prices.",
      icon: CreditCard,
      href: "/admin/manage-purchases",
      color: "bg-amber-500",
      requires: "manage-purchases"
    },
    {
      id: "reports",
      title: "Reports & Help",
      description: "Manage user misconduct reports and support messages.",
      icon: AlertTriangle,
      href: "/admin/reports",
      color: "bg-red-500",
      requires: "reports"
    },
    {
      id: "site-settings",
      title: "Site Settings",
      description: "Update global CMS, FAQs, policies, and landing page content.",
      icon: Settings,
      href: "/admin/site-settings",
      color: "bg-purple-500",
      requires: "site-settings"
    },
    {
      id: "statistics",
      title: "Statistics & Overview",
      description: "View platform metrics, user counts, and revenue.",
      icon: BarChart3,
      href: "/admin/statistics",
      color: "bg-blue-500",
      requires: "statistics"
    }
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
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
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
