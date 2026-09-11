"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, addDoc, setDoc, query, where, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, Plus, UploadCloud, ArrowLeft, Car, CarFront, Bike, Truck, Plane, Ship, Bus, Settings, Edit3, Trash2, Eye, Info, X, Star, Check, Share2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import ManageServicesModal from "./ManageServicesModal";
import EditVehicleModal from "./EditVehicleModal";
import { notifyAdminsClient } from "@/lib/notifyClient";
import ImageViewerOverlay from "@/components/ImageViewerOverlay";
import { useVIPLimits } from "@/hooks/useVIPLimits";
import Link from "next/link";

const vehicleCategories = [
  { id: "motorbike", name: "Motorbike (Dispatch Rider)", icon: Bike, desc: "Two-wheeled vehicles" },
  { id: "keke", name: "Keke (Tricycle)", icon: CarFront, desc: "Three-wheeled transport" },
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
  color: z.string().min(2, "Color is required").optional(),
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
      color: true,
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

export default function VehiclesTab({ userId, vipStars = 0, ticketExpiry, lastTicketDays }: { userId: string, vipStars?: number, ticketExpiry?: string, lastTicketDays?: number }) {
  const { limits, loadingLimits } = useVIPLimits(vipStars);
  const maxCars = limits.maxCars;

  const hasShareBenefit = () => {
    if (!ticketExpiry) return false;
    const expiryDate = new Date(ticketExpiry);
    return expiryDate > new Date() && Number(lastTicketDays || 0) >= 14;
  };

  const handleShare = async (vehicle: any) => {
    const websiteLink = window.location.origin;
    const shareUrl = `${websiteLink}/driver/profile/${userId}?vehicle=${vehicle.id}`;
    const shareData = {
      title: `Check out my ${vehicle.details.make} ${vehicle.details.model} on Nomo Cars!`,
      text: `Looking for transport? Check out my ${vehicle.details.make} ${vehicle.details.model} on Nomo Cars.`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"list" | "category" | "form">("list");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managingServicesFor, setManagingServicesFor] = useState<{ id: string, name: string } | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [showVIPInfo, setShowVIPInfo] = useState(false);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; images: string[]; initialIndex: number; singleMode: boolean }>({ isOpen: false, images: [], initialIndex: 0, singleMode: false });
  const [imageViewerLoadingId, setImageViewerLoadingId] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initiateDelete = (vehicleId: string) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let codeArr = [
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ];
    const all = letters + numbers;
    for (let i = 0; i < 6; i++) {
      codeArr.push(all[Math.floor(Math.random() * all.length)]);
    }
    const code = codeArr.sort(() => Math.random() - 0.5).join('');

    setDeleteCode(code);
    setDeleteInput("");
    setVehicleToDelete(vehicleId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteInput !== deleteCode) {
      toast.error("Confirmation code does not match.");
      return;
    }
    if (!vehicleToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, "vehicles", vehicleToDelete));
      toast.success("Vehicle deleted successfully");
      fetchVehicles();
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error("Error deleting vehicle", error);
      toast.error("Failed to delete vehicle");
    } finally {
      setIsDeleting(false);
    }
  };

  // File states
  const [docs, setDocs] = useState<Record<string, File | null>>({
    roadWorthiness: null, license: null, insurance: null, registration: null
  });
  const [images, setImages] = useState<Record<string, File | null>>({
    front: null, back: null, side: null, interior: null, exterior: null, cargoSpace: null, cockpit: null
  });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { ac: true }
  });

  const fetchVehicles = async () => {
    // Manual refresh is now a no-op since onSnapshot handles updates in real-time
    // This function is kept for backwards compatibility with form submission handlers
  };

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "vehicles"), where("driverId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedVehicles: any[] = [];
      snapshot.forEach((doc) => {
        fetchedVehicles.push({ id: doc.id, ...doc.data() });
      });
      setVehicles(fetchedVehicles);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to vehicles:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep("form");
    // Reset form states
    reset();
    setDocs({ roadWorthiness: null, license: null, insurance: null, registration: null });
    setImages({ front: null, back: null, side: null, interior: null, exterior: null, cargoSpace: null, cockpit: null });
    setPreviewUrls({});
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
    if (config.details.color && !data.color) { toast.error("Vehicle color is required"); return; }
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
      if (config.details.color) detailsToSave.color = data.color;
      if (config.details.ac) detailsToSave.ac = data.ac;
      if (config.details.payload) detailsToSave.payloadCapacity = data.payload;
      if (config.details.capacity) detailsToSave.totalCapacity = data.capacity;
      if (config.details.plateNumber) detailsToSave.plateNumber = data.plateNumber;
      if (config.details.registrationNumber) detailsToSave.registrationNumber = data.registrationNumber;

      // Save to firestore
      const vehicleData = {
        driverId: userId,
        category: selectedCategory,
        details: detailsToSave,
        documents: uploadedDocs,
        images: uploadedImages,
        isApproved: false,
        createdAt: new Date(),
      };

      if (vipStars < 1) {
        await setDoc(doc(db, "vehicles", userId), vehicleData);
      } else {
        await addDoc(collection(db, "vehicles"), vehicleData);
      }

      // Send persistent notification to admin via client
      await notifyAdminsClient(
        "New Vehicle Pending",
        `A driver has submitted a ${vehicleData.details.make} ${vehicleData.details.model} for review.`,
        "/admin/vehicle-approvals"
      );

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
    const combinedKey = `${type}-${key}`;

    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => ({ ...prev, [combinedKey]: url }));
    } else {
      setPreviewUrls(prev => {
        const next = { ...prev };
        delete next[combinedKey];
        return next;
      });
    }

    if (type === "docs") {
      setDocs(prev => ({ ...prev, [key]: file }));
    } else {
      setImages(prev => ({ ...prev, [key]: file }));
    }
  };

  const renderFileInput = (type: "docs" | "images", key: string, label: string) => {
    const file = type === "docs" ? docs[key] : images[key];
    const previewUrl = previewUrls[`${type}-${key}`];

    return (
      <div className={`rounded-lg md:rounded-xl p-4 text-center transition-all relative h-full flex flex-col justify-center items-center min-h-[110px] cursor-pointer group bg-white dark:bg-slate-950 shadow-sm border overflow-hidden ${file ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-gray-300 dark:border-slate-700 hover:border-brand-primary/50'}`}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(type, key, e)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
        />

        {previewUrl && (
          <div className="absolute inset-0 z-0">
            <img src={previewUrl} alt={label} className="w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity" />
          </div>
        )}

        <div className={`relative z-20 w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${file ? 'bg-brand-primary/90 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-brand-primary group-hover:bg-brand-primary/10'}`}>
          <UploadCloud className="w-5 h-5" />
        </div>
        <p className={`relative z-20 text-xs font-medium px-2 max-w-full truncate ${file ? 'text-brand-primary bg-white/90 dark:bg-slate-900/90 py-0.5 rounded shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
          {file ? file.name : label}
        </p>
        {!file && <p className="relative z-20 text-[10px] text-slate-400 dark:text-slate-500 mt-1">Click to upload</p>}
      </div>
    );
  };

  // -------------------------
  // RENDER: CATEGORY SELECTION
  // -------------------------
  if (step === "category") {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-0">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setStep("list")} className="p-1.5 hover:bg-card-bg rounded-full transition-colors border border-card-border shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-bold leading-tight">What are you registering?</h2>
            <p className="text-foreground/60 text-[11px] md:text-xs mt-0.5">Select the category that best fits your vehicle.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {vehicleCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="glass-panel p-4 md:p-5 rounded-2xl flex flex-col items-center text-center gap-3 hover:shadow-lg hover:-translate-y-1 transition-all border border-card-border/50 hover:border-brand-primary group bg-white dark:bg-slate-900"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors mb-1">
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-brand-primary" />
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-sm md:text-base mb-1">{cat.name}</h3>
                  <p className="text-[11px] md:text-xs text-foreground/60 leading-tight line-clamp-2">{cat.desc}</p>
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
      <div className="pb-18 max-w-4xl mx-auto glass-panel rounded md:rounded-3xl p-2 md:p-8">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 md:space-y-8">
          {/* Details Section */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-bold flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center text-xs font-bold shadow-sm">1</span>
              General Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-4 p-4 md:p-5 rounded-2xl bg-foreground/[0.02]">
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input {...register("make")} placeholder="e.g. Toyota / Boeing" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                {errors.make && <p className="text-brand-accent text-xs mt-1">{errors.make.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input {...register("model")} placeholder="e.g. Camry / 737" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                {errors.model && <p className="text-brand-accent text-xs mt-1">{errors.model.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year Manufactured</label>
                <input type="number" {...register("year")} placeholder="e.g. 2018" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                {errors.year && <p className="text-brand-accent text-xs mt-1">{errors.year.message}</p>}
              </div>

              {config.details.color && (
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <input {...register("color")} placeholder="e.g. Silver, Black" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.plateNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Plate Number</label>
                  <input {...register("plateNumber")} placeholder="ABC-123-XY" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.registrationNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Registration / Tail Number</label>
                  <input {...register("registrationNumber")} placeholder="e.g. N12345" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.seats && (
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Seats</label>
                  <input type="number" {...register("seats")} placeholder="4" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.payload && (
                <div>
                  <label className="block text-sm font-medium mb-1">Payload Capacity (Tons)</label>
                  <input type="number" step="0.1" {...register("payload")} placeholder="e.g. 15.5" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.capacity && (
                <div>
                  <label className="block text-sm font-medium mb-1">Total Capacity (Passengers/Cargo)</label>
                  <input {...register("capacity")} placeholder="e.g. 150 Passengers" className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl" />
                </div>
              )}

              {config.details.ac && (
                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <input type="checkbox" id="ac" {...register("ac")} className="w-5 h-5 accent-brand-primary rounded" />
                  <label htmlFor="ac" className="text-sm font-medium cursor-pointer">AC is working</label>
                </div>
              )}
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-bold flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center text-xs font-bold shadow-sm">2</span>
              Images
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-foreground/[0.02]">
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
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-bold flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center text-xs font-bold shadow-sm">3</span>
                Verification Documents
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-foreground/[0.02]">
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
              className="text-sm md:text-base w-full py-3 md:py-3 bg-gradient-to-r from-brand-secondary to-brand-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-brand-secondary/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"
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
    <div className="pb-18 max-w-5xl mx-auto px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">My Registered Vehicles</h2>
          <p className="text-foreground/60 text-xs md:text-sm mt-1">Manage your fleet and approvals. (Limit: {vehicles.length}/{maxCars})</p>
        </div>
        {loadingLimits || loading ? null : vehicles.length >= maxCars ? (
          <div className="flex items-center gap-2">
            <Link href="/vip" className="text-xs md:text-sm bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-amber-500/20 transition-colors">
              Limit Reached ({maxCars}) - Upgrade VIP
            </Link>
            <button onClick={() => setShowVIPInfo(true)} className="text-xs md:text-sm w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition shadow-md flex-shrink-0" title="Why upgrade?">
              <Info className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStep("category")}
            className="text-sm md:text-base flex items-center gap-2 px-4 md:px-6 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/30 hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Add New Vehicle
          </button>
        )}
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
          {loadingLimits || loading ? null : vehicles.length >= maxCars ? (
            <div className="flex items-center gap-3">
              <Link href="/vip" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-6 py-3 rounded-xl font-bold transition-colors">
                Limit Reached - Upgrade VIP
              </Link>
              <button onClick={() => setShowVIPInfo(true)} className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition shadow-md flex-shrink-0">
                <Info className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep("category")}
              className="flex items-center gap-2 px-8 py-4 bg-card-bg border border-card-border rounded-xl font-bold hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
            >
              Start Registration
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const displayImage = v.images.exterior || v.images.front || v.images.side;
            return (
              <div key={v.id} className={`glass-panel rounded-2xl overflow-hidden group border transition-all shadow-sm ${v.isSuspendedByLimit ? "opacity-60 grayscale border-red-500/30" : "border-card-border/50 hover:border-brand-primary/30 hover:shadow-xl"}`}>
                <div className="h-40 relative bg-card-border">
                  {displayImage ? (
                    <img src={displayImage} alt={v.details.make} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/30"><Car className="w-10 h-10" /></div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
                    {v.isSuspendedByLimit ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md bg-red-600 text-white">
                        Suspended
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${v.isApproved ? "bg-green-500 text-white" : "bg-amber-500 text-white"}`}>
                        {v.isApproved ? "Approved" : "Pending"}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm z-10">
                    {v.category}
                  </div>

                  {/* REJECTION OVERLAY */}
                  {v.isRejected && (
                    <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-2xl animate-in zoom-in-95 duration-200 border-2 border-red-500/50">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Application Rejected</h4>
                      <div className="bg-red-50 dark:bg-red-900/20 w-full mt-2 p-2 rounded-lg border border-red-100 dark:border-red-900/50 text-left">
                        <p className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-0.5">Reason:</p>
                        <p className="text-[11px] text-red-900 dark:text-red-200 font-medium line-clamp-2">{v.rejectionReason || "No specific reason provided."}</p>
                      </div>
                    </div>
                  )}

                  {/* View Full Image Button Overlay */}
                  <button
                    onClick={() => {
                      setImageViewerLoadingId(v.id);
                      setTimeout(() => {
                        const allImages = [
                          ...(v.images ? [v.images.front, v.images.back, v.images.side, v.images.interior].filter(Boolean) as string[] : []),
                          ...(v.documents ? Object.values(v.documents) as string[] : []) // Driver can see their documents!
                        ];
                        setViewerState({
                          isOpen: true,
                          images: allImages.length > 0 ? allImages : [""],
                          initialIndex: 0,
                          singleMode: false
                        });
                        setImageViewerLoadingId(null);
                      }, 800);
                    }}
                    className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2 py-1 md:px-3 md:py-1.5 rounded-tl-xl md:rounded-full rounded-br-none md:rounded-br-full text-[9px] md:text-xs font-bold flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all border-l border-t md:border border-white/10 z-10"
                  >
                    {imageViewerLoadingId === v.id ? (
                      <><Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" /> Loading...</>
                    ) : (
                      <><Eye className="w-2.5 h-2.5 md:w-3 md:h-3" /> View Full Image</>
                    )}
                  </button>
                </div>

                <div className="p-5 relative">
                  <h4 className="font-bold text-lg leading-tight mb-2">{v.details.make} {v.details.model}</h4>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:text-xs text-foreground/70 font-medium">
                    <span>{v.details.year}</span>

                    {v.details.color && (
                      <>
                        <span className="opacity-50">•</span>
                        <span className="capitalize">{v.details.color}</span>
                      </>
                    )}

                    {(v.details.plateNumber || v.details.registrationNumber) && (
                      <>
                        <span className="opacity-50">•</span>
                        <span className="uppercase">{v.details.plateNumber || v.details.registrationNumber}</span>
                      </>
                    )}

                    {v.details.seats && (
                      <>
                        <span className="opacity-50">•</span>
                        <span>{v.details.seats} Seats</span>
                      </>
                    )}

                    {v.details.payloadCapacity && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground/30"></span>
                        <span>{v.details.payloadCapacity} T Payload</span>
                      </>
                    )}

                    {v.details.ac !== undefined && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-foreground/30"></span>
                        <span>{v.details.ac ? "AC" : "No AC"}</span>
                      </>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-card-border/50 pt-4">
                    {v.isRejected ? (
                      /* Rejected vehicle: only Reapply + small delete */
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setEditingVehicle(v)}
                          className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" /> Reapply
                        </button>
                        <button
                          onClick={() => initiateDelete(v.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors text-center"
                        >
                          Delete Application
                        </button>
                      </div>
                    ) : (
                      /* Normal vehicle actions */
                      <>
                        {v.isSuspendedByLimit ? (
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Link href="/vip" className="text-center text-xs text-red-500 hover:text-red-600 font-bold hover:underline">
                              Upgrade VIP to unlock this vehicle
                            </Link>
                            <button onClick={() => setShowVIPInfo(true)} className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition flex-shrink-0">
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null}

                        <button
                          onClick={() => setManagingServicesFor({ id: v.id, name: `${v.details.make} ${v.details.model}` })}
                          disabled={v.isSuspendedByLimit}
                          className={`w-full py-2 font-bold rounded-lg text-sm transition-colors ${v.isSuspendedByLimit ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white"}`}
                        >
                          Manage Routes & Services
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingVehicle(v)}
                            disabled={v.isSuspendedByLimit}
                            className={`flex-1 py-2 border font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${v.isSuspendedByLimit ? "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-400 cursor-not-allowed" : "bg-card-bg border-card-border hover:bg-card-border/50 text-foreground/80"}`}
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => initiateDelete(v.id)}
                            className="flex-1 py-2 bg-red-500/10 text-red-500 font-bold rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                          {hasShareBenefit() && v.isApproved && (
                            <button
                              onClick={() => handleShare(v)}
                              title="Share Vehicle"
                              className="px-3 py-2 bg-blue-500/10 text-blue-500 font-bold rounded-lg hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-xl font-bold text-red-500 mb-4">Delete Vehicle</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              This action is irreversible. All this vehicle's data will be permanently wiped from our database.
              To confirm, please type the following code:
            </p>
            <div className="bg-gray-100 dark:bg-slate-800/50 p-4 rounded-lg text-center tracking-[0.3em] font-mono text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100 shadow-inner">
              {deleteCode}
            </div>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
              placeholder="Enter code here"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all mb-8 text-center font-mono tracking-widest uppercase shadow-sm"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting || deleteInput !== deleteCode}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:hover:bg-red-500 shadow-sm flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
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

      {/* ImageViewer Overlay */}
      {viewerState.isOpen && (
        <ImageViewerOverlay
          images={viewerState.images}
          initialIndex={viewerState.initialIndex}
          singleMode={viewerState.singleMode}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* VIP Info Overlay */}
      {showVIPInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowVIPInfo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Why Upgrade to VIP?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed text-sm">
              Unlock the full potential of your driver account. Our VIP membership gives you exclusive benefits designed to maximize your earnings.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Register multiple vehicles simultaneously</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Stand out with an exclusive VIP badge on your profile</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Instantly unlock suspended vehicles in your garage</span>
              </li>
            </ul>
            <Link href="/vip" onClick={() => setShowVIPInfo(false)} className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all hover:scale-[1.02]">
              View VIP Plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
