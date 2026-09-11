"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, X, Loader2, CheckCircle2, Clock3, Search, Car, MapPin, Navigation } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, doc, addDoc, getDoc, getDocs, query, where, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useVIPLimits } from "@/hooks/useVIPLimits";

export default function BidForJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterCategory = searchParams.get("category")?.toLowerCase() || null;
  const { user, profile, loading: authLoading } = useAuth();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [amount, setAmount] = useState("");
  const [bidCount, setBidCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [requestDurationDays, setRequestDurationDays] = useState(14);
  const [locationQuery, setLocationQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const { limits } = useVIPLimits(profile?.vipStars || 0);

  const loadJobs = async () => {
    if (!user) return;
    const [requestSnap, vehicleSnap, pricingSnap] = await Promise.all([
      getDocs(collection(db, "requests")),
      getDocs(query(collection(db, "vehicles"), where("driverId", "==", user.uid))),
      getDoc(doc(db, "adminSettings", "pricing"))
    ]);
    setRequestDurationDays(Number(pricingSnap.data()?.requestDurationDays || 14));
    const now = Date.now();
    setRequests(requestSnap.docs.map((item: any): any => ({ id: item.id, ...item.data() })).filter((item: any) => {
      if (item.passengerId === user.uid) return false;
      if (item.status !== "open" && item.status !== "assigned") return false;
      if (Number(item.expiresAt) <= now) return false;
      if (filterCategory && (item.category || "").toLowerCase() !== filterCategory) return false;
      return true;
    }));
    setVehicles(vehicleSnap.docs.map((item: any): any => ({ id: item.id, ...item.data() })).filter((item: any) => item.isApproved));
    const bidCounts = await Promise.all(requestSnap.docs.map(async (requestDoc: any): Promise<number> => {
      const bid = await getDocs(query(collection(db, "requests", requestDoc.id, "bids"), where("driverId", "==", user.uid)));
      return bid.empty ? 0 : 1;
    }));
    setBidCount(bidCounts.reduce<number>((total: number, count: number) => total + Number(count), 0));
    setLoading(false);
  };

  useEffect(() => { if (!authLoading && user) loadJobs(); }, [authLoading, user]);

  const submitBid = async () => {
    if (!user || !selectedRequest || !selectedVehicle || !amount || bidCount >= limits.dailyBids) return;
    setSubmitting(true);
    try {
      const vehicle = vehicles.find((item) => item.id === selectedVehicle);
      const requestRef = doc(db, "requests", selectedRequest.id);
      const bidRef = doc(db, "requests", selectedRequest.id, "bids", user.uid);
      await runTransaction(db, async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);
        const bidSnapshot = await transaction.get(bidRef);
        if (!requestSnapshot.exists() || requestSnapshot.data().status !== "open") throw new Error("This request is no longer available.");
        if (bidSnapshot.exists()) throw new Error("You have already bid on this request.");
        const numericAmount = Number(String(amount).replace(/,/g, ''));
        transaction.set(bidRef, { driverId: user.uid, driverName: profile?.username || profile?.firstName || "Driver", driverPhone: profile?.phone || "", vehicleId: vehicle.id, vehicleDetails: vehicle.details, amount: numericAmount, createdAt: Date.now(), status: "pending" });
        transaction.update(requestRef, { bidCount: Number(requestSnapshot.data().bidCount || 0) + 1 });
      });

      // Notify the passenger
      if (selectedRequest.passengerId) {
        const numericAmount = Number(String(amount).replace(/,/g, ''));
        await addDoc(collection(db, "user_notifications"), {
          userId: selectedRequest.passengerId,
          title: "New Bid Received",
          message: `${profile?.username || profile?.firstName || "A driver"} placed a bid of ₦${numericAmount.toLocaleString()} on your ${selectedRequest.category} request.`,
          createdAt: Date.now(),
          link: "/passenger/create-bid"
        });
      }

      setSelectedRequest(null);
      setSelectedVehicle("");
      setAmount("");
      await loadJobs();
      toast.success("Your bid was sent to the passenger successfully!");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen p-3 md:p-12 relative overflow-hidden">
      <div className="max-w-3xl mx-auto z-10 relative">

        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>

          <button
            onClick={() => setShowInfoModal(true)}
            className="text-blue-500 font-bold text-sm hover:underline block"
          >
            Learn how to find bids
          </button>
        </div>

        <div className="w-full">
          <h1 className="text-xl md:text-3xl font-bold capitalize">Bid for Jobs {filterCategory ? `(${filterCategory})` : ''}</h1>
          <p className="text-xs md:text-sm text-foreground/70 mb-5">
            Browse active passenger requests and place your bids to win the job.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Pickup location (e.g., Ikeja, Lagos)" 
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Destination (e.g., Abuja)" 
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4"><span className="text-sm font-bold text-slate-800 dark:text-slate-200">Available requests</span><span className="text-xs text-brand-secondary font-medium px-3 py-1 bg-brand-secondary/10 rounded-full">{bidCount}/{limits.dailyBids} bids used</span></div>
          {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-secondary" /> : requests.filter(request => {
            const lQ = locationQuery.toLowerCase();
            const dQ = destinationQuery.toLowerCase();
            const cCity = (request.currentCity || "").toLowerCase();
            const cState = (request.currentState || "").toLowerCase();
            const dCity = (request.destinationCity || "").toLowerCase();
            const dState = (request.destinationState || "").toLowerCase();
            const matchesLoc = lQ === "" || cCity.includes(lQ) || cState.includes(lQ);
            const matchesDest = dQ === "" || dCity.includes(dQ) || dState.includes(dQ);
            return matchesLoc && matchesDest;
          }).length === 0 ? <div className="text-center py-16 bg-card-bg/50 border-2 border-dashed border-card-border rounded-2xl"><div className="w-16 h-16 bg-card-border rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-foreground/30" /></div><p className="text-foreground/50 font-medium text-lg">No active jobs found</p><p className="text-xs text-foreground/40 mt-1 max-w-xs mx-auto">Try adjusting your location filters or check back later for new requests.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">{requests.filter(request => {
            const lQ = locationQuery.toLowerCase();
            const dQ = destinationQuery.toLowerCase();
            const cCity = (request.currentCity || "").toLowerCase();
            const cState = (request.currentState || "").toLowerCase();
            const dCity = (request.destinationCity || "").toLowerCase();
            const dState = (request.destinationState || "").toLowerCase();
            const matchesLoc = lQ === "" || cCity.includes(lQ) || cState.includes(lQ);
            const matchesDest = dQ === "" || dCity.includes(dQ) || dState.includes(dQ);
            return matchesLoc && matchesDest;
          }).map((request) => <button key={request.id} disabled={request.status !== "open" || bidCount >= limits.dailyBids} onClick={() => { setSelectedRequest(request); setAmount(Number(request.budget).toLocaleString()); setSelectedVehicle(""); }} className={`text-left rounded-xl md:rounded-2xl p-4 md:p-5 transition-all duration-300 relative overflow-hidden group ${request.status !== "open" || bidCount >= limits.dailyBids ? "bg-card-bg border border-card-border opacity-60 grayscale cursor-not-allowed" : "bg-gradient-to-br from-brand-secondary/10 to-brand-primary/5 border border-brand-secondary/50 shadow-lg shadow-brand-secondary/20 hover:bg-brand-secondary/5 hover:border-brand-secondary hover:shadow-2xl hover:shadow-brand-secondary/40 hover:-translate-y-1.5"}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/15 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand-secondary/30 transition-colors duration-300"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <span className="inline-block px-2.5 py-1 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider text-brand-secondary mb-2 border border-brand-secondary/10">{request.category}</span>
              </div>
              <div className="text-right">
                <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white">₦{Number(request.budget).toLocaleString()}</span>
                <p className="text-[9px] text-foreground/50">Passenger budget</p>
              </div>
            </div>
            
            <div className="relative z-10 my-2">
              <p className="text-sm font-normal text-slate-800 dark:text-slate-200 capitalize">
                {request.currentCity}{request.currentState ? `, ${request.currentState}` : ''} 
                {request.destinationCity && (
                  <>
                    <span className="text-brand-secondary mx-2 font-black">to</span> 
                    {request.destinationCity}{request.destinationState ? `, ${request.destinationState}` : ''}
                  </>
                )}
              </p>
            </div>
            
            <div className="mt-3 pt-3 border-t border-brand-secondary/10 flex items-center justify-between relative z-10">
              <p className="text-[10px] md:text-xs font-medium flex items-center gap-1.5 text-brand-secondary bg-white/50 dark:bg-black/30 px-2 py-1 rounded-md backdrop-blur-sm">
                <Clock3 className="w-3.5 h-3.5" />
                {request.status === "assigned" ? "Driver selected" : `${Math.max(0, Math.ceil((Number(request.expiresAt) - Date.now()) / 86400000))} days left to bid`}
              </p>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                <ArrowLeft className="w-4 h-4 text-brand-secondary rotate-180" />
              </div>
            </div>
          </button>)}</div>}

        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedRequest(null)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="mb-6 pr-8">
              <h2 className="font-extrabold text-2xl text-slate-900 dark:text-white capitalize mb-1">Bid for {selectedRequest.category}</h2>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 flex-wrap capitalize">
                <span className="text-brand-primary">{selectedRequest.currentCity}{selectedRequest.currentState ? `, ${selectedRequest.currentState}` : ''}</span> 
                <ArrowLeft className="w-3 h-3 rotate-180 text-slate-400" /> 
                <span className="text-brand-secondary">{selectedRequest.destinationCity ? `${selectedRequest.destinationCity}${selectedRequest.destinationState ? `, ${selectedRequest.destinationState}` : ''}` : "Any Destination"}</span>
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">Select your {selectedRequest.category}</label>
              {(() => {
                const matchingVehicles = vehicles.filter((v) => (v.category || "").toLowerCase() === (selectedRequest.category || "").toLowerCase());
                if (matchingVehicles.length === 0) {
                  return (
                    <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-center">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Car className="w-6 h-6 text-red-500" />
                      </div>
                      <p className="text-red-600 dark:text-red-400 font-bold text-sm mb-1">No {selectedRequest.category} Found</p>
                      <p className="text-red-500/70 text-xs">You don't have an approved vehicle in this category to bid on this request.</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {matchingVehicles.map((vehicle) => (
                      <button 
                        key={vehicle.id}
                        onClick={() => setSelectedVehicle(vehicle.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 border-2 text-left ${selectedVehicle === vehicle.id ? 'border-brand-secondary bg-brand-secondary/5 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-brand-secondary/30'}`}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                          {vehicle.images?.front ? <img src={vehicle.images.front} className="w-full h-full object-cover" /> : <Car className="w-5 h-5 m-3 opacity-30 text-slate-500"/>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{vehicle.details?.make} {vehicle.details?.model}</p>
                          <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">{vehicle.details?.year} • {vehicle.details?.color || "Standard"}</p>
                        </div>
                        <div className="shrink-0">
                          {selectedVehicle === vehicle.id ? (
                            <CheckCircle2 className="w-6 h-6 text-brand-secondary" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Your Bid Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₦</span>
                <input 
                  type="text" 
                  value={amount} 
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(rawValue))) {
                      setAmount(rawValue === '' ? '' : Number(rawValue).toLocaleString());
                    }
                  }} 
                  placeholder="Enter amount" 
                  className="w-full pl-8 pr-4 py-3 md:py-4 text-lg font-bold rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all" 
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Passenger proposed: <b className="text-slate-800 dark:text-slate-200">₦{Number(selectedRequest.budget).toLocaleString()}</b></span>
                <button onClick={() => setAmount(Number(selectedRequest.budget).toLocaleString())} className="text-[10px] font-bold text-brand-primary px-3 py-1.5 bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors">Match budget</button>
              </div>
            </div>
            
            <button 
              disabled={submitting || bidCount >= limits.dailyBids || !selectedVehicle} 
              onClick={() => setShowBidConfirm(true)} 
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl hover:-translate-y-1 ${!selectedVehicle ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 shadow-none hover:translate-y-0 cursor-not-allowed' : 'bg-brand-secondary text-white shadow-brand-secondary/30 hover:bg-brand-secondary/90'}`}
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : bidCount >= limits.dailyBids ? "Bid limit reached" : "Submit Proposal"}
            </button>
          </div>
        </div>
      )}

      {showBidConfirm && <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-background border border-card-border rounded-2xl p-6 max-w-sm w-full"><h2 className="font-bold text-lg mb-2">Confirm your bid</h2><p className="text-sm text-foreground/70 mb-5">Submitting this bid uses one of your available driver bids.</p><div className="flex gap-3"><button onClick={() => setShowBidConfirm(false)} className="flex-1 py-2 rounded-xl border border-card-border">Cancel</button><button onClick={() => { setShowBidConfirm(false); submitBid(); }} className="flex-1 py-2 rounded-xl bg-brand-secondary text-white font-bold">Confirm bid</button></div></div></div>}

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
              <Info className="w-6 h-6 text-brand-secondary" /> How Bidding Works
            </h3>
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>Placing a bid consumes one of your available bids. Non-VIP drivers receive 1 free bid per month.</li>
              <li>Bids reset completely at the start of each month (they do not roll over).</li>
              <li>Requests remain available for {requestDurationDays === 1 ? "1 week" : `${Math.ceil(requestDurationDays / 7)} weeks`} unless they expire or a driver is selected.</li>
              <li>If a passenger deletes a job request you bid on, your bid count is returned to you.</li>
              <li>Report passengers who disappoint, behave maliciously, or break the service rules using the report button in your chat.</li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2 bg-brand-secondary text-white font-bold rounded-xl hover:bg-brand-secondary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
