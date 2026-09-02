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
import { Loader2, UploadCloud, Camera } from "lucide-react";

const driverSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().min(2, "Middle name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  age: z.string().refine((val) => parseInt(val) >= 19, {
    message: "You must be at least 19 years old",
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
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  // Initialize preview with Google image if available
  useEffect(() => {
    if (profile?.displayImage && !profilePicPreview && !profilePicFile) {
      setProfilePicPreview(profile.displayImage);
    }
  }, [profile?.displayImage, profilePicPreview, profilePicFile]);

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

      // 1. Upload Images to Cloudinary
      const imageUrl = await uploadImageToCloudinary(idFile);

      let finalPhotoURL = profile?.displayImage || "";
      if (profilePicFile) {
        finalPhotoURL = await uploadImageToCloudinary(profilePicFile);
      }

      // 2. Update Firestore Document
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        ...data,
        displayImage: finalPhotoURL,
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
    <div className="min-h-screen py-6 md:py-10 px-3 md:px-6 relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Dynamic overlay for dark/light mode */}
      <div className="absolute inset-0 dark:bg-black/80 bg-white/90 z-0 transition-colors duration-300"></div>

      <div className="max-w-2xl mx-auto glass-panel rounded md:rounded-3xl p-3 md:p-12 relative z-10 bg-background/50 backdrop-blur-md">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
            Driver Registration
          </h1>
          <p className="text-xs md:text-sm text-foreground/70">
            Please fill in your details below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center mb-6 relative">
            <div className="relative mb-2">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-bg shadow-lg">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <UploadCloud className="w-6 h-6 md:w-8 md:h-8 text-foreground/50" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("profilePicInput")?.click()}
                className="absolute bottom-0 right-0 p-2 md:p-3 bg-brand-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input
                id="profilePicInput"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setProfilePicFile(file);
                    setProfilePicPreview(URL.createObjectURL(file));
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                {...register("firstName")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="Emeka"
              />
              {errors.firstName && <p className="text-brand-accent text-xs mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                {...register("lastName")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="Adeyemi"
              />
              {errors.lastName && <p className="text-brand-accent text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Middle Name</label>
            <input
              {...register("middleName")}
              className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
              placeholder="Hassan"
            />
            {errors.middleName && <p className="text-brand-accent text-xs mt-1">{errors.middleName.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                {...register("phone")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
              />
              {errors.phone && <p className="text-brand-accent text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              {errors.age && <p className="text-brand-accent text-xs mb-1">{errors.age.message}</p>}
              <input
                type="number"
                {...register("age")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="25"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Identity Number (NIN/Driver's License)</label>
            <input
              {...register("identityNumber")}
              className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
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
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="Lagos"
              />
              {errors.operatingCity && <p className="text-brand-accent text-xs mt-1">{errors.operatingCity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Operating State</label>
              <input
                {...register("operatingState")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
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
