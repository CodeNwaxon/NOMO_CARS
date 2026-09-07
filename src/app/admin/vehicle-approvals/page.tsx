"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, CheckCircle, XCircle, LayoutDashboard, ShieldAlert, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import ImageViewerOverlay from "@/components/ImageViewerOverlay";

export default function ManageVehiclesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [vehicles, setVehicles] = useState<any[]>([]);
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

  // Password prompt state
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: "unapprove" | "delete", vehicleId: string } | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchVehicles(activeTab);
  }, [user, authLoading, activeTab]);

  const fetchVehicles = async (tab: "pending" | "approved") => {
    setLoading(true);
    try {
      let q;
      if (tab === "pending") {
        q = query(collection(db, "vehicles"), where("isApproved", "==", false));
      } else {
        q = query(collection(db, "vehicles"), where("isApproved", "==", true));
      }

      const snap = await getDocs(q);
      const fetchedVehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVehicles(fetchedVehicles);

      // Only mark as seen if we are fetching pending approvals
      if (tab === "pending" && fetchedVehicles.length > 0) {
        const notifRef = doc(db, "adminSettings", "notifications");
        const notifSnap = await getDoc(notifRef);
        const data = notifSnap.exists() ? notifSnap.data() : {};
        const currentSeen = new Set(data.seenVehicleApprovals || []);
        fetchedVehicles.forEach(v => currentSeen.add(v.id));

        await setDoc(notifRef, {
          ...data,
          seenVehicleApprovals: Array.from(currentSeen)
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  const approveVehicle = async (vehicleId: string) => {
    const toastId = toast.loading("Approving vehicle...");
    try {
      await updateDoc(doc(db, "vehicles", vehicleId), { isApproved: true });
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success("Vehicle approved successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve vehicle.", { id: toastId });
    }
  };

  const rejectVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to reject and delete this vehicle application?")) return;
    const toastId = toast.loading("Rejecting vehicle...");
    try {
      await deleteDoc(doc(db, "vehicles", vehicleId));
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success("Vehicle application rejected.", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject vehicle.", { id: toastId });
    }
  };

  // Toggle Vehicle Status (Unapprove or Delete approved vehicle)
  const confirmAction = async () => {
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

      toast.loading(`Processing action...`, { id: toastId });

      if (pendingAction.type === "unapprove") {
        await updateDoc(doc(db, "vehicles", pendingAction.vehicleId), { isApproved: false });
        setVehicles(vehicles.filter(v => v.id !== pendingAction.vehicleId));
        toast.success("Vehicle marked as unapproved.", { id: toastId });
      } else if (pendingAction.type === "delete") {
        await deleteDoc(doc(db, "vehicles", pendingAction.vehicleId));
        setVehicles(vehicles.filter(v => v.id !== pendingAction.vehicleId));
        toast.success("Vehicle permanently deleted.", { id: toastId });
      }

      setShowPasswordPrompt(false);
      setAdminPassword("");
      setPendingAction(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while processing the action.", { id: toastId });
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
            <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8" />
            Manage Vehicles
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Review pending registrations and manage approved vehicles.</p>
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
            Approved Vehicles
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by make, model, category, plate number or driver ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all shadow-sm text-gray-900 dark:text-white"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {activeTab} vehicles found!</h3>
            <p className="text-gray-500">There are no vehicles in this category right now.</p>
          </div>
        ) : (
          <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles
              .filter(v =>
                (v.details?.make || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.details?.model || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.details?.plateNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.driverId || "").toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(vehicle => (
                <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-2xl p-1 md:p-2 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden">
                  <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden mb-3 relative group">
                    {vehicle.images && Object.values(vehicle.images).length > 0 ? (
                      <>
                        <img src={Object.values(vehicle.images)[0] as string} alt="Vehicle" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              const allImages = [
                                ...(vehicle.images ? Object.values(vehicle.images) as string[] : []),
                                ...(vehicle.documents ? Object.values(vehicle.documents) as string[] : [])
                              ];
                              setViewerState({
                                isOpen: true,
                                images: allImages,
                                initialIndex: 0,
                                singleMode: false
                              });
                            }}
                            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white/20 hover:bg-brand-primary text-white backdrop-blur-md rounded-full font-semibold transition-colors shadow-sm"
                          >
                            View More
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>

                  <div className="px-2 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                        {vehicle.details?.make || "Unknown"} {vehicle.details?.model || ""}
                      </h3>
                      <p className="text-[10px] text-gray-500 truncate">{vehicle.details?.year || "Unknown Year"}</p>
                      <p className="text-[10px] font-semibold text-brand-primary mt-0.5 uppercase tracking-wider">{vehicle.details?.plateNumber || "No Plate"}</p>
                    </div>

                    <div className="space-y-1 my-3 text-xs text-gray-600 dark:text-gray-400 flex-1">
                      <p><strong>Category:</strong> {vehicle.category || "N/A"}</p>
                      <p><strong>Driver ID:</strong> <span className="font-mono text-[10px]">{vehicle.driverId || "N/A"}</span></p>
                      {vehicle.documents && Object.values(vehicle.documents).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(vehicle.documents).map(([key, url]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setViewerState({
                                  isOpen: true,
                                  images: [url as string],
                                  initialIndex: 0,
                                  singleMode: true
                                });
                              }}
                              className="text-brand-primary text-[10px] hover:bg-brand-primary/20 bg-brand-primary/10 px-1.5 py-0.5 rounded capitalize transition-colors"
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-red-500 mt-1">No documents uploaded</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {activeTab === "pending" ? (
                        <>
                          <button onClick={() => rejectVehicle(vehicle.id)} className="flex-1 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors flex justify-center items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button onClick={() => approveVehicle(vehicle.id)} className="flex-1 py-1.5 text-xs bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex justify-center items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setPendingAction({ type: "delete", vehicleId: vehicle.id }); setShowPasswordPrompt(true); }}
                            className="flex-1 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors flex justify-center items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                          <button
                            onClick={() => { setPendingAction({ type: "unapprove", vehicleId: vehicle.id }); setShowPasswordPrompt(true); }}
                            className="flex-1 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors flex justify-center items-center gap-1.5"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" /> Unapprove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>

      {/* Password Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">CEO Authorization Required</h3>
            <p className="text-sm text-gray-500 mb-4">Please enter the master password to {pendingAction?.type} this vehicle.</p>

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
                onClick={confirmAction}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ImageViewer Overlay */}
      {viewerState.isOpen && (
        <ImageViewerOverlay
          images={viewerState.images}
          initialIndex={viewerState.initialIndex}
          singleMode={viewerState.singleMode}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
