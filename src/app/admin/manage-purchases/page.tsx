"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Save, CreditCard, Ticket, Settings2, Plus, Trash2, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

// CEO UID for basic protection, but real protection is the password
const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

interface PricingConfig {
  startTicketCollection: boolean;
  requestDurationDays: number;
  nonVipLimits: {
    maxCars: number;
    maxRoutesPerCar: number;
    dailyBids: number;
    createBidLimit: number;
  };
  tickets: Array<{ durationDays: number; price: number; label: string; }>;
  pointsPerStar?: number;
  vip: Array<{ 
    stars: number; 
    durationDays: number; 
    price: number; 
    label: string; 
    maxCars?: number; 
    maxRoutesPerCar?: number; 
    dailyBids?: number; 
    createBidLimit?: number; 
  }>;
}

export default function ManagePurchasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [pricing, setPricing] = useState<PricingConfig>({
    startTicketCollection: true,
    requestDurationDays: 14,
    pointsPerStar: 20,
    nonVipLimits: {
      maxCars: 1,
      maxRoutesPerCar: 1,
      dailyBids: 1,
      createBidLimit: 1
    },
    tickets: [
      { durationDays: 3, price: 3000, label: "3 Days" },
      { durationDays: 7, price: 6500, label: "1 Week" }
    ],
    vip: [
      { stars: 1, durationDays: 30, price: 5000, label: "1 Star VIP", maxCars: 2, maxRoutesPerCar: 2, dailyBids: 3, createBidLimit: 3 },
      { stars: 2, durationDays: 30, price: 10000, label: "2 Star VIP", maxCars: 3, maxRoutesPerCar: 3, dailyBids: 5, createBidLimit: 5 }
    ]
  });

  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  
  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Here we just check if they are authenticated. 
        // We could also check if user.uid === CEO_UID or if they have role === 'admin'
        // For now, if they are here, we allow them to view, but saving requires password.
        await Promise.all([loadPricing(), loadTransactions()]);
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadPricing = async () => {
    try {
      const docRef = doc(db, "adminSettings", "pricing");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as PricingConfig;
        let loadedVips = data.vip || [];
        if (loadedVips.length !== 5) {
          const defaultVips = [
            { stars: 1, durationDays: 30, price: 5000, label: "1 Star VIP", maxCars: 2, maxRoutesPerCar: 2, dailyBids: 3, createBidLimit: 3 },
            { stars: 2, durationDays: 30, price: 10000, label: "2 Star VIP", maxCars: 3, maxRoutesPerCar: 3, dailyBids: 5, createBidLimit: 5 },
            { stars: 3, durationDays: 30, price: 15000, label: "3 Star VIP", maxCars: 4, maxRoutesPerCar: 4, dailyBids: 10, createBidLimit: 10 },
            { stars: 4, durationDays: 30, price: 20000, label: "4 Star VIP", maxCars: 5, maxRoutesPerCar: 5, dailyBids: 20, createBidLimit: 20 },
            { stars: 5, durationDays: 30, price: 25000, label: "5 Star VIP", maxCars: 10, maxRoutesPerCar: 10, dailyBids: 50, createBidLimit: 50 }
          ];
          loadedVips = defaultVips.map(dv => {
            const found = loadedVips.find((v:any) => v.stars === dv.stars);
            return found ? { ...dv, ...found } : dv;
          });
        }
        
        setPricing({
          startTicketCollection: data.startTicketCollection ?? true,
          requestDurationDays: Number(data.requestDurationDays ?? 14),
          pointsPerStar: data.pointsPerStar ?? 20,
          nonVipLimits: data.nonVipLimits || { maxCars: 1, maxRoutesPerCar: 1, dailyBids: 1, createBidLimit: 1 },
          tickets: data.tickets || [],
          vip: loadedVips.sort((a: any, b: any) => a.stars - b.stars)
        });
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSaveClick = () => {
    setShowPasswordModal(true);
    setMasterPassword("");
  };

  const verifyAndSave = async () => {
    if (!masterPassword) {
      toast.error("Please enter the master password");
      return;
    }

    // Validate VIP Pricing Hierarchy
    const sortedVip = [...pricing.vip].sort((a, b) => a.stars - b.stars);
    for (let i = 0; i < sortedVip.length - 1; i++) {
      if (sortedVip[i].stars === sortedVip[i + 1].stars) {
        toast.error(`Duplicate Star Level: Multiple tiers are set to ${sortedVip[i].stars} Stars.`);
        return;
      }
      if (sortedVip[i].price >= sortedVip[i + 1].price) {
        toast.error(`Invalid Pricing: ${sortedVip[i + 1].stars} Star VIP (₦${sortedVip[i + 1].price.toLocaleString()}) must cost MORE than ${sortedVip[i].stars} Star VIP (₦${sortedVip[i].price.toLocaleString()}).`);
        return;
      }
    }

    setVerifying(true);
    try {
      // 1. Verify Password against adminSettings/ceo
      const ceoRef = doc(db, "adminSettings", "ceo");
      const ceoSnap = await getDoc(ceoRef);
      const correctPassword = ceoSnap.exists() ? ceoSnap.data().password : null;

      if (masterPassword !== correctPassword) {
        toast.error("Incorrect master password!");
        setVerifying(false);
        return;
      }

      // 2. Password is correct, save the pricing configuration
      setSaving(true);
      setShowPasswordModal(false);

      const pricingRef = doc(db, "adminSettings", "pricing");
      const oldSnap = await getDoc(pricingRef);
      const oldPricing = oldSnap.exists() ? oldSnap.data() : {};
      
      const updateData: any = { ...pricing };
      
      // If turning ON from OFF, set new timestamp
      if (pricing.startTicketCollection && !oldPricing.startTicketCollection) {
        updateData.ticketCollectionStartedAt = serverTimestamp();
      } else if (oldPricing.ticketCollectionStartedAt) {
        // preserve the old timestamp
        updateData.ticketCollectionStartedAt = oldPricing.ticketCollectionStartedAt;
      }

      await setDoc(pricingRef, updateData);
      toast.success("Pricing configuration saved successfully!");

    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Failed to save configuration");
    } finally {
      setVerifying(false);
      setSaving(false);
    }
  };

  const addTicket = () => {
    setPricing({
      ...pricing,
      tickets: [...pricing.tickets, { durationDays: 1, price: 1000, label: "1 Day" }]
    });
  };

  const updateTicket = (index: number, field: string, value: string | number) => {
    const newTickets = [...pricing.tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setPricing({ ...pricing, tickets: newTickets });
  };

  const removeTicket = (index: number) => {
    const newTickets = [...pricing.tickets];
    newTickets.splice(index, 1);
    setPricing({ ...pricing, tickets: newTickets });
  };

  const updateVip = (index: number, field: string, value: string | number) => {
    const newVip = [...pricing.vip];
    newVip[index] = { ...newVip[index], [field]: value };
    setPricing({ ...pricing, vip: newVip });
  };

  const removeVip = (index: number) => {
    // Disabled: VIP tiers are fixed.
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-brand-primary" /></div>;
  }

  // Compute VIP Pricing Errors for inline display
  const vipErrors: Record<number, string> = {};
  const sortedVipRefs = [...pricing.vip].map((v, i) => ({ ...v, originalIndex: i })).sort((a, b) => a.stars - b.stars);
  
  for (let i = 0; i < sortedVipRefs.length - 1; i++) {
    if (sortedVipRefs[i].stars === sortedVipRefs[i + 1].stars) {
      vipErrors[sortedVipRefs[i].originalIndex] = `Duplicate Star Level`;
      vipErrors[sortedVipRefs[i + 1].originalIndex] = `Duplicate Star Level`;
    } else if (sortedVipRefs[i].price >= sortedVipRefs[i + 1].price) {
      vipErrors[sortedVipRefs[i + 1].originalIndex] = `Must cost MORE than ${sortedVipRefs[i].stars} Star VIP (₦${sortedVipRefs[i].price.toLocaleString()})`;
      vipErrors[sortedVipRefs[i].originalIndex] = `Must cost LESS than ${sortedVipRefs[i + 1].stars} Star VIP (₦${sortedVipRefs[i + 1].price.toLocaleString()})`;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 relative">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary flex items-center gap-2">
              <Settings2 className="w-6 h-6 md:w-8 md:h-8" />
              Manage Purchases
            </h1>
            <p className="text-xs md:text-sm text-foreground/60 mt-1">Configure tickets, VIP cards, and pricing.</p>
          </div>
          
          <button 
            onClick={handleSaveClick}
            disabled={saving}
            className="hidden md:flex bg-green-500 text-white px-6 py-2 rounded-xl font-bold items-center gap-2 hover:bg-green-600 transition shadow-lg shadow-green-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save All Changes
          </button>
        </div>

        {/* Global Controls */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all">
          <div>
            <h2 className="text-lg font-bold">Ticket Collection</h2>
            <p className="text-sm text-foreground/60">Toggle whether drivers are required to buy tickets to access the platform.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={pricing.startTicketCollection}
              onChange={(e) => setPricing({...pricing, startTicketCollection: e.target.checked})}
            />
            <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 dark:peer-focus:ring-brand-primary/80 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
          </label>
        </div>

        {/* Referral Configuration */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-amber-500">VIP Referral System</h2>
            <p className="text-sm text-foreground/60 mt-1">Configure how many points are needed to earn a single VIP Star. (Each successful referral grants 2 points).</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Points Per Star:</label>
            <input 
              type="text" 
              inputMode="numeric" 
              value={pricing.pointsPerStar || ""} 
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPricing({...pricing, pointsPerStar: val ? parseInt(val, 10) : 0});
              }}
              className="w-24 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-center font-bold" 
            />
          </div>
        </div>

        {/* Tickets Configuration */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-amber-500"/> Ticket Pricing</h2>
            <button onClick={addTicket} className="text-brand-primary font-bold text-sm flex items-center gap-1 hover:underline">
              <Plus className="w-4 h-4"/> Add Option
            </button>
          </div>
          
          <div className="space-y-4">
            {pricing.tickets.map((ticket, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl transition-all hover:shadow-md">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Label</label>
                  <input type="text" value={ticket.label} onChange={(e) => updateTicket(index, "label", e.target.value)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" placeholder="e.g. 1 Week" />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Duration (Days)</label>
                  <input type="text" inputMode="numeric" value={ticket.durationDays || ""} onChange={(e) => updateTicket(index, "durationDays", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Price (₦)</label>
                  <input 
                    type="text" 
                    value={ticket.price ? ticket.price.toLocaleString() : ""} 
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "");
                      updateTicket(index, "price", num ? parseInt(num, 10) : 0);
                    }} 
                    className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" 
                  />
                </div>
                <button onClick={() => removeTicket(index)} className="mt-4 md:mt-0 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}
            {pricing.tickets.length === 0 && <p className="text-center text-foreground/50 text-sm py-4">No ticket options defined.</p>}
          </div>
        </div>

        {/* VIP Configuration */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand-secondary"/> VIP Card Pricing (Fixed)</h2>
          </div>
          
          <div className="space-y-4">
            {pricing.vip.map((vipObj, index) => (
              <div key={index} className="flex flex-col">
                <div className={`flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl transition-all hover:shadow-md ${vipErrors[index] ? 'border border-red-500/50 ring-1 ring-red-500/20' : ''}`}>
                  <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Label</label>
                    <input type="text" value={vipObj.label} onChange={(e) => updateVip(index, "label", e.target.value)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Star Level</label>
                    <input type="number" value={vipObj.stars} readOnly className="w-full bg-slate-100 dark:bg-slate-900 border-none text-foreground/50 rounded-xl px-4 py-2 shadow-inner focus:outline-none transition-all cursor-not-allowed" />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Duration (Days)</label>
                    <input type="text" inputMode="numeric" value={vipObj.durationDays || ""} onChange={(e) => updateVip(index, "durationDays", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                  <div className="w-full md:w-1/4">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${vipErrors[index] ? 'text-red-500' : 'text-foreground/60'}`}>Price (₦)</label>
                    <input 
                      type="text" 
                      value={vipObj.price ? vipObj.price.toLocaleString() : ""} 
                      onChange={(e) => {
                        const num = e.target.value.replace(/\D/g, "");
                        updateVip(index, "price", num ? parseInt(num, 10) : 0);
                      }} 
                      className={`w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:outline-none transition-all ${vipErrors[index] ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'}`} 
                    />
                  </div>
                </div>
                {vipErrors[index] && (
                  <p className="text-red-500 text-xs font-bold mt-2 ml-2 flex items-center gap-1 animate-in fade-in zoom-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" /> {vipErrors[index]}
                  </p>
                )}
              </div>
            ))}
            {pricing.vip.length === 0 && <p className="text-center text-foreground/50 text-sm py-4">No VIP tiers defined.</p>}
          </div>
        </div>

        {/* Usage Limits Configuration */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-500"/> Usage Limits Configuration</h2>
          </div>
          
          <div className="space-y-6">
            {/* Non-VIP Limits */}
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl transition-all">
              <h3 className="font-bold text-foreground mb-4">Non-VIP (Base Tier)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-4 mb-2 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Created Request Duration (days)</label>
                  <input type="text" inputMode="numeric" value={pricing.requestDurationDays || ""} onChange={(e) => setPricing({...pricing, requestDurationDays: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0})} className="w-full md:w-1/2 bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  <p className="text-[10px] text-foreground/50 mt-1">Controls how long passenger requests remain open.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Max Cars</label>
                  <input type="text" inputMode="numeric" value={pricing.nonVipLimits.maxCars || ""} onChange={(e) => setPricing({...pricing, nonVipLimits: {...pricing.nonVipLimits, maxCars: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0}})} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Max Routes</label>
                  <input type="text" inputMode="numeric" value={pricing.nonVipLimits.maxRoutesPerCar || ""} onChange={(e) => setPricing({...pricing, nonVipLimits: {...pricing.nonVipLimits, maxRoutesPerCar: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0}})} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Monthly Bids</label>
                  <input type="text" inputMode="numeric" value={pricing.nonVipLimits.dailyBids || ""} onChange={(e) => setPricing({...pricing, nonVipLimits: {...pricing.nonVipLimits, dailyBids: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0}})} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Create Bid Limit</label>
                  <input type="text" inputMode="numeric" value={pricing.nonVipLimits.createBidLimit || ""} onChange={(e) => setPricing({...pricing, nonVipLimits: {...pricing.nonVipLimits, createBidLimit: e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0}})} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* VIP Limits */}
            {pricing.vip.map((vipObj, index) => (
              <div key={`limit-${index}`} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl transition-all hover:shadow-md">
                <h3 className="font-bold text-brand-primary mb-4">{vipObj.label}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Max Cars</label>
                    <input type="text" inputMode="numeric" value={vipObj.maxCars || ""} onChange={(e) => updateVip(index, "maxCars", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Max Routes</label>
                    <input type="text" inputMode="numeric" value={vipObj.maxRoutesPerCar || ""} onChange={(e) => updateVip(index, "maxRoutesPerCar", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Monthly Bids</label>
                    <input type="text" inputMode="numeric" value={vipObj.dailyBids || ""} onChange={(e) => updateVip(index, "dailyBids", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Create Bid Limit</label>
                    <input type="text" inputMode="numeric" value={vipObj.createBidLimit || ""} onChange={(e) => updateVip(index, "createBidLimit", e.target.value ? parseInt(e.target.value.replace(/\D/g, ""), 10) : 0)} className="w-full bg-white dark:bg-slate-950 border-none text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Receipts Tracking */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] mt-8 transition-all">
          <div className="mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">Receipts Tracker</h2>
            <p className="text-sm text-foreground/60 mt-1">View recent transaction receipts for VIP and Tickets.</p>
          </div>
          
          {loadingTransactions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-foreground/50 border border-dashed border-card-border rounded-xl">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3 rounded-tl-lg font-bold">Date</th>
                    <th className="p-3 font-bold">User Email</th>
                    <th className="p-3 font-bold">Type</th>
                    <th className="p-3 font-bold">Amount</th>
                    <th className="p-3 font-bold">Receipt ID</th>
                    <th className="p-3 rounded-tr-lg text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {transactions.map((txn, idx) => (
                    <tr key={txn.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-foreground/80">{txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-3 font-medium">{txn.userEmail || "N/A"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          (txn.type || "").toLowerCase().includes("vip") ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {txn.type || "Unknown"}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">₦{txn.amount ? txn.amount.toLocaleString() : '0'}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{txn.reference || txn.id}</td>
                      <td className="p-3 text-right">
                        <Link 
                          href={`/receipt/${txn.reference || txn.id}`} 
                          target="_blank"
                          className="text-brand-primary font-bold hover:underline text-xs"
                        >
                          View Receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Save Button (Sticky bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-md z-40">
        <button 
          onClick={handleSaveClick}
          disabled={saving}
          className="w-full bg-green-500 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-accent" />
            </div>
            
            <h3 className="text-xl font-bold mb-2">Master Password Required</h3>
            <p className="text-sm text-foreground/70 mb-6">
              You must enter the CEO master password to save pricing changes.
            </p>

            <input 
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all text-center text-lg mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && verifyAndSave()}
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-foreground font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button 
                onClick={verifyAndSave}
                disabled={verifying}
                className="flex-1 py-2 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
