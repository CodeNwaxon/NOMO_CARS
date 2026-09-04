"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, Plus, UploadCloud, ArrowLeft, Car, Bike, Truck, Plane, Ship, Bus, Settings, Edit3, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ManageServicesModal from "./ManageServicesModal";
import EditVehicleModal from "./EditVehicleModal";

const vehicleCategories = [
  { id: "motorbike", name: "Motorbike", icon: Bike, desc: "Two-wheeled vehicles" },
  { id: "keke", name: "Keke (Tricycle)", icon: Bike, desc: "Three-wheeled transport" },
  { id: "car", name: "Car", icon: Car, desc: "Standard 4-door passenger cars" },
  { id: "mini van", name: "Mini Van", icon: Bus, desc: "Small multi-passenger vans" },
  { id: "van", name: "Van", icon: Bus, desc: "Standard vans" },
  { id: "bus", name: "Bus", icon: Bus, desc: "Large multi-passenger buses" },
  { id: "truck", name: "Truck", icon: Truck, desc: "Cargo & heavy duty trucks" },
  { id: "airplane", name: "Airplane", icon: Plane, desc: "Air transport (Jets, Planes)" },
  { id: "ship", name: "Ship / Boat", icon: Ship, desc: "Water transport vessels" }
];

// We use a relaxed schema and manually validate the conditionally required fields
const vehicleSchema = z.object({
  make: z.string().min(2, "Make is required"),
  model: z.string().min(2, "Model is required"),
  year: z.string().min(4, "Year is required"),
  seats: z.string().optional(),
  ac: z.boolean().optional(),
  plateNumber: z.string().optional(),
  payload: z.string().optional(),
  capacity: z.string().optional(),
  registrationNumber: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const getFieldConfig = (category: string) => {
  const isTwoWheeler = ["motorbike", "keke"].includes(category);
  const isHeavy = ["truck"].includes(category);
  const isSpecial = ["airplane", "ship"].includes(category);

  return {
    details: {
      seats: !isTwoWheeler && !isHeavy && !isSpecial,
      ac: !isTwoWheeler && !isHeavy && !isSpecial,
      payload: isHeavy,
      capacity: isSpecial,
      plateNumber: !isSpecial,
      registrationNumber: isSpecial,
    },
    images: {
      front: !isSpecial,
      back: !isSpecial,
      side: true,
      interior: !isTwoWheeler && !isSpecial, // Placed inside 'interior' for regular vehicles, airplanes get their own
      exterior: isSpecial,
      cargoSpace: isHeavy,
      cockpit: isSpecial, // Interior for planes/ships
    },
    docs: {
      show: !isSpecial,
      roadWorthiness: !isTwoWheeler && !isSpecial,
    }
  };
};

export default function VehiclesTab({ userId }: { userId: string }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"list" | "category" | "form">("list");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managingServicesFor, setManagingServicesFor] = useState<{ id: string, name: string } | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle? All its data will be lost.")) return;
    try {
      await deleteDoc(doc(db, "vehicles", vehicleId));
      toast.success("Vehicle deleted successfully");
      fetchVehicles();
    } catch (error) {
      console.error("Error deleting vehicle", error);
      toast.error("Failed to delete vehicle");
    }
  };

  // File states
  const [docs, setDocs] = useState<Record<string, File | null>>({
    roadWorthiness: null, license: null, insurance: null, registration: null
  });
  const [images, setImages] = useState<Record<string, File | null>>({
    front: null, back: null, side: null, interior: null, exterior: null, cargoSpace: null, cockpit: null
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { ac: true }
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

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep("form");
    // Reset form states
    reset();
    setDocs({ roadWorthiness: null, license: null, insurance: null, registration: null });
    setImages({ front: null, back: null, side: null, interior: null, exterior: null, cargoSpace: null, cockpit: null });
  };

  const onSubmit = async (data: VehicleFormData) => {
    const config = getFieldConfig(selectedCategory);

    // Validate active documents
    if (config.docs.show) {
      if (!docs.license || !docs.insurance || !docs.registration || (config.docs.roadWorthiness && !docs.roadWorthiness)) {
        toast.error("Please upload all required documents.");
        return;
      }
    }

    // Validate active images
    const requiredImages = Object.entries(config.images)
      .filter(([_, isRequired]) => isRequired)
      .map(([key]) => key);

    for (const imgKey of requiredImages) {
      if (!images[imgKey]) {
        toast.error(`Please upload the ${imgKey} image.`);
        return;
      }
    }

    // Validate dynamic conditional details
    if (config.details.plateNumber && !data.plateNumber) { toast.error("Plate number is required"); return; }
    if (config.details.registrationNumber && !data.registrationNumber) { toast.error("Registration/Tail number is required"); return; }
    if (config.details.seats && !data.seats) { toast.error("Number of seats is required"); return; }
    if (config.details.payload && !data.payload) { toast.error("Payload capacity is required"); return; }
    if (config.details.capacity && !data.capacity) { toast.error("Passenger/Cargo capacity is required"); return; }

    try {
      setIsSubmitting(true);

      // Upload docs concurrently
      const docUploads = Object.entries(docs)
        .filter(([key, file]) => file !== null && (key !== "roadWorthiness" || config.docs.roadWorthiness) && config.docs.show)
        .map(async ([key, file]) => {
          const url = await uploadImageToCloudinary(file as File);
          return [key, url];
        });

      // Upload images concurrently
      const imgUploads = Object.entries(images)
        .filter(([key, file]) => file !== null && (config.images as any)[key])
        .map(async ([key, file]) => {
          const url = await uploadImageToCloudinary(file as File);
          return [key, url];
        });

      const uploadedDocs = Object.fromEntries(await Promise.all(docUploads));
      const uploadedImages = Object.fromEntries(await Promise.all(imgUploads));

      // Build saved details dynamically based on config
      const detailsToSave: any = {
        make: data.make,
        model: data.model,
        year: data.year,
      };

      if (config.details.seats) detailsToSave.seats = data.seats;
      if (config.details.ac) detailsToSave.ac = data.ac;
      if (config.details.payload) detailsToSave.payloadCapacity = data.payload;
      if (config.details.capacity) detailsToSave.totalCapacity = data.capacity;
      if (config.details.plateNumber) detailsToSave.plateNumber = data.plateNumber;
      if (config.details.registrationNumber) detailsToSave.registrationNumber = data.registrationNumber;

      // Save to firestore
      await addDoc(collection(db, "vehicles"), {
        driverId: userId,
        category: selectedCategory,
        details: detailsToSave,
        documents: uploadedDocs,
        images: uploadedImages,
        isApproved: false,
        createdAt: new Date(),
      });

      toast.success("Vehicle submitted for approval!");
      setStep("list");
      fetchVehicles();
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle.");
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
      <div className="border border-dashed border-card-border rounded-xl p-4 text-center hover:bg-card-bg/50 transition-colors relative h-full flex flex-col justify-center items-center min-h-[100px]">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(type, key, e)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <UploadCloud className="w-5 h-5 mb-2 text-foreground/50" />
        <p className="text-xs font-medium px-2 max-w-full truncate">
          {file ? file.name : label}
        </p>
      </div>
    );
  };

  // -------------------------
  // RENDER: CATEGORY SELECTION
  // -------------------------
  if (step === "category") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setStep("list")} className="p-2 hover:bg-card-bg rounded-full transition-colors border border-card-border shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">What are you registering?</h2>
            <p className="text-foreground/60 text-sm mt-1">Select the category that best fits your vehicle.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicleCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all border border-card-border/50 hover:border-brand-primary group"
              >
                <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                  <Icon className="w-8 h-8 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
                  <p className="text-xs text-foreground/60">{cat.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    );
  }

  // -------------------------
  // RENDER: DYNAMIC FORM
  // -------------------------
  if (step === "form") {
    const config = getFieldConfig(selectedCategory);
    const catData = vehicleCategories.find(c => c.id === selectedCategory);

    return (
      <div className="max-w-4xl glass-panel rounded-3xl p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-card-border pb-6">
          <button onClick={() => setStep("category")} className="p-2 hover:bg-card-bg rounded-full transition-colors border border-card-border shadow-sm flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              {catData?.icon && <catData.icon className="w-6 h-6 text-brand-primary hidden md:block" />}
              Registering {catData?.name}
            </h2>
            <p className="text-foreground/60 text-xs md:text-sm mt-1">Please provide the details below.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">1</span>
              General Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input {...register("make")} placeholder="e.g. Toyota / Boeing" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                {errors.make && <p className="text-brand-accent text-xs mt-1">{errors.make.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input {...register("model")} placeholder="e.g. Camry / 737" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                {errors.model && <p className="text-brand-accent text-xs mt-1">{errors.model.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year Manufactured</label>
                <input type="number" {...register("year")} placeholder="e.g. 2018" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                {errors.year && <p className="text-brand-accent text-xs mt-1">{errors.year.message}</p>}
              </div>

              {config.details.plateNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Plate Number</label>
                  <input {...register("plateNumber")} placeholder="ABC-123-XY" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                </div>
              )}

              {config.details.registrationNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Registration / Tail Number</label>
                  <input {...register("registrationNumber")} placeholder="e.g. N12345" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                </div>
              )}

              {config.details.seats && (
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Seats</label>
                  <input type="number" {...register("seats")} placeholder="4" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                </div>
              )}

              {config.details.payload && (
                <div>
                  <label className="block text-sm font-medium mb-1">Payload Capacity (Tons)</label>
                  <input type="number" step="0.1" {...register("payload")} placeholder="e.g. 15.5" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                </div>
              )}

              {config.details.capacity && (
                <div>
                  <label className="block text-sm font-medium mb-1">Total Capacity (Passengers/Cargo)</label>
                  <input {...register("capacity")} placeholder="e.g. 150 Passengers" className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary" />
                </div>
              )}

              {config.details.ac && (
                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <input type="checkbox" id="ac" {...register("ac")} className="w-5 h-5 accent-brand-primary rounded" />
                  <label htmlFor="ac" className="font-medium cursor-pointer">AC is working</label>
                </div>
              )}
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">2</span>
              Images
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
              {config.images.front && renderFileInput("images", "front", "Front View")}
              {config.images.back && renderFileInput("images", "back", "Back View")}
              {config.images.side && renderFileInput("images", "side", "Side View")}
              {config.images.interior && renderFileInput("images", "interior", "Interior View")}
              {config.images.exterior && renderFileInput("images", "exterior", "Exterior View")}
              {config.images.cockpit && renderFileInput("images", "cockpit", "Interior/Cockpit")}
              {config.images.cargoSpace && renderFileInput("images", "cargoSpace", "Cargo Space")}
            </div>
          </div>

          {/* Documents Section (Conditionally Hidden) */}
          {config.docs.show && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">3</span>
                Verification Documents
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
                {renderFileInput("docs", "license", "Driver's License")}
                {renderFileInput("docs", "insurance", "Insurance")}
                {renderFileInput("docs", "registration", "Vehicle Reg.")}
                {config.docs.roadWorthiness && renderFileInput("docs", "roadWorthiness", "Road Worthiness")}
              </div>
            </div>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-brand-secondary to-brand-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-brand-secondary/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting ? "Uploading & Submitting..." : "Submit Registration"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------
  // RENDER: DEFAULT LIST
  // -------------------------
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">My Registered Vehicles</h2>
          <p className="text-foreground/60 text-xs md:text-sm mt-1">Manage your fleet and approvals.</p>
        </div>
        <button
          onClick={() => setStep("category")}
          className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/30 hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Add New Vehicle
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center border border-card-border/50 shadow-sm">
          <div className="w-24 h-24 bg-card-border/30 rounded-full flex items-center justify-center mb-6">
            <Car className="w-12 h-12 text-foreground/40" />
          </div>
          <h3 className="text-lg md:text-2xl font-bold mb-2">No Vehicles Found</h3>
          <p className="text-foreground/60 text-xs md:text-base mb-8 max-w-md">
            You haven't registered any vehicles yet. Choose a category to get started.
          </p>
          <button
            onClick={() => setStep("category")}
            className="flex items-center gap-2 px-8 py-4 bg-card-bg border border-card-border rounded-xl font-bold hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
          >
            Start Registration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const displayImage = v.images.exterior || v.images.front || v.images.side;
            return (
              <div key={v.id} className="glass-panel rounded-2xl overflow-hidden group border border-card-border/50 hover:border-brand-primary/30 transition-all shadow-sm hover:shadow-xl">
                <div className="h-40 relative bg-card-border">
                  {displayImage ? (
                    <img src={displayImage} alt={v.details.make} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/30"><Car className="w-10 h-10" /></div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${v.isApproved ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                      }`}>
                      {v.isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold capitalize">
                    {v.category}
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="font-bold text-lg leading-tight">{v.details.make} {v.details.model}</h4>
                  <p className="text-sm text-foreground/60 mb-4 font-medium">Yr: {v.details.year}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-foreground/80 bg-card-border/30 p-3 rounded-xl">
                    {(v.details.plateNumber || v.details.registrationNumber) && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 uppercase">Plate/Reg</span>
                        <span className="font-bold truncate">{v.details.plateNumber || v.details.registrationNumber}</span>
                      </div>
                    )}
                    {v.details.seats && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 uppercase">Seats</span>
                        <span className="font-bold">{v.details.seats}</span>
                      </div>
                    )}
                    {v.details.payloadCapacity && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 uppercase">Payload</span>
                        <span className="font-bold">{v.details.payloadCapacity} T</span>
                      </div>
                    )}
                    {v.details.ac !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 uppercase">AC</span>
                        <span className="font-bold">{v.details.ac ? "Yes" : "No"}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-card-border/50 pt-4">
                    <button
                      onClick={() => setManagingServicesFor({ id: v.id, name: `${v.details.make} ${v.details.model}` })}
                      className="w-full py-2 bg-brand-primary/10 text-brand-primary font-bold rounded-lg text-sm hover:bg-brand-primary hover:text-white transition-colors"
                    >
                      Manage Routes & Services
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingVehicle(v)}
                        className="flex-1 py-2 bg-card-bg border border-card-border font-bold rounded-lg text-sm hover:bg-card-border/50 transition-colors flex items-center justify-center gap-2 text-foreground/80"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="flex-1 py-2 bg-red-500/10 text-red-500 font-bold rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {managingServicesFor && (
        <ManageServicesModal
          vehicleId={managingServicesFor.id}
          vehicleName={managingServicesFor.name}
          driverId={userId}
          onClose={() => setManagingServicesFor(null)}
        />
      )}

      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaved={fetchVehicles}
        />
      )}
    </div>
  );
}
