"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, Plus, UploadCloud, ArrowLeft, Car } from "lucide-react";

const vehicleCategories = [
  "motorbike", "keke", "car", "bus", "mini van", "van", "truck", "airplane", "ship"
];

const vehicleSchema = z.object({
  category: z.string().min(1, "Category is required"),
  make: z.string().min(2, "Make is required"),
  model: z.string().min(2, "Model is required"),
  year: z.string().min(4, "Year is required"),
  seats: z.string().min(1, "Number of seats required"),
  ac: z.boolean(),
  plateNumber: z.string().min(4, "Plate number is required"),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function VehiclesTab({ userId }: { userId: string }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File states
  const [docs, setDocs] = useState<Record<string, File | null>>({
    roadWorthiness: null, license: null, insurance: null, registration: null
  });
  const [images, setImages] = useState<Record<string, File | null>>({
    front: null, back: null, side: null, interior: null
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      ac: true,
    }
  });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "vehicles"), where("driverId", "==", userId));
      const querySnapshot = await getDocs(q);
      const fetchedVehicles: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedVehicles.push({ id: doc.id, ...doc.data() });
      });
      setVehicles(fetchedVehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [userId]);

  const onSubmit = async (data: VehicleFormData) => {
    // Basic validation for files
    const missingDocs = Object.values(docs).some(d => !d);
    const missingImages = Object.values(images).some(i => !i);
    
    if (missingDocs || missingImages) {
      alert("Please upload all required documents and images.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload docs concurrently
      const docUploads = Object.entries(docs).map(async ([key, file]) => {
        const url = await uploadImageToCloudinary(file as File);
        return [key, url];
      });

      // Upload images concurrently
      const imgUploads = Object.entries(images).map(async ([key, file]) => {
        const url = await uploadImageToCloudinary(file as File);
        return [key, url];
      });

      const uploadedDocs = Object.fromEntries(await Promise.all(docUploads));
      const uploadedImages = Object.fromEntries(await Promise.all(imgUploads));

      // Save to firestore
      await addDoc(collection(db, "vehicles"), {
        driverId: userId,
        category: data.category,
        details: {
          make: data.make,
          model: data.model,
          year: data.year,
          seats: data.seats,
          ac: data.ac,
          plateNumber: data.plateNumber,
        },
        documents: uploadedDocs,
        images: uploadedImages,
        isApproved: false,
        createdAt: new Date(),
      });

      setShowAddForm(false);
      reset();
      setDocs({ roadWorthiness: null, license: null, insurance: null, registration: null });
      setImages({ front: null, back: null, side: null, interior: null });
      fetchVehicles();
    } catch (error) {
      console.error("Error adding vehicle:", error);
      alert("Failed to add vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (type: "docs" | "images", key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (type === "docs") {
      setDocs(prev => ({ ...prev, [key]: file }));
    } else {
      setImages(prev => ({ ...prev, [key]: file }));
    }
  };

  const renderFileInput = (type: "docs" | "images", key: string, label: string) => {
    const file = type === "docs" ? docs[key] : images[key];
    return (
      <div className="border border-dashed border-card-border rounded-xl p-4 text-center hover:bg-card-bg/50 transition-colors relative">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(type, key, e)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <UploadCloud className="w-5 h-5 mx-auto mb-1 text-foreground/50" />
        <p className="text-xs font-medium truncate px-2">
          {file ? file.name : label}
        </p>
      </div>
    );
  };

  if (showAddForm) {
    return (
      <div className="max-w-4xl glass-panel rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-card-bg rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold">Add New Vehicle</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Vehicle Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-card-border pb-2">Vehicle Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select {...register("category")} className="w-full bg-background border border-card-border rounded-xl px-4 py-3">
                  <option value="">Select Category...</option>
                  {vehicleCategories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
                {errors.category && <p className="text-brand-accent text-xs mt-1">{errors.category.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input {...register("make")} placeholder="Toyota" className="w-full bg-background border border-card-border rounded-xl px-4 py-3" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input {...register("model")} placeholder="Camry" className="w-full bg-background border border-card-border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year Manufactured</label>
                <input type="number" {...register("year")} placeholder="2018" className="w-full bg-background border border-card-border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Number of Seats</label>
                <input type="number" {...register("seats")} placeholder="4" className="w-full bg-background border border-card-border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Plate Number</label>
                <input {...register("plateNumber")} placeholder="ABC-123-XY" className="w-full bg-background border border-card-border rounded-xl px-4 py-3" />
              </div>
              
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ac" {...register("ac")} className="w-5 h-5 accent-brand-primary" />
                <label htmlFor="ac" className="font-medium">AC is working</label>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-card-border pb-2">Documents (Images)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderFileInput("docs", "roadWorthiness", "Road Worthiness")}
              {renderFileInput("docs", "license", "Driver's License")}
              {renderFileInput("docs", "insurance", "Insurance")}
              {renderFileInput("docs", "registration", "Vehicle Reg.")}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-card-border pb-2">Vehicle Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderFileInput("images", "front", "Front View")}
              {renderFileInput("images", "back", "Back View")}
              {renderFileInput("images", "side", "Side View")}
              {renderFileInput("images", "interior", "Interior View")}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-brand-secondary to-brand-primary text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-brand-secondary/30 transition-all flex justify-center items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? "Uploading & Submitting..." : "Submit Vehicle"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">My Vehicles</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-card-border/50 rounded-full flex items-center justify-center mb-4">
            <Car className="w-10 h-10 text-foreground/50" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Vehicles Registered</h3>
          <p className="text-foreground/70 mb-6 max-w-md">
            You haven't added any vehicles yet. Click the button above to register your first vehicle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles.map((v) => (
            <div key={v.id} className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  v.isApproved ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600"
                }`}>
                  {v.isApproved ? "Approved" : "Awaiting Approval"}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-card-border">
                  <img src={v.images.front} alt="Vehicle Front" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-lg capitalize">{v.category}</h4>
                  <p className="text-sm text-foreground/70">{v.details.make} {v.details.model} ({v.details.year})</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-foreground/80 bg-background/50 p-3 rounded-lg">
                <div className="flex justify-between"><span>Plate:</span> <span className="font-medium">{v.details.plateNumber}</span></div>
                <div className="flex justify-between"><span>Seats:</span> <span className="font-medium">{v.details.seats}</span></div>
                <div className="flex justify-between"><span>AC:</span> <span className="font-medium">{v.details.ac ? "Yes" : "No"}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
