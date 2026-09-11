"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, X, Loader2, Trash2, Clock3, Edit2, Star, Crown } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc, getDoc, increment } from "firebase/firestore";
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
  const [editingBidCount, setEditingBidCount] = useState<number>(0);
  const isLocked = !!editingId && editingBidCount > 0;
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadRequests = async () => {
    if (!user) return;
    const [pricingSnap, requestSnap] = await Promise.all([
      getDoc(doc(db, "adminSettings", "pricing")),
      getDocs(query(collection(db, "requests"), where("passengerId", "==", user.uid)))
    ]);
    const pData = pricingSnap.data();
    let duration = Number(pData?.requestDurationDays ?? 14);
    if (profile?.vipStars === 4) {
      duration = Number(pData?.vip4RequestDurationDays ?? 21);
    } else if (profile?.vipStars === 5) {
      duration = Number(pData?.vip5RequestDurationDays ?? 30);
    }
    setRequestDurationDays(duration);
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
          passengerVipStars: profile?.vipStars || 0,
          status: "open",
          bidCount: 0,
          createdAt: now,
          expiresAt: now + requestDurationDays * 24 * 60 * 60 * 1000
        });
        toast.success("Request created successfully!");
      }

      setEditingId(null);
      setEditingBidCount(0);
      setForm({ category: "car", startDate: "", endDate: "", budget: "", currentCity: "", currentState: "", destinationCity: "", destinationState: "", urgent: false });
      setEditingId(null);
      await loadRequests();
      setActiveTab("browse");
    } finally { setSaving(false); }
  };

  const isExpired = (request: any) => Number(request.expiresAt) <= Date.now();
  const durationLabel = `${requestDurationDays} ${requestDurationDays === 1 ? 'day' : 'days'}`;

  const openBidders = async (request: any) => {
    const snapshot = await getDocs(collection(db, "requests", request.id, "bids"));
    const biddersData: any[] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

    // Fetch driver profiles to get latest jobsWon count
    for (let bid of biddersData) {
      if (bid.driverId) {
        const driverSnap = await getDoc(doc(db, "users", bid.driverId));
        if (driverSnap.exists()) {
          bid.jobsWon = driverSnap.data().jobsWon || 0;
        }
      }
    }

    // Sort: 1. VIP Level (Desc) -> 2. Driver Level (Desc) -> 3. Price (Asc)
    const sortedBidders = biddersData.sort((a: any, b: any) => {
      const vipA = a.driverVipStars || 0;
      const vipB = b.driverVipStars || 0;
      if (vipA !== vipB) return vipB - vipA;

      const levelA = Math.floor((a.jobsWon || 0) / 2);
      const levelB = Math.floor((b.jobsWon || 0) / 2);
      if (levelA !== levelB) return levelB - levelA;

      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;
      return amtA - amtB;
    });

    setBidders(sortedBidders);
    setSelectedRequest(request);
  };

  const selectDriver = async (bid: any) => {
    if (!selectedRequest) return;

    if (bid.vehicleId) {
      const vSnap = await getDoc(doc(db, "vehicles", bid.vehicleId));
      if (vSnap.exists() && vSnap.data().isApproved === false) {
        toast.error("This driver's vehicle is currently under security review and cannot be booked right now.");
        return;
      }
    }

    await updateDoc(doc(db, "requests", selectedRequest.id), { status: "assigned", selectedDriverId: bid.driverId, selectedBidId: bid.id, selectedDriverName: bid.driverName });

    // Notify passenger locally
    addNotification("Driver selected", `${bid.driverName} was selected for your ${selectedRequest.category} request.`, "/passenger/create-bid");

    if (bid.driverId) {
      // Update driver's jobs won count
      await updateDoc(doc(db, "users", bid.driverId), { jobsWon: increment(1) });

      // Push real-time notification to the driver
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
                <select disabled={isLocked} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inputStyle} ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}>
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
                  <input type="date" min={today} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`${inputStyle} ${form.startDate && form.startDate < today ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`} />
                  {form.startDate && form.startDate < today && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium leading-tight">Date cannot be in the past.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputStyle} ${form.endDate && (form.endDate < (form.startDate || today)) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`} />
                  {form.endDate && form.startDate && form.endDate < form.startDate && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium leading-tight">Must be after start date.</p>
                  )}
                  {form.endDate && !form.startDate && form.endDate < today && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium leading-tight">Date cannot be in the past.</p>
                  )}
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
                  <input disabled={isLocked} placeholder="E.g. Ikeja" value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} className={`${inputStyle} ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current State</label>
                  <input disabled={isLocked} placeholder="E.g. Lagos" value={form.currentState} onChange={(e) => setForm({ ...form, currentState: e.target.value })} className={`${inputStyle} ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Destination City</label>
                  <input disabled={isLocked} placeholder="E.g. Lekki" value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} className={`${inputStyle} ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Destination State</label>
                  <input disabled={isLocked} placeholder="E.g. Lagos" value={form.destinationState} onChange={(e) => setForm({ ...form, destinationState: e.target.value })} className={`${inputStyle} ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer w-max">
                <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary" />
                <span className="font-medium">Urgent request</span>
              </label>

              <p className="text-xs text-foreground/60 py-2 border-t border-card-border mt-2">Your request stays open for {durationLabel}.</p>

              <button
                onClick={() => {
                  if (!editingId && quotaUsed < requestLimit) {
                    setShowRequestConfirm(true);
                  } else {
                    createRequest();
                  }
                }}
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
                <div className="px-5 md:px-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {requests.map((request) => {
                    const expired = isExpired(request);
                    const taken = request.status === "assigned";
                    return (
                      <div key={request.id} onClick={() => !expired && !taken && openBidders(request)} className={`cursor-pointer text-left rounded-xl md:rounded-2xl p-2.5 md:p-5 transition-all duration-300 transform relative overflow-hidden group ${taken ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-60 grayscale-[60%] cursor-default" : expired ? "bg-card-bg border border-card-border opacity-60 grayscale cursor-default" : "bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 border border-brand-primary/50 shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/5 hover:border-brand-primary hover:shadow-2xl hover:shadow-brand-primary/40 hover:-translate-y-1.5"}`}>

                        <div className="absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-brand-primary/15 rounded-full blur-xl md:blur-2xl -mr-6 -mt-6 md:-mr-10 md:-mt-10 group-hover:bg-brand-primary/30 transition-colors duration-300 pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-2 md:mb-4 relative z-10">
                          <div>
                            <span className="inline-block px-1.5 py-0.5 md:px-2.5 md:py-1 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1 md:mb-2 border border-brand-primary/10">{request.category}</span>
                            {request.urgent && <span className="inline-block ml-2 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-red-100 dark:bg-red-900/30 backdrop-blur-md rounded md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1 md:mb-2 border border-red-500/20">Urgent</span>}
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] md:text-base font-bold text-slate-900 dark:text-white">₦{Number(request.budget).toLocaleString()}</span>
                            <p className="text-[7px] md:text-[9px] text-foreground/50 leading-none mt-0.5">Your budget</p>
                          </div>
                        </div>

                        <div className="relative z-10 my-1 md:my-2">
                          <p className="text-[10px] md:text-sm font-normal text-slate-800 dark:text-slate-200 leading-tight">
                            <span className="capitalize">{request.currentCity}{request.currentState ? `, ${request.currentState}` : ''}</span>
                            {request.destinationCity && (
                              <span className="block mt-0.5 md:inline md:mt-0">
                                <span className="text-brand-primary mx-1 md:mx-2 font-black lowercase">to</span>
                                <span className="capitalize">{request.destinationCity}{request.destinationState ? `, ${request.destinationState}` : ''}</span>
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-brand-primary/10 flex items-center justify-between relative z-10">
                          <p className={`text-[8px] md:text-[10px] font-medium flex items-center gap-1 md:gap-1.5 bg-white/50 dark:bg-black/30 px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm ${expired ? 'text-red-500' : taken ? 'text-green-500' : 'text-brand-primary'}`}>
                            <Clock3 className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                            {taken ? "Driver selected" : expired ? "Expired" : `${Math.max(0, Math.ceil((Number(request.expiresAt) - Date.now()) / 86400000))} days left`}
                          </p>

                          <div className="flex gap-2">
                            {!expired && !taken && (
                              <button onClick={(e) => { e.stopPropagation(); openBidders(request); }} className="text-[9px] md:text-xs bg-brand-primary text-white px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium hover:bg-brand-primary/90 shadow-sm transition-all hover:scale-105 active:scale-95">
                                View Bids ({request.bidCount || 0})
                              </button>
                            )}
                            {!expired && !taken && (
                              <button onClick={(e) => {
                                e.stopPropagation();
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
                                setEditingBidCount(request.bidCount || 0);
                                setActiveTab("post");
                              }} className="p-1 md:p-1.5 text-brand-primary bg-white/50 dark:bg-black/30 hover:bg-brand-primary/10 rounded-md transition-colors backdrop-blur-sm">
                                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            )}
                            <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, "requests", request.id)); await loadRequests(); }} className="p-1 md:p-1.5 text-red-500 bg-white/50 dark:bg-black/30 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors backdrop-blur-sm">
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

      {showRequestConfirm &&
        <div className="px-6 fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 md:p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-center font-bold text-base md:text-lg mb-1.5 md:mb-2 text-slate-900 dark:text-white">Confirm your request</h2>
            <p className="text-center text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-4 md:mb-5">Submitting this request uses one of your available bids.</p>
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => setShowRequestConfirm(false)} className="flex-1 py-1.5 px-3 md:py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={() => { setShowRequestConfirm(false); createRequest(); }} className="flex-1 py-1.5 px-3 md:py-2 text-sm rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/30 hover:bg-brand-primary/90 transition-all hover:-translate-y-0.5">Confirm bid</button>
            </div>
          </div>
        </div>}

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
              <li>Requests remain active for {requestDurationDays} {requestDurationDays === 1 ? 'day' : 'days'} before automatically expiring.</li>
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
                        <div className="flex items-center gap-2">
                          <b className="block text-base">{bid.driverName}</b>
                          {bid.driverVipStars === 4 && (
                            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider shadow-sm uppercase whitespace-nowrap">
                              VIP 4
                            </span>
                          )}
                          {bid.driverVipStars >= 5 && (
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider shadow-sm uppercase whitespace-nowrap flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> VIP {bid.driverVipStars}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 ${i < Math.min(5, Math.floor((bid.jobsWon || 0) / 2)) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`} />
                            ))}
                          </div>
                          <span className="text-foreground/50 text-[10px]">• {bid.jobsWon || 0} jobs won</span>
                        </div>
                        <p className="text-xs text-foreground/60">{bid.vehicleDetails?.make} {bid.vehicleDetails?.model}</p>
                      </div>
                      <span className="font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded text-sm">₦{Number(bid.amount).toLocaleString()}</span>
                    </div>
                    {bid.description && (
                      <div className="mt-3 p-3 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                        <p className="text-xs font-bold text-brand-primary mb-1">Driver Note:</p>
                        <p className="text-sm text-foreground/80 italic">{bid.description}</p>
                      </div>
                    )}
                    <p className="text-sm mt-3">{bid.driverPhone || "Phone unavailable"}</p>

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
