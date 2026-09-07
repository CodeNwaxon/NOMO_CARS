"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, CheckCircle, XCircle, UserCheck, ShieldAlert, Check, Search, Car } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import ImageViewerOverlay from "@/components/ImageViewerOverlay";
import DriverVehiclesModal from "@/components/DriverVehiclesModal";

export default function ManageDriversPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Image Viewer State
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    singleMode: boolean;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    singleMode: false
  });

  // Driver Vehicles Modal State
  const [selectedDriverForVehicles, setSelectedDriverForVehicles] = useState<{id: string, name: string} | null>(null);

  // Password prompt state
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: "disable" | "enable", driverId: string } | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchDrivers(activeTab);
  }, [user, authLoading, activeTab]);

  const fetchDrivers = async (tab: "pending" | "approved") => {
    setLoading(true);
    try {
      let q;
      if (tab === "pending") {
        q = query(collection(db, "users"), where("role", "==", "driver"), where("isApproved", "==", false));
      } else {
        q = query(collection(db, "users"), where("role", "==", "driver"), where("isApproved", "==", true));
      }
      
      const snap = await getDocs(q);
      const fetchedDrivers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDrivers(fetchedDrivers);

      // Only mark as seen if we are fetching pending approvals
      if (tab === "pending" && fetchedDrivers.length > 0) {
        const notifRef = doc(db, "adminSettings", "notifications");
        const notifSnap = await getDoc(notifRef);
        const data = notifSnap.exists() ? notifSnap.data() : {};
        const currentSeen = new Set(data.seenDriverApprovals || []);
        fetchedDrivers.forEach(d => currentSeen.add(d.id));
        
        await setDoc(notifRef, {
          ...data,
          seenDriverApprovals: Array.from(currentSeen)
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  };

  const approveDriver = async (driverId: string) => {
    const toastId = toast.loading("Approving driver...");
    try {
      await updateDoc(doc(db, "users", driverId), { isApproved: true });
      setDrivers(drivers.filter(d => d.id !== driverId));
      toast.success("Driver approved successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve driver.", { id: toastId });
    }
  };

  const rejectDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to reject and delete this driver's application?")) return;
    const toastId = toast.loading("Rejecting driver...");
    try {
      await deleteDoc(doc(db, "users", driverId));
      setDrivers(drivers.filter(d => d.id !== driverId));
      toast.success("Driver application rejected.", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject driver.", { id: toastId });
    }
  };

  // Toggle Driver Account Disable State
  const confirmToggleStatus = async () => {
    if (!pendingAction) return;
    if (!adminPassword.trim()) {
      toast.error("Master password is required.");
      return;
    }
    
    const toastId = toast.loading("Verifying credentials...");
    try {
      const ceoRef = doc(db, "adminSettings", "ceo");
      const ceoSnap = await getDoc(ceoRef);
      const currentPassword = ceoSnap.exists() ? ceoSnap.data().password : "prince123";

      if (adminPassword !== currentPassword) {
        toast.error("Incorrect master password!", { id: toastId });
        return;
      }

      toast.loading(`${pendingAction.type === "disable" ? "Disabling" : "Enabling"} account...`, { id: toastId });
      
      const newStatus = pendingAction.type === "disable";
      await updateDoc(doc(db, "users", pendingAction.driverId), { isDisabled: newStatus });
      
      setDrivers(drivers.map(d => d.id === pendingAction.driverId ? { ...d, isDisabled: newStatus } : d));
      
      toast.success(`Account successfully ${pendingAction.type === "disable" ? "disabled" : "enabled"}!`, { id: toastId });
      
      setShowPasswordPrompt(false);
      setAdminPassword("");
      setPendingAction(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating status.", { id: toastId });
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        
        <div>
          <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary flex items-center gap-2">
            <UserCheck className="w-6 h-6 md:w-8 md:h-8" />
            Manage Drivers
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Review pending registrations and manage active drivers.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab("pending")}
            className={`pb-3 font-semibold text-sm transition-colors ${activeTab === "pending" ? "text-brand-primary border-b-2 border-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
          >
            Pending Approvals
          </button>
          <button 
            onClick={() => setActiveTab("approved")}
            className={`pb-3 font-semibold text-sm transition-colors ${activeTab === "approved" ? "text-brand-primary border-b-2 border-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
          >
            Approved Drivers
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all shadow-sm text-gray-900 dark:text-white"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {activeTab} drivers found!</h3>
            <p className="text-gray-500">There are no drivers in this category right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers
              .filter(d => 
                (d.firstName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.lastName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.phone || "").includes(searchQuery) ||
                (d.operatingCity || "").toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(driver => (
              <div key={driver.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden">
                {driver.isDisabled && (
                  <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold py-1 text-center">
                    ACCOUNT DISABLED
                  </div>
                )}
                
                <div className={`flex items-center gap-4 mb-4 ${driver.isDisabled ? "mt-4 opacity-75" : ""}`}>
                  <div 
                    className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer group relative"
                    onClick={() => {
                      const imgs = [driver.displayImage, driver.identityImage].filter(Boolean) as string[];
                      if (imgs.length > 0) {
                        setViewerState({ isOpen: true, images: imgs, initialIndex: 0, singleMode: false });
                      }
                    }}
                  >
                    {driver.displayImage ? (
                      <>
                        <img src={driver.displayImage} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                          VIEW
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                      {driver.firstName || "Unknown"} {driver.lastName || ""}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{driver.email}</p>
                    <p className="text-xs font-semibold text-brand-primary mt-1 uppercase tracking-wider">{driver.operatingCity || "No City"}</p>
                  </div>
                </div>

                <div className={`space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400 flex-1 ${driver.isDisabled ? "opacity-75" : ""}`}>
                  <p><strong>Phone:</strong> {driver.phone || "N/A"}</p>
                  <p><strong>Identity No:</strong> {driver.identityNumber || "N/A"}</p>
                  {driver.identityImage ? (
                    <button 
                      onClick={() => setViewerState({ isOpen: true, images: [driver.identityImage], initialIndex: 0, singleMode: true })}
                      className="text-brand-primary text-xs hover:bg-brand-primary/10 px-2 py-1 -ml-2 rounded-md transition-colors inline-block mt-1 font-medium"
                    >
                      View Identity Document
                    </button>
                  ) : (
                    <p className="text-xs text-red-500 mt-2">No identity document uploaded</p>
                  )}
                </div>

                <div className="mt-2 mb-4">
                  <button 
                    onClick={() => setSelectedDriverForVehicles({ id: driver.id, name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Driver' })}
                    className="w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex justify-center items-center gap-2 text-sm border border-gray-200 dark:border-gray-700"
                  >
                    <Car className="w-4 h-4" /> View Registered Vehicles
                  </button>
                </div>

                <div className="flex gap-3 mt-auto">
                  {activeTab === "pending" ? (
                    <>
                      <button onClick={() => rejectDriver(driver.id)} className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition-colors flex justify-center items-center gap-2">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => approveDriver(driver.id)} className="flex-1 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex justify-center items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                    </>
                  ) : (
                    <>
                      {driver.isDisabled ? (
                        <button 
                          onClick={() => { setPendingAction({ type: "enable", driverId: driver.id }); setShowPasswordPrompt(true); }} 
                          className="flex-1 py-2 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors flex justify-center items-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Enable Account
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setPendingAction({ type: "disable", driverId: driver.id }); setShowPasswordPrompt(true); }} 
                          className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition-colors flex justify-center items-center gap-2"
                        >
                          <ShieldAlert className="w-4 h-4" /> Disable Account
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
      
      {/* Modals */}
      {viewerState.isOpen && (
        <ImageViewerOverlay
          images={viewerState.images}
          initialIndex={viewerState.initialIndex}
          singleMode={viewerState.singleMode}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {selectedDriverForVehicles && (
        <DriverVehiclesModal
          driverId={selectedDriverForVehicles.id}
          driverName={selectedDriverForVehicles.name}
          onClose={() => setSelectedDriverForVehicles(null)}
        />
      )}

      {/* Password Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">CEO Authorization Required</h3>
            <p className="text-sm text-gray-500 mb-4">Please enter the master password to {pendingAction?.type} this account.</p>
            
            <input 
              type="password" 
              placeholder="Master Password" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none mb-6"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowPasswordPrompt(false); setAdminPassword(""); setPendingAction(null); }}
                className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggleStatus}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
