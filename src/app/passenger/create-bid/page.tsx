"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, X, Loader2, Trash2, Clock3, Edit2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useVIPLimits } from "@/hooks/useVIPLimits";
import { useNotifications } from "@/context/NotificationContext";

export default function CreateBidPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { limits } = useVIPLimits(profile?.vipStars || 0);
  const { addNotification } = useNotifications();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [activeTab, setActiveTab] = useState<"post" | "browse">("post");
  const [requests, setRequests] = useState<any[]>([]);
  const [bidders, setBidders] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const [requestDurationDays, setRequestDurationDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(0);

  const [form, setForm] = useState({ category: "car", startDate: "", endDate: "", budget: "", currentCity: "", currentState: "", destinationCity: "", destinationState: "", urgent: false });
  const [driverToConfirm, setDriverToConfirm] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const loadRequests = async () => {
    if (!user) return;
    const [pricingSnap, requestSnap] = await Promise.all([
      getDoc(doc(db, "adminSettings", "pricing")),
      getDocs(query(collection(db, "requests"), where("passengerId", "==", user.uid)))
    ]);
    setRequestDurationDays(Number(pricingSnap.data()?.requestDurationDays || 14));
    setRequests(requestSnap.docs.map((item): any => ({ id: item.id, ...item.data() })).sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    setQuotaUsed(requestSnap.docs.filter((item) => Number(item.data().createdAt || 0) >= monthStart.getTime()).length);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadRequests();
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("browse") === "1") {
        setActiveTab("browse");
      }
      const categoryParam = searchParams.get("category");
      if (categoryParam) {
        setForm(prev => ({ ...prev, category: categoryParam.toLowerCase() }));
      }
    }
  }, [authLoading, user]);

  const requestLimit = Number(limits.createBidLimit || 1);

  const createRequest = async () => {
    if (!user || !form.currentCity || !form.currentState || !form.budget || !form.startDate || !form.endDate || !form.destinationCity || !form.destinationState || form.startDate < today || form.endDate < form.startDate) return;
    if (!editingId && quotaUsed >= requestLimit) {
      router.push("/vip");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const budgetNum = typeof form.budget === "string" ? Number(form.budget.replace(/\D/g, "")) : Number(form.budget);
      const requestData = { ...form, budget: budgetNum };

      if (editingId) {
        await updateDoc(doc(db, "requests", editingId), requestData);
        toast.success(`Your ${form.category} request was updated successfully.`);
      } else {
        await addDoc(collection(db, "requests"), {
          ...requestData,
          passengerId: user.uid,
          passengerName: profile?.username || profile?.firstName || "Passenger",
          status: "open",
          bidCount: 0,
          createdAt: now,
          expiresAt: now + requestDurationDays * 24 * 60 * 60 * 1000
        });
        toast.success("Request created successfully!");
      }

      setForm({ category: "car", startDate: "", endDate: "", budget: "", currentCity: "", currentState: "", destinationCity: "", destinationState: "", urgent: false });
      setEditingId(null);
      await loadRequests();
      setActiveTab("browse");
    } finally { setSaving(false); }
  };

  const isExpired = (request: any) => Number(request.expiresAt) <= Date.now();
  const durationLabel = requestDurationDays === 1 ? "1 week" : `${Math.ceil(requestDurationDays / 7)} weeks`;

  const openBidders = async (request: any) => {
    const snapshot = await getDocs(collection(db, "requests", request.id, "bids"));
    setBidders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    setSelectedRequest(request);
  };

  const selectDriver = async (bid: any) => {
    if (!selectedRequest) return;
    await updateDoc(doc(db, "requests", selectedRequest.id), { status: "assigned", selectedDriverId: bid.driverId, selectedBidId: bid.id, selectedDriverName: bid.driverName });
    
    // Notify passenger locally
    addNotification("Driver selected", `${bid.driverName} was selected for your ${selectedRequest.category} request.`, "/passenger/create-bid");
    
    // Push real-time notification to the driver
    if (bid.driverId) {
      await addDoc(collection(db, "user_notifications"), {
        userId: bid.driverId,
        title: "Bid Accepted!",
        message: `Your bid was accepted for a ${selectedRequest.category} request to ${selectedRequest.destinationCity || "the passenger's destination"}.`,
        createdAt: Date.now(),
        link: "/driver/dashboard"
      });
    }

    setSelectedRequest(null);
    await loadRequests();
  };

  const inputStyle = "w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl";

  return (
    <div className="min-h-screen p-3 pb-16 md:p-12 relative overflow-hidden">
      <div className="max-w-3xl mx-auto z-10 relative">
        <button
          onClick={() => router.back()}
          className="p-2 md:p-3 mb-6 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        <div className="w-full">
          <div className="flex items-center justify-between gap-3 mb-1 md:mb-2">
            <h1 className="text-xl md:text-3xl font-bold leading-tight">Job Request (Bid)</h1>
            <button
              onClick={() => setShowInfoModal(true)}
              className="shrink-0 text-brand-primary font-bold text-[10px] md:text-sm hover:underline whitespace-nowrap"
            >
              Learn how to create bids
            </button>
          </div>
          <p className="text-xs md:text-base text-foreground/70 mb-5">
            Manage your job requests or create a new one.
          </p>

          <div className="flex gap-2 mb-4 md:mb-6 bg-card-bg p-1 rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] border border-transparent dark:border-white/10">
            <button
              onClick={() => setActiveTab("post")}
              className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all ${activeTab === "post" ? "bg-brand-primary text-white shadow-md" : "text-foreground/70 hover:text-foreground"}`}
            >
              Post Request
            </button>
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all ${activeTab === "browse" ? "bg-brand-primary text-white shadow-md" : "text-foreground/70 hover:text-foreground"}`}
            >
              Browse Requests
            </button>
          </div>

          <p className="text-[10px] md:text-xs text-foreground/60 mb-4 font-medium px-1">
            Requests used this month: <span className="text-brand-primary font-bold">{quotaUsed}/{requestLimit}</span>
          </p>

          {activeTab === "post" && (
            <div className="bg-card-bg/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 space-y-4 shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] border border-transparent dark:border-white/10">
              <h2 className="font-bold text-lg">{editingId ? "Edit Request" : "Post a new request"}</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputStyle}>
                  <option value="motorbike">Dispatch Rider</option>
                  <option value="keke">Keke (Tricycle)</option>
                  <option value="car">Car</option>
                  <option value="bus">Bus</option>
                  <option value="mini van">Mini Van</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" min={today} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Budget (₦)</label>
                <input
                  type="text"
                  placeholder="E.g. 5,000"
                  value={form.budget ? Number(form.budget).toLocaleString() : ""}
                  onChange={(e) => setForm({ ...form, budget: e.target.value.replace(/\D/g, "") })}
                  className={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current City</label>
                  <input placeholder="E.g. Ikeja" value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current State</label>
                  <input placeholder="E.g. Lagos" value={form.currentState} onChange={(e) => setForm({ ...form, currentState: e.target.value })} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Destination City</label>
                  <input placeholder="E.g. Lekki" value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Destination State</label>
                  <input placeholder="E.g. Lagos" value={form.destinationState} onChange={(e) => setForm({ ...form, destinationState: e.target.value })} className={inputStyle} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer w-max">
                <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary" />
                <span className="font-medium">Urgent request</span>
              </label>

              <p className="text-xs text-foreground/60 py-2 border-t border-card-border mt-2">Your request stays open for {durationLabel}.</p>

              <button
                onClick={createRequest}
                disabled={saving || !form.currentCity || !form.currentState || !form.budget || !form.startDate || !form.endDate || !form.destinationCity || !form.destinationState || form.startDate < today || form.endDate < form.startDate}
                className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold shadow-lg hover:shadow-brand-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {editingId ? "UPDATE REQUEST" : (quotaUsed >= requestLimit ? "UPGRADE VIP TO POST" : "POST REQUEST")}
              </button>
            </div>
          )}

          {activeTab === "browse" && (
            <div className="mb-6">
              <h2 className="font-bold text-lg mb-4">My Requests</h2>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-card-bg/50 border border-dashed border-card-border rounded-xl">
                  <p className="text-foreground/50 font-medium">No created requests found</p>
                  <button onClick={() => setActiveTab("post")} className="mt-4 text-brand-primary text-sm font-bold hover:underline">Create your first request</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {requests.map((request) => {
                    const expired = isExpired(request);
                    const taken = request.status === "assigned";
                    return (
                      <div key={request.id} className={`border rounded-xl p-4 transition-all hover:shadow-md ${expired || taken ? "opacity-60 grayscale border-card-border bg-card-bg/30" : "border-brand-primary/30 bg-card-bg/50"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <b className="capitalize text-lg">{request.category}</b>
                            {request.urgent && <span className="ml-2 text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Urgent</span>}
                          </div>
                          <span className="font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-md text-sm">₦{Number(request.budget).toLocaleString()}</span>
                        </div>

                        <div className="space-y-1 mt-3">
                          <p className="text-xs flex items-center gap-2 capitalize"><span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span> {request.currentCity} {request.currentState}</p>
                          {request.destinationCity && (
                            <>
                              <p className="text-[10px] font-black text-foreground/50 italic ml-10">to</p>
                              <p className="text-xs flex items-center gap-2 capitalize"><span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span> {request.destinationCity} {request.destinationState}</p>
                            </>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-card-border flex items-center justify-between">
                          <p className={`text-[10px] font-medium flex items-center gap-1 ${expired ? 'text-red-500' : taken ? 'text-green-500' : 'text-brand-primary'}`}>
                            <Clock3 className="w-3.5 h-3.5" />
                            {taken ? "Driver selected" : expired ? "Expired" : `${Math.max(0, Math.ceil((Number(request.expiresAt) - Date.now()) / 86400000))} days left`}
                          </p>

                          <div className="flex gap-2">
                            {!expired && !taken && (
                              <button onClick={() => openBidders(request)} className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-primary/90">
                                View Bids ({request.bidCount || 0})
                              </button>
                            )}
                            {!expired && !taken && (
                              <button onClick={() => {
                                setForm({
                                  category: request.category,
                                  startDate: request.startDate || "",
                                  endDate: request.endDate || "",
                                  budget: request.budget ? request.budget.toString() : "",
                                  currentCity: request.currentCity,
                                  currentState: request.currentState,
                                  destinationCity: request.destinationCity || "",
                                  destinationState: request.destinationState || "",
                                  urgent: request.urgent || false
                                });
                                setEditingId(request.id);
                                setActiveTab("post");
                              }} className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={async () => { await deleteDoc(doc(db, "requests", request.id)); await loadRequests(); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200 p-6 relative">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-xl flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
              <Info className="w-6 h-6 text-brand-primary" /> How Bidding Works
            </h3>
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>Your VIP tier determines how many requests you can create. Non-VIP users get 1 free request per month.</li>
              <li>Requests remain active for two weeks before automatically expiring.</li>
              <li>If you delete your own bid, or if it expires without a driver being chosen, the bid limit is not returned to you.</li>
              <li>Report drivers who disappoint, behave maliciously, or break the service rules from their profile or chat.</li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-card-border rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-background pt-1 pb-3 border-b border-card-border z-10">
              <h2 className="font-bold text-lg">Drivers who bid</h2>
              <button onClick={() => setSelectedRequest(null)} className="p-1.5 hover:bg-card-bg rounded-full"><X className="w-5 h-5" /></button>
            </div>

            {bidders.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">No drivers have bid yet.</p>
            ) : (
              <div className="space-y-3">
                {bidders.map((bid) => (
                  <div key={bid.id} className="border border-card-border rounded-xl p-4 bg-card-bg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <b className="block text-base">{bid.driverName}</b>
                        <p className="text-xs text-foreground/60">{bid.vehicleDetails?.make} {bid.vehicleDetails?.model}</p>
                      </div>
                      <span className="font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded text-sm">₦{Number(bid.amount).toLocaleString()}</span>
                    </div>

                    <p className="text-sm mt-2">{bid.driverPhone || "Phone unavailable"}</p>

                    <div className="flex gap-2 mt-3">
                      <a href={`tel:${bid.driverPhone || ""}`} className="flex-1 text-center py-2 rounded-lg border border-card-border text-xs font-medium hover:bg-foreground/5">Call</a>
                      {bid.driverPhone && (
                        <a href={`https://wa.me/${bid.driverPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 rounded-lg border border-green-500 text-green-600 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-950">WhatsApp</a>
                      )}
                      <button onClick={() => router.push(`/driver/profile/${bid.driverId}`)} className="flex-1 py-2 rounded-lg border border-card-border text-xs font-medium hover:bg-foreground/5">Profile</button>
                    </div>

                    <button onClick={() => setDriverToConfirm(bid)} className="mt-3 w-full py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold shadow hover:shadow-md transition-shadow">Select this driver</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {driverToConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="font-bold text-lg mb-2">Confirm selection</h2>
            <p className="text-sm text-foreground/70 mb-6">You are about to select <b className="text-foreground">{driverToConfirm.driverName}</b> for your request. You cannot change this after confirming.</p>
            <div className="flex gap-3">
              <button onClick={() => setDriverToConfirm(null)} className="flex-1 py-3 rounded-xl border border-card-border font-medium hover:bg-card-bg">Cancel</button>
              <button onClick={() => { const bid = driverToConfirm; setDriverToConfirm(null); selectDriver(bid); }} className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold shadow-lg hover:shadow-brand-primary/30">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
