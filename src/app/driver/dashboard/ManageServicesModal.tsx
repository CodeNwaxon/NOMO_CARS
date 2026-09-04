"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Loader2, Plus, MapPin, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

interface ManageServicesModalProps {
  vehicleId: string;
  driverId: string;
  vehicleName: string;
  onClose: () => void;
}

export default function ManageServicesModal({ vehicleId, driverId, vehicleName, onClose }: ManageServicesModalProps) {
  const { profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    startPoint: profile?.operatingState ? `${profile.operatingCity ? profile.operatingCity + ', ' : ''}${profile.operatingState}` : "",
    destination: "",
    price: "",
    description: "",
    isNegotiable: false,
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "vehicleServices"), where("vehicleId", "==", vehicleId));
      const snapshot = await getDocs(q);
      const fetched: any[] = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
      setServices(fetched);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startPoint || !formData.destination || !formData.price) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "vehicleServices"), {
        driverId,
        vehicleId,
        startPoint: formData.startPoint,
        destination: formData.destination,
        price: formData.price,
        description: formData.description,
        isNegotiable: formData.isNegotiable,
        createdAt: new Date(),
      });
      toast.success("Service added successfully");
      setIsAdding(false);
      setFormData({ ...formData, destination: "", price: "", description: "", isNegotiable: false });
      fetchServices();
    } catch (error) {
      console.error("Error adding service", error);
      toast.error("Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      await deleteDoc(doc(db, "vehicleServices", id));
      toast.success("Service deleted");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service", error);
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative bg-background border border-card-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-card-border bg-card-bg/30">
          <div>
            <h2 className="text-xl font-bold">Routes & Services</h2>
            <p className="text-xs text-foreground/60 mt-1">Managing routes for: <span className="font-bold text-foreground">{vehicleName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-card-bg rounded-full transition-colors border border-card-border">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-card-bg/20 p-6 rounded-2xl border border-card-border/50 mb-6 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-brand-primary"><Plus className="w-5 h-5"/> Add New Route</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Start Point *</label>
                  <input 
                    value={formData.startPoint} 
                    onChange={e => setFormData({...formData, startPoint: e.target.value})}
                    placeholder="e.g. Lagos" 
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Destination *</label>
                  <input 
                    value={formData.destination} 
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    placeholder="e.g. Abuja" 
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none shadow-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Amount / Price *</label>
                <input 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="e.g. 50,000" 
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g. Air-conditioned, free Wi-Fi, stops at Ibadan." 
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none resize-none h-20 shadow-sm" 
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="negotiable" 
                  checked={formData.isNegotiable}
                  onChange={e => setFormData({...formData, isNegotiable: e.target.checked})}
                  className="w-5 h-5 accent-brand-primary rounded" 
                />
                <label htmlFor="negotiable" className="text-sm font-medium cursor-pointer">Price is Negotiable</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-card-border mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-card-bg rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-md shadow-brand-primary/20 hover:scale-105 transition-all">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Route
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-foreground/80">Available Routes</h3>
              <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg font-bold text-sm hover:bg-brand-primary hover:text-white transition-colors">
                <Plus className="w-4 h-4" /> Add New Route
              </button>
            </div>
          )}

          {/* List of Services */}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-foreground/50 text-sm border border-dashed border-card-border rounded-2xl bg-card-bg/10">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No routes added yet.</p>
              <p className="text-xs mt-1 opacity-70">Click 'Add New Route' to create your first service.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-card-bg/50 border border-card-border rounded-xl gap-4 hover:border-brand-primary/30 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold text-lg">
                      <span className="text-brand-primary truncate">{service.startPoint}</span>
                      <span className="text-foreground/30">➔</span>
                      <span className="truncate">{service.destination}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                      <span className="font-black bg-brand-secondary/10 text-brand-secondary px-2.5 py-1 rounded-md shadow-sm">₦{service.price}</span>
                      {service.isNegotiable ? (
                        <span className="text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Negotiable</span>
                      ) : (
                        <span className="text-foreground/50 bg-card-border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Fixed Price</span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-xs text-foreground/60 mt-3 p-3 bg-background rounded-lg border border-card-border/50 italic line-clamp-2">"{service.description}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t border-card-border md:border-t-0 pt-3 md:pt-0">
                    <button onClick={() => handleDelete(service.id)} className="p-2.5 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-lg transition-colors ml-auto md:ml-0 border border-red-500/20 shadow-sm" title="Delete Route">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
