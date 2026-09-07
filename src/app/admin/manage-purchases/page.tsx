"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Save, CreditCard, Ticket, Settings2, Plus, Trash2, Lock } from "lucide-react";
import { toast } from "react-hot-toast";

// CEO UID for basic protection, but real protection is the password
const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

interface PricingConfig {
  startTicketCollection: boolean;
  tickets: Array<{ durationDays: number; price: number; label: string; }>;
  vip: Array<{ stars: number; durationDays: number; price: number; label: string; }>;
}

export default function ManagePurchasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [pricing, setPricing] = useState<PricingConfig>({
    startTicketCollection: true,
    tickets: [
      { durationDays: 3, price: 3000, label: "3 Days" },
      { durationDays: 7, price: 6500, label: "1 Week" }
    ],
    vip: [
      { stars: 1, durationDays: 30, price: 5000, label: "1 Star VIP" },
      { stars: 2, durationDays: 30, price: 10000, label: "2 Star VIP" }
    ]
  });

  const [saving, setSaving] = useState(false);
  
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
        await loadPricing();
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
        setPricing({
          startTicketCollection: data.startTicketCollection ?? true,
          tickets: data.tickets || [],
          vip: data.vip || []
        });
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
    } finally {
      setLoading(false);
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

    setVerifying(true);
    try {
      // 1. Verify Password against adminSettings/ceo
      const ceoRef = doc(db, "adminSettings", "ceo");
      const ceoSnap = await getDoc(ceoRef);
      const correctPassword = ceoSnap.exists() ? ceoSnap.data().password : "prince123";

      if (masterPassword !== correctPassword) {
        toast.error("Incorrect master password!");
        setVerifying(false);
        return;
      }

      // 2. Password is correct, save the pricing configuration
      setSaving(true);
      setShowPasswordModal(false);

      await setDoc(doc(db, "adminSettings", "pricing"), pricing);
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

  const addVip = () => {
    setPricing({
      ...pricing,
      vip: [...pricing.vip, { stars: pricing.vip.length + 1, durationDays: 30, price: 5000, label: `${pricing.vip.length + 1} Star VIP` }]
    });
  };

  const updateVip = (index: number, field: string, value: string | number) => {
    const newVip = [...pricing.vip];
    newVip[index] = { ...newVip[index], [field]: value };
    setPricing({ ...pricing, vip: newVip });
  };

  const removeVip = (index: number) => {
    const newVip = [...pricing.vip];
    newVip.splice(index, 1);
    setPricing({ ...pricing, vip: newVip });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-brand-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Settings2 className="w-10 h-10 text-brand-primary" />
            <div>
              <h1 className="text-3xl font-extrabold text-brand-primary">Manage Purchases</h1>
              <p className="text-foreground/60">Configure tickets, VIP cards, and pricing.</p>
            </div>
          </div>
          
          <button 
            onClick={handleSaveClick}
            disabled={saving}
            className="hidden md:flex bg-green-500 text-white px-6 py-3 rounded-xl font-bold items-center gap-2 hover:bg-green-600 transition shadow-lg shadow-green-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save All Changes
          </button>
        </div>

        {/* Global Controls */}
        <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm flex items-center justify-between">
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

        {/* Tickets Configuration */}
        <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-amber-500"/> Ticket Pricing</h2>
            <button onClick={addTicket} className="text-brand-primary font-bold text-sm flex items-center gap-1 hover:underline">
              <Plus className="w-4 h-4"/> Add Option
            </button>
          </div>
          
          <div className="space-y-4">
            {pricing.tickets.map((ticket, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-center bg-background p-4 rounded-xl border border-card-border">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Label</label>
                  <input type="text" value={ticket.label} onChange={(e) => updateTicket(index, "label", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" placeholder="e.g. 1 Week" />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Duration (Days)</label>
                  <input type="number" value={ticket.durationDays} onChange={(e) => updateTicket(index, "durationDays", Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Price (₦)</label>
                  <input type="number" value={ticket.price} onChange={(e) => updateTicket(index, "price", Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <button onClick={() => removeTicket(index)} className="mt-4 md:mt-0 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}
            {pricing.tickets.length === 0 && <p className="text-center text-foreground/50 text-sm py-4">No ticket options defined.</p>}
          </div>
        </div>

        {/* VIP Configuration */}
        <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand-secondary"/> VIP Card Pricing</h2>
            <button onClick={addVip} className="text-brand-primary font-bold text-sm flex items-center gap-1 hover:underline">
              <Plus className="w-4 h-4"/> Add VIP Tier
            </button>
          </div>
          
          <div className="space-y-4">
            {pricing.vip.map((vipObj, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-center bg-background p-4 rounded-xl border border-card-border">
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Label</label>
                  <input type="text" value={vipObj.label} onChange={(e) => updateVip(index, "label", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Star Level</label>
                  <input type="number" value={vipObj.stars} onChange={(e) => updateVip(index, "stars", Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Duration (Days)</label>
                  <input type="number" value={vipObj.durationDays} onChange={(e) => updateVip(index, "durationDays", Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-bold text-foreground/60 mb-1 uppercase tracking-wider">Price (₦)</label>
                  <input type="number" value={vipObj.price} onChange={(e) => updateVip(index, "price", Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-card-border rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none" />
                </div>
                <button onClick={() => removeVip(index)} className="mt-4 md:mt-0 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}
            {pricing.vip.length === 0 && <p className="text-center text-foreground/50 text-sm py-4">No VIP tiers defined.</p>}
          </div>
        </div>

      </div>

      {/* Mobile Save Button (Sticky bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t border-card-border z-40">
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
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-card-border rounded-xl px-4 py-3 text-center text-lg mb-6 focus:outline-none focus:border-brand-primary"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && verifyAndSave()}
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-foreground font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button 
                onClick={verifyAndSave}
                disabled={verifying}
                className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2"
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
