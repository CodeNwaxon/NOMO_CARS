"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, UploadCloud } from "lucide-react";

const driverSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().optional(),
  phone: z.string().min(10, "Valid phone number required"),
  age: z.string().refine((val) => parseInt(val) >= 18, {
    message: "You must be at least 18 years old",
  }),
  identityNumber: z.string().min(5, "Identity number required"),
  operatingCity: z.string().min(2, "City is required"),
  operatingState: z.string().min(2, "State is required"),
});

type DriverFormData = z.infer<typeof driverSchema>;

export default function DriverRegistration() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      phone: "+234",
    },
  });

  const phoneValue = watch("phone");

  // Handle +234 logic
  useEffect(() => {
    if (phoneValue && !phoneValue.startsWith("+234")) {
      // If user deletes +234, put it back or format it
      const cleaned = phoneValue.replace(/\D/g, "");
      if (cleaned.startsWith("234")) {
        setValue("phone", "+" + cleaned);
      } else if (cleaned.startsWith("0")) {
        setValue("phone", "+234" + cleaned.substring(1));
      } else {
        setValue("phone", "+234" + cleaned);
      }
    }
  }, [phoneValue, setValue]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/driver");
    } else if (profile?.role === "driver") {
      router.push("/driver/dashboard");
    }
  }, [user, profile, loading, router]);

  const onSubmit = async (data: DriverFormData) => {
    if (!idFile) {
      setUploadError("Identity image is required");
      return;
    }

    if (!user) return;

    try {
      setIsSubmitting(true);
      setUploadError("");

      // 1. Upload ID Image to Cloudinary
      const imageUrl = await uploadImageToCloudinary(idFile);

      // 2. Update Firestore Document
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        ...data,
        identityImage: imageUrl,
        role: "driver",
        isApproved: false,
      });

      // 3. Refresh Profile and redirect
      await refreshProfile();
      router.push("/driver/awaiting-approval");
    } catch (error) {
      console.error("Error submitting form:", error);
      setUploadError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-6 relative">
      <div className="max-w-2xl mx-auto glass-panel rounded-3xl p-8 md:p-12 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
            Driver Registration
          </h1>
          <p className="text-foreground/70">
            Join our premium network of drivers. Please provide your details below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                {...register("firstName")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                placeholder="John"
              />
              {errors.firstName && <p className="text-brand-accent text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                {...register("lastName")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                placeholder="Doe"
              />
              {errors.lastName && <p className="text-brand-accent text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Middle Name (Optional)</label>
            <input
              {...register("middleName")}
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              placeholder="Smith"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                {...register("phone")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
              {errors.phone && <p className="text-brand-accent text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input
                type="number"
                {...register("age")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                placeholder="25"
              />
              {errors.age && <p className="text-brand-accent text-xs mt-1">{errors.age.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Identity Number (NIN/Driver's License)</label>
            <input
              {...register("identityNumber")}
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              placeholder="Enter ID Number"
            />
            {errors.identityNumber && <p className="text-brand-accent text-xs mt-1">{errors.identityNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload Identity Image</label>
            <div className="border-2 border-dashed border-card-border rounded-xl p-8 text-center hover:bg-card-bg/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 mx-auto mb-2 text-foreground/50" />
              <p className="text-sm font-medium">
                {idFile ? idFile.name : "Click or drag image to upload"}
              </p>
            </div>
            {uploadError && <p className="text-brand-accent text-xs mt-1">{uploadError}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Operating City</label>
              <input
                {...register("operatingCity")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                placeholder="Lagos"
              />
              {errors.operatingCity && <p className="text-brand-accent text-xs mt-1">{errors.operatingCity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Operating State</label>
              <input
                {...register("operatingState")}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                placeholder="Lagos State"
              />
              {errors.operatingState && <p className="text-brand-accent text-xs mt-1">{errors.operatingState.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-brand-primary/30 transition-all hover:scale-[1.01] disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
