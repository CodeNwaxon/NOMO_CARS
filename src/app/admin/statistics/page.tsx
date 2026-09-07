"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, Car, CreditCard, Loader2, ArrowRight, ArrowLeft, Mail, Crown, Ticket, BarChart3 } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Stats {
  drivers: number;
  passengers: number;
  ticketRevenue: number;
  vipRevenue: number;
}

interface VehicleCategoryStats {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

interface AdminStaff {
  id: string;
  name: string;
  email: string;
  routes: string[];
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ drivers: 0, passengers: 0, ticketRevenue: 0, vipRevenue: 0 });
  const [vehicleStats, setVehicleStats] = useState<Record<string, VehicleCategoryStats>>({});
  const [admins, setAdmins] = useState<AdminStaff[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/driver/login");
      return;
    }

    const fetchStats = async () => {
      if (!user) return;

      try {
        // 1. Fetch Users (Drivers & Passengers)
        const usersSnap = await getDocs(collection(db, "users"));
        let dCount = 0;
        let pCount = 0;

        const allUsers: Record<string, any> = {};

        usersSnap.forEach((doc) => {
          const data = doc.data();
          allUsers[doc.id] = data;
          if (data.role === "driver") dCount++;
          else if (data.role === "passenger") pCount++;
        });

        // 2. Fetch Transactions (Revenue)
        const transSnap = await getDocs(collection(db, "transactions"));
        let tRev = 0;
        let vRev = 0;
        transSnap.forEach((doc) => {
          const data = doc.data();
          const type = (data.type || "").toLowerCase();
          if (type.includes("ticket") && data.amount) tRev += data.amount;
          else if (type.includes("vip") && data.amount) vRev += data.amount;
        });

        setStats({
          drivers: dCount,
          passengers: pCount,
          ticketRevenue: tRev,
          vipRevenue: vRev
        });

        // 3. Fetch Vehicles
        const vehiclesSnap = await getDocs(collection(db, "vehicles"));
        const vStats: Record<string, VehicleCategoryStats> = {
          "Car": { approved: 0, pending: 0, rejected: 0, total: 0 },
          "SUV": { approved: 0, pending: 0, rejected: 0, total: 0 },
          "Mini Bus": { approved: 0, pending: 0, rejected: 0, total: 0 },
          "Bus": { approved: 0, pending: 0, rejected: 0, total: 0 },
          "Truck": { approved: 0, pending: 0, rejected: 0, total: 0 },
        };

        vehiclesSnap.forEach((doc) => {
          const data = doc.data();
          const cat = data.category || "Other";

          if (!vStats[cat]) {
            vStats[cat] = { approved: 0, pending: 0, rejected: 0, total: 0 };
          }

          vStats[cat].total++;

          if (data.isRejected) {
            vStats[cat].rejected++;
          } else if (data.isApproved) {
            vStats[cat].approved++;
          } else {
            vStats[cat].pending++;
          }
        });

        setVehicleStats(vStats);

        // 4. Fetch Admins
        const adminsSnap = await getDocs(collection(db, "adminRoles"));
        const adminList: AdminStaff[] = [];

        // Always include CEO explicitly
        const ceoUid = process.env.NEXT_PUBLIC_ADMIN_UID;
        if (ceoUid && allUsers[ceoUid]) {
          adminList.push({
            id: ceoUid,
            name: allUsers[ceoUid].username || allUsers[ceoUid].firstName || "CEO",
            email: allUsers[ceoUid].email || "",
            routes: ["all"]
          });
        }

        adminsSnap.forEach((doc) => {
          if (doc.id === ceoUid) return; // Already added

          const uData = allUsers[doc.id];
          if (uData) {
            adminList.push({
              id: doc.id,
              name: uData.username || uData.firstName || "Admin",
              email: uData.email || "",
              routes: doc.data().routes || []
            });
          }
        });

        setAdmins(adminList);

      } catch (err) {
        console.error("Error fetching admin stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-20 px-3 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-primary" />
              Platform Statistics
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Platform statistics and administrative overview.</p>
          </div>
        </div>

        {/* Top User & Revenue Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col transition-all">
            <div className="flex items-center gap-3 mb-4 text-gray-500 dark:text-gray-400">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs md:text-sm">Total Drivers</span>
            </div>
            <div className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-auto">{stats.drivers}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col transition-all">
            <div className="flex items-center gap-3 mb-4 text-gray-500 dark:text-gray-400">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs md:text-sm">Total Passengers</span>
            </div>
            <div className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-auto">{stats.passengers}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col transition-all">
            <div className="flex items-center gap-3 mb-4 text-gray-500 dark:text-gray-400">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs md:text-sm">Ticket Revenue</span>
            </div>
            <div className="text-xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-auto">₦{stats.ticketRevenue.toLocaleString()}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col transition-all">
            <div className="flex items-center gap-3 mb-4 text-gray-500 dark:text-gray-400">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <Crown className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs md:text-sm">VIP Revenue</span>
            </div>
            <div className="text-xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-auto">₦{stats.vipRevenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Vehicles by Category */}
        <h2 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2 mt-8">
          <Car className="w-5 h-5 text-brand-primary" /> Vehicle Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6 mb-8">
          {Object.entries(vehicleStats).map(([category, data]) => (
            <div key={category} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
              <h3 className="font-bold text-sm md:text-base mb-3 text-gray-800 dark:text-gray-200">{category} <span className="text-xs font-normal text-gray-400 ml-1">({data.total})</span></h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Approved</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{data.approved}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Pending</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{data.pending}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Rejected</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{data.rejected}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Staff */}
        <h2 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2 mt-8">
          <ShieldCheck className="w-5 h-5 text-brand-primary" /> Admin Staff
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white capitalize">{admin.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{admin.email}</p>
                <div className="mt-2 text-[10px] md:text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded w-fit">
                  {admin.routes.includes("all") ? "CEO" : "Admin"}
                </div>
              </div>
              <a
                href={`mailto:${admin.email}`}
                className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors flex-shrink-0"
                title="Send Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
