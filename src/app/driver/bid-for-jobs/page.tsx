"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, X, Loader2, CheckCircle2, Clock3, Search, Car, MapPin, Navigation, Crown, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, doc, addDoc, getDoc, getDocs, query, where, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useVIPLimits } from "@/hooks/useVIPLimits";
import ChatOverlay from "@/components/ChatOverlay";

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
  const [bidDescription, setBidDescription] = useState("");
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [bidCount, setBidCount] = useState(0);
  const [appliedRequests, setAppliedRequests] = useState<Map<string, any>>(new Map());
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
    setRequestDurationDays(Number(pricingSnap.data()?.requestDurationDays ?? 14));
    const now = Date.now();
    setRequests(requestSnap.docs.map((item: any): any => ({ id: item.id, ...item.data() })).filter((item: any) => {
      if (item.passengerId === user.uid) return false;
      if (item.status !== "open" && item.status !== "assigned") return false;
      if (Number(item.expiresAt) <= now) return false;
      if (filterCategory && (item.category || "").toLowerCase() !== filterCategory) return false;
      return true;
    }));
    setVehicles(vehicleSnap.docs.map((item: any): any => ({ id: item.id, ...item.data() })).filter((item: any) => item.isApproved));
    const applied = new Map<string, any>();
    const bidCounts = await Promise.all(requestSnap.docs.map(async (requestDoc: any): Promise<number> => {
      const bid = await getDocs(query(collection(db, "requests", requestDoc.id, "bids"), where("driverId", "==", user.uid)));
      if (!bid.empty) applied.set(requestDoc.id, { id: bid.docs[0].id, ...bid.docs[0].data() });
      return bid.empty ? 0 : 1;
    }));
    setAppliedRequests(applied);
    setBidCount(bidCounts.reduce<number>((total: number, count: number) => total + Number(count), 0));
    setLoading(false);
  };

  const [assignedBidInfo, setAssignedBidInfo] = useState<any>(null);
  const [chatOverlayData, setChatOverlayData] = useState<any>(null);

  const openAssignedBid = async (request: any, bid: any) => {
    setAssignedBidInfo({ loading: true });
    try {
      const passengerDoc = await getDoc(doc(db, "users", request.passengerId));
      let passengerPhone = "";
      let passengerWhatsapp = false;
      if (passengerDoc.exists()) {
        passengerPhone = passengerDoc.data().phone || "";
        passengerWhatsapp = passengerDoc.data().whatsappEnabled ?? false;
      }
      
      if (bid.vehicleId) {
        const vSnap = await getDoc(doc(db, "vehicles", bid.vehicleId));
        if (vSnap.exists()) {
           const vData = vSnap.data();
           bid.vehicleImages = vData.images || null;
           bid.vehicleDocuments = vData.documents || null;
           if (vData.details) {
             bid.vehicleDetails = vData.details;
           }
        }
      }

      setAssignedBidInfo({ loading: false, request, bid, passengerPhone, passengerWhatsapp });
    } catch(e) {
      console.error(e);
      setAssignedBidInfo(null);
    }
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
        const bidData: any = {
          driverId: user.uid,
          driverName: profile?.username || profile?.firstName || "Driver",
          driverPhone: profile?.phone || "",
          vehicleId: vehicle.id,
          vehicleDetails: vehicle.details,
          vehicleImages: vehicle.images || null,
          amount: numericAmount,
          createdAt: Date.now(),
          status: "pending",
          driverVipStars: profile?.vipStars || 0
        };
        if (bidDescription.trim()) {
          bidData.description = bidDescription.trim();
        }
        transaction.set(bidRef, bidData);
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
          link: `/passenger/create-bid?tab=browse&highlight=${selectedRequest.id}`
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

          <div className="flex flex-row gap-2 md:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 w-3.5 h-3.5 md:w-4 md:h-4 md:left-3" />
              <input
                type="text"
                placeholder="Pickup (e.g. Ikeja)"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 md:pl-9 md:pr-4 md:py-2 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg md:rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 w-3.5 h-3.5 md:w-4 md:h-4 md:left-3" />
              <input
                type="text"
                placeholder="Dropoff (e.g. Abuja)"
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 md:pl-9 md:pr-4 md:py-2 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg md:rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm"
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
          }).length === 0 ? <div className="text-center py-16 bg-card-bg/50 border-2 border-dashed border-card-border rounded-2xl"><div className="w-16 h-16 bg-card-border rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-foreground/30" /></div><p className="text-foreground/50 font-medium text-lg">No active jobs found</p><p className="text-xs text-foreground/40 mt-1 max-w-xs mx-auto">Try adjusting your location filters or check back later for new requests.</p></div> : <div className="grid grid-cols-2 gap-2 md:gap-6">{requests.filter(request => {
            const lQ = locationQuery.toLowerCase();
            const dQ = destinationQuery.toLowerCase();
            const cCity = (request.currentCity || "").toLowerCase();
            const cState = (request.currentState || "").toLowerCase();
            const dCity = (request.destinationCity || "").toLowerCase();
            const dState = (request.destinationState || "").toLowerCase();
            const matchesLoc = lQ === "" || cCity.includes(lQ) || cState.includes(lQ);
            const matchesDest = dQ === "" || dCity.includes(dQ) || dState.includes(dQ);
            return matchesLoc && matchesDest;
          }).map((request) => {
            const isApplied = appliedRequests.has(request.id);
            const driverBid = appliedRequests.get(request.id);
            const isAssigned = request.status === "assigned";
            const isWinner = isAssigned && request.selectedDriverId === user?.uid;

            return <button key={request.id} disabled={!isWinner && (isApplied || isAssigned || request.status !== "open" || bidCount >= limits.dailyBids)} onClick={() => {
              if (isWinner) {
                openAssignedBid(request, driverBid);
              } else {
                setSelectedRequest(request); 
                setAmount(Number(request.budget).toLocaleString()); 
                setSelectedVehicle(""); 
                setBidDescription(""); 
                setShowDescriptionInput(false); 
              }
            }} className={`text-left rounded-xl md:rounded-2xl p-2.5 md:p-5 transition-all duration-300 relative overflow-hidden group ${isWinner ? "bg-green-50 dark:bg-green-900/20 border border-green-500/50 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40" : isAssigned ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-60 grayscale-[60%] cursor-not-allowed" : isApplied ? "bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 opacity-70 grayscale-[30%] cursor-not-allowed" : request.status !== "open" || bidCount >= limits.dailyBids ? "bg-card-bg border border-card-border opacity-60 grayscale cursor-not-allowed" : "bg-gradient-to-br from-brand-secondary/10 to-brand-primary/5 border border-brand-secondary/50 shadow-lg shadow-brand-secondary/20 hover:bg-brand-secondary/5 hover:border-brand-secondary hover:shadow-2xl hover:shadow-brand-secondary/40 hover:-translate-y-1.5"}`}>
              {isWinner ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 md:border-4 border-green-500 text-green-500 text-lg md:text-3xl font-black px-3 py-1 md:px-6 md:py-2 rounded-lg md:rounded-xl opacity-40 transform -rotate-12 z-20 pointer-events-none select-none tracking-widest uppercase shadow-sm">
                  WON
                </div>
              ) : isAssigned ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 md:border-4 border-red-500 text-red-500 text-sm md:text-2xl font-black px-2 py-0.5 md:px-4 md:py-1 rounded-lg md:rounded-xl opacity-30 transform -rotate-12 z-20 pointer-events-none select-none tracking-widest uppercase flex items-center justify-center whitespace-nowrap">
                  TAKEN
                </div>
              ) : isApplied ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 md:border-4 border-brand-primary text-brand-primary text-sm md:text-2xl font-black px-2 py-0.5 md:px-4 md:py-1 rounded-lg md:rounded-xl opacity-20 transform -rotate-12 z-20 pointer-events-none select-none tracking-widest uppercase flex items-center justify-center whitespace-nowrap">
                  Applied
                </div>
              ) : null}
              <div className="absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-brand-secondary/15 rounded-full blur-xl md:blur-2xl -mr-6 -mt-6 md:-mr-10 md:-mt-10 group-hover:bg-brand-secondary/30 transition-colors duration-300"></div>
              <div className="flex justify-between items-start mb-2 md:mb-4 relative z-10">
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="inline-block px-1.5 py-0.5 md:px-2.5 md:py-1 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-brand-secondary border border-brand-secondary/10">{request.category}</span>
                  {request.passengerVipStars === 4 && (
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider shadow-sm uppercase whitespace-nowrap">
                      VIP 4 Customer
                    </span>
                  )}
                  {(request.passengerVipStars || 0) >= 5 && (
                    <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider shadow-sm uppercase whitespace-nowrap flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> VIP {request.passengerVipStars} Customer
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[9px] md:text-[10px] text-foreground/60 font-medium mb-0.5">Passenger budget</p>
                  <p className="text-[11px] md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">₦{Number(request.budget).toLocaleString()}</p>
                  
                  {driverBid && driverBid.amount !== Number(request.budget) && (
                    <>
                      <p className="text-[9px] md:text-[10px] text-brand-primary font-bold mb-0.5">Your Proposal:</p>
                      <span className="inline-block font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded text-xs md:text-sm border border-brand-primary/20">
                        ₦{Number(driverBid.amount).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isWinner && driverBid?.vehicleDetails && (
                <div className="relative z-10 mb-2 mt-1 md:mt-2 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-lg p-2 md:p-3">
                  <p className="text-[8px] md:text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Approved Vehicle for this Job</p>
                  <div className="flex items-center gap-2">
                    <Car className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-500" />
                    <span className="text-[10px] md:text-sm font-bold text-green-900 dark:text-green-100 capitalize">
                      {driverBid.vehicleDetails.make} {driverBid.vehicleDetails.model} ({driverBid.vehicleDetails.year})
                    </span>
                  </div>
                </div>
              )}

              <div className="relative z-10 my-1 md:my-2">
                <p className="text-[10px] md:text-sm font-normal text-slate-800 dark:text-slate-200 leading-tight">
                  <span className="capitalize">{request.currentCity}{request.currentState ? `, ${request.currentState}` : ''}</span>
                  {request.destinationCity && (
                    <span className="block mt-0.5 md:inline md:mt-0">
                      <span className="text-brand-secondary mx-1 md:mx-2 font-black lowercase">to</span>
                      <span className="capitalize">{request.destinationCity}{request.destinationState ? `, ${request.destinationState}` : ''}</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-brand-secondary/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <p className="text-[8px] md:text-[10px] font-medium flex items-center gap-1 md:gap-1.5 text-brand-secondary bg-white/50 dark:bg-black/30 px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm">
                    <Clock3 className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    {request.status === "assigned" ? (isWinner ? "You are selected for this job" : "Driver selected") : `${Math.max(0, Math.ceil((Number(request.expiresAt) - Date.now()) / 86400000))} days left`}
                  </p>
                  {(request.bidCount || 0) > 0 && (
                    <p className="text-[8px] md:text-[10px] font-medium flex items-center gap-1 md:gap-1.5 text-brand-primary bg-white/50 dark:bg-black/30 px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm">
                      <Eye className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                      {request.bidCount} {request.bidCount === 1 ? 'Bid' : 'Bids'}
                    </p>
                  )}
                </div>
                <div className="flex w-5 h-5 md:w-8 md:h-8 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm opacity-100 transition-transform transform translate-x-0 group-hover:translate-x-1">
                  <ArrowLeft className="w-2.5 h-2.5 md:w-4 md:h-4 text-brand-secondary rotate-180" />
                </div>
              </div>
            </button>;
          })}
          </div>}
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
                    {matchingVehicles.map((vehicle) => {
                      const isApproved = vehicle.isApproved === true;
                      return (
                      <button
                        key={vehicle.id}
                        disabled={!isApproved}
                        onClick={() => setSelectedVehicle(vehicle.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 border-2 text-left ${!isApproved ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : selectedVehicle === vehicle.id ? 'border-brand-secondary bg-brand-secondary/5 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-brand-secondary/30'}`}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                          {vehicle.images?.front ? <img src={vehicle.images.front} className="w-full h-full object-cover" /> : <Car className="w-5 h-5 m-3 opacity-30 text-slate-500" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{vehicle.details?.make} {vehicle.details?.model}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] text-slate-500 font-medium truncate">{vehicle.details?.year} • {vehicle.details?.color || "Standard"}</p>
                          </div>
                          {!isApproved && (
                            <span className="inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold uppercase tracking-wider">Awaiting Admins Approval</span>
                          )}
                        </div>
                        <div className="shrink-0">
                          {selectedVehicle === vehicle.id ? (
                            <CheckCircle2 className="w-6 h-6 text-brand-secondary" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                          )}
                        </div>
                      </button>
                    )})}
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
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Passenger proposed: <b className="text-slate-800 dark:text-slate-200">₦{Number(selectedRequest.budget).toLocaleString()}</b></span>
                  <button onClick={() => setAmount(Number(selectedRequest.budget).toLocaleString())} className="text-[10px] font-bold text-brand-primary px-3 py-1.5 bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors">Match budget</button>
                </div>
                {!showDescriptionInput ? (
                  <button onClick={() => setShowDescriptionInput(true)} className="text-[10px] font-bold text-brand-secondary text-left hover:underline">Add Description (Optional)</button>
                ) : (
                  <textarea
                    value={bidDescription}
                    onChange={(e) => setBidDescription(e.target.value)}
                    placeholder="Explain condition or reason for your bid..."
                    className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-secondary resize-none"
                    rows={2}
                  />
                )}
              </div>
            </div>

            {selectedRequest?.passengerId === user?.uid && (
              <p className="text-xs text-red-500 font-bold mb-3 text-center">You cannot bid on your own request.</p>
            )}
            <button
              disabled={submitting || bidCount >= limits.dailyBids || !selectedVehicle || selectedRequest?.passengerId === user?.uid}
              onClick={() => setShowBidConfirm(true)}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl hover:-translate-y-1 ${(!selectedVehicle || selectedRequest?.passengerId === user?.uid) ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 shadow-none hover:translate-y-0 cursor-not-allowed' : 'bg-brand-secondary text-white shadow-brand-secondary/30 hover:bg-brand-secondary/90'}`}
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : bidCount >= limits.dailyBids ? "Bid limit reached" : selectedRequest?.passengerId === user?.uid ? "Cannot bid on own request" : "Submit Proposal"}
            </button>
          </div>
        </div>
      )}

      {showBidConfirm &&
        <div className="px-6 fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 md:p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h2 className="text-center font-bold text-base md:text-lg mb-1.5 md:mb-2 text-slate-900 dark:text-white">Confirm your bid</h2>
            <p className="text-center text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-4 md:mb-5">Submitting this bid uses one of your available bids.</p>
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => setShowBidConfirm(false)} className="flex-1 py-1.5 px-3 md:py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={() => { setShowBidConfirm(false); submitBid(); }} className="flex-1 py-1.5 px-3 md:py-2 text-sm rounded-xl bg-brand-secondary text-white font-bold shadow-lg shadow-brand-secondary/30 hover:bg-brand-secondary/90 transition-all hover:-translate-y-0.5">Confirm bid</button>
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
              <Info className="w-6 h-6 text-brand-secondary" /> How Bidding Works
            </h3>
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>Placing a bid consumes one of your available bids. Non-VIP drivers receive 1 free bid per month.</li>
              <li>Bids reset completely at the start of each month (they do not roll over).</li>
              <li>Requests remain available for {requestDurationDays} {requestDurationDays === 1 ? 'day' : 'days'} unless they expire or a driver is selected.</li>
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

      {assignedBidInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-slate-900 pt-1 pb-3 border-b border-slate-100 dark:border-slate-800 z-10">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Assigned Job Info</h2>
              <button onClick={() => setAssignedBidInfo(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {assignedBidInfo.loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
            ) : assignedBidInfo.bid && assignedBidInfo.request ? (
              <div className="border border-green-200 dark:border-green-800/50 rounded-xl p-4 bg-green-50/50 dark:bg-green-900/10 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-3 items-start flex-1">
                    {(assignedBidInfo.bid.vehicleImages?.front || assignedBidInfo.bid.vehicleDetails?.images?.front) && (
                      <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group">
                        <img src={assignedBidInfo.bid.vehicleImages?.front || assignedBidInfo.bid.vehicleDetails?.images?.front} alt="Vehicle" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="block text-base text-slate-900 dark:text-white">{assignedBidInfo.bid.driverName}</b>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{assignedBidInfo.bid.vehicleDetails?.make} {assignedBidInfo.bid.vehicleDetails?.model}</p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Request Budget</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">₦{Number(assignedBidInfo.request.budget).toLocaleString()}</p>
                    
                    <>
                      <p className="text-[9px] md:text-[10px] text-brand-primary font-bold mb-0.5 mt-2">You Proposed:</p>
                      <span className="inline-block font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded text-sm md:text-base border border-brand-primary/20">₦{Number(assignedBidInfo.bid.amount).toLocaleString()}</span>
                    </>
                  </div>
                </div>

                {assignedBidInfo.bid.description && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Driver Note:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">{assignedBidInfo.bid.description}</p>
                  </div>
                )}
                
                <div className="mt-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{assignedBidInfo.passengerPhone || "Phone unavailable"}</p>
                </div>

                <div className="flex gap-2 mt-3">
                  {assignedBidInfo.passengerPhone && (
                    <a href={`tel:${assignedBidInfo.passengerPhone || ""}`} className="flex-1 text-center py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">Call</a>
                  )}
                  {assignedBidInfo.passengerPhone && assignedBidInfo.passengerWhatsapp && (
                    <a href={`https://wa.me/${assignedBidInfo.passengerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 rounded-lg border border-green-500 text-green-600 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-950 transition-colors">WhatsApp</a>
                  )}
                  <button onClick={() => setChatOverlayData({
                    driverId: user?.uid,
                    passengerId: assignedBidInfo.request.passengerId,
                    chatPartnerName: assignedBidInfo.request.passengerName || "Passenger"
                  })} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">Chat</button>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Failed to load job details.</p>
            )}
          </div>
        </div>
      )}

      {chatOverlayData && (
        <ChatOverlay
          driverId={chatOverlayData.driverId}
          passengerId={chatOverlayData.passengerId}
          chatPartnerName={chatOverlayData.chatPartnerName}
          onClose={() => setChatOverlayData(null)}
        />
      )}
    </div>
  );
}
