"use client";

import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { X, Loader2, Camera, Save, ImageIcon } from "lucide-react";
import { toast } from "react-hot-toast";

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
      interior: !isTwoWheeler && !isSpecial,
      exterior: isSpecial,
      cargoSpace: isHeavy,
      cockpit: isSpecial,
    },
    docs: {
      show: !isSpecial,
      roadWorthiness: !isTwoWheeler && !isSpecial,
    },
  };
};

const imageLabels: Record<string, string> = {
  front: "Front View",
  back: "Back View",
  side: "Side View",
  interior: "Interior",
  exterior: "Exterior",
  cargoSpace: "Cargo Space",
  cockpit: "Cockpit",
};

const docLabels: Record<string, string> = {
  license: "Driver's License",
  insurance: "Insurance",
  registration: "Vehicle Reg.",
  roadWorthiness: "Road Worthiness",
};

interface EditVehicleModalProps {
  vehicle: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVehicleModal({ vehicle, onClose, onSaved }: EditVehicleModalProps) {
  const config = getFieldConfig(vehicle.category);

  // Text form state
  const [form, setForm] = useState({
    make: vehicle.details?.make || "",
    model: vehicle.details?.model || "",
    year: vehicle.details?.year || "",
    seats: vehicle.details?.seats || "",
    ac: vehicle.details?.ac ?? true,
    plateNumber: vehicle.details?.plateNumber || "",
    registrationNumber: vehicle.details?.registrationNumber || "",
    payloadCapacity: vehicle.details?.payloadCapacity || "",
    totalCapacity: vehicle.details?.totalCapacity || "",
  });

  const [saving, setSaving] = useState(false);

  // Image replacement state
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [updatedImages, setUpdatedImages] = useState<Record<string, string>>({ ...vehicle.images });
  const [updatedDocs, setUpdatedDocs] = useState<Record<string, string>>({ ...vehicle.documents });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<{ type: "images" | "docs"; key: string } | null>(null);

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const triggerFileUpload = (type: "images" | "docs", key: string) => {
    setActiveUploadKey({ type, key });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadKey) return;

    const { type, key } = activeUploadKey;
    const uploadLabel = type === "images" ? imageLabels[key] : docLabels[key];

    try {
      setUploadingImage(`${type}_${key}`);
      const url = await uploadImageToCloudinary(file);

      if (type === "images") {
        setUpdatedImages((prev) => ({ ...prev, [key]: url }));
      } else {
        setUpdatedDocs((prev) => ({ ...prev, [key]: url }));
      }

      toast.success(`${uploadLabel} updated!`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Failed to upload ${uploadLabel}`);
    } finally {
      setUploadingImage(null);
      setActiveUploadKey(null);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.make || !form.model || !form.year) {
      toast.error("Make, Model, and Year are required.");
      return;
    }

    try {
      setSaving(true);

      const detailsToSave: any = {
        make: form.make,
        model: form.model,
        year: form.year,
      };

      if (config.details.seats) detailsToSave.seats = form.seats;
      if (config.details.ac) detailsToSave.ac = form.ac;
      if (config.details.payload) detailsToSave.payloadCapacity = form.payloadCapacity;
      if (config.details.capacity) detailsToSave.totalCapacity = form.totalCapacity;
      if (config.details.plateNumber) detailsToSave.plateNumber = form.plateNumber;
      if (config.details.registrationNumber) detailsToSave.registrationNumber = form.registrationNumber;

      await updateDoc(doc(db, "vehicles", vehicle.id), {
        details: detailsToSave,
        images: updatedImages,
        documents: updatedDocs,
      });

      toast.success("Vehicle updated successfully!");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error updating vehicle:", err);
      toast.error("Failed to update vehicle.");
    } finally {
      setSaving(false);
    }
  };

  // Get active images and docs for this category
  const activeImages = Object.entries(config.images)
    .filter(([_, show]) => show)
    .map(([key]) => key);

  const activeDocs = config.docs.show
    ? Object.entries(config.docs)
        .filter(([key, show]) => key !== "show" && show)
        .map(([key]) => key)
        .concat(["license", "insurance", "registration"])
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="w-full max-w-2xl max-h-[90vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-card-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-brand-primary text-white flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">Edit Vehicle</h2>
            <p className="text-xs text-white/70 capitalize">{vehicle.category} — {vehicle.details?.make} {vehicle.details?.model}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Text Details */}
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">1</span>
              General Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input
                  value={form.make}
                  onChange={(e) => handleChange("make", e.target.value)}
                  placeholder="e.g. Toyota"
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  value={form.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="e.g. Camry"
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year Manufactured</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                  placeholder="e.g. 2018"
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {config.details.plateNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Plate Number</label>
                  <input
                    value={form.plateNumber}
                    onChange={(e) => handleChange("plateNumber", e.target.value)}
                    placeholder="ABC-123-XY"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )}

              {config.details.registrationNumber && (
                <div>
                  <label className="block text-sm font-medium mb-1">Registration / Tail Number</label>
                  <input
                    value={form.registrationNumber}
                    onChange={(e) => handleChange("registrationNumber", e.target.value)}
                    placeholder="e.g. N12345"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )}

              {config.details.seats && (
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Seats</label>
                  <input
                    type="number"
                    value={form.seats}
                    onChange={(e) => handleChange("seats", e.target.value)}
                    placeholder="4"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )}

              {config.details.payload && (
                <div>
                  <label className="block text-sm font-medium mb-1">Payload Capacity (Tons)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.payloadCapacity}
                    onChange={(e) => handleChange("payloadCapacity", e.target.value)}
                    placeholder="e.g. 15.5"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )}

              {config.details.capacity && (
                <div>
                  <label className="block text-sm font-medium mb-1">Total Capacity</label>
                  <input
                    value={form.totalCapacity}
                    onChange={(e) => handleChange("totalCapacity", e.target.value)}
                    placeholder="e.g. 150 Passengers"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              )}

              {config.details.ac && (
                <div className="flex items-center gap-3 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="edit-ac"
                    checked={form.ac}
                    onChange={(e) => handleChange("ac", e.target.checked)}
                    className="w-5 h-5 accent-brand-primary rounded"
                  />
                  <label htmlFor="edit-ac" className="font-medium cursor-pointer">AC is working</label>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Images */}
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">2</span>
              Vehicle Images
              <span className="text-xs font-normal text-foreground/50 ml-1">Tap an image to replace it</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
              {activeImages.map((key) => {
                const currentUrl = updatedImages[key];
                const isUploading = uploadingImage === `images_${key}`;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => triggerFileUpload("images", key)}
                    disabled={isUploading}
                    className="relative group border border-dashed border-card-border rounded-xl overflow-hidden aspect-square flex items-center justify-center bg-card-bg/50 hover:border-brand-primary/50 transition-all"
                  >
                    {currentUrl ? (
                      <>
                        <img src={currentUrl} alt={imageLabels[key]} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                            <Camera className="w-5 h-5 text-white" />
                            <span className="text-[10px] text-white font-bold">Change</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-foreground/40">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Add {imageLabels[key]}</span>
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}

                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold py-1 text-center uppercase tracking-wider">
                      {imageLabels[key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Documents */}
          {config.docs.show && (
            <div className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">3</span>
                Documents
                <span className="text-xs font-normal text-foreground/50 ml-1">Tap to replace a document</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card-bg/30 p-4 rounded-2xl border border-card-border/50">
                {activeDocs.map((key) => {
                  const currentUrl = updatedDocs[key];
                  const isUploading = uploadingImage === `docs_${key}`;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => triggerFileUpload("docs", key)}
                      disabled={isUploading}
                      className="relative group border border-dashed border-card-border rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center bg-card-bg/50 hover:border-brand-primary/50 transition-all"
                    >
                      {currentUrl ? (
                        <>
                          <img src={currentUrl} alt={docLabels[key]} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                              <Camera className="w-5 h-5 text-white" />
                              <span className="text-[10px] text-white font-bold">Change</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-foreground/40">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[10px] font-medium text-center px-2">{docLabels[key]}</span>
                        </div>
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}

                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold py-1 text-center uppercase tracking-wider">
                        {docLabels[key] || key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-card-border flex gap-3 flex-shrink-0 bg-card-bg/30">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-card-border rounded-xl font-bold text-sm hover:bg-card-border/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-brand-secondary to-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
