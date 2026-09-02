"use client";

import { useState, useEffect, useRef } from "react";
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
  middleName: z.string().optional(),
  phone: z.string().min(10, "Valid phone number required"),
  age: z.string().refine((val) => parseInt(val) >= 19, {
    message: "You must be at least 19 years old",
  }),
  identityNumber: z.string().min(5, "Identity number required"),
  operatingCity: z.string().min(2, "City is required"),
  operatingState: z.string().min(2, "State is required"),
  whatsappEnabled: z.boolean().optional(),
});

type DriverFormData = z.infer<typeof driverSchema>;

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara", "FCT - Abuja",
];

export default function DriverRegistration() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [idImagePreview, setIdImagePreview] = useState<string | null>(null);
  const nameSetRef = useRef(false);

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
      whatsappEnabled: false,
    },
  });

  const phoneValue = watch("phone");

  // Pre-fill names from display name
  useEffect(() => {
    if (!loading && !nameSetRef.current && (user || profile)) {
      if (profile?.phone) setValue("phone", profile.phone);
      if (profile?.age) setValue("age", profile.age);
      if (profile?.identityNumber) setValue("identityNumber", profile.identityNumber);
      if (profile?.operatingCity) setValue("operatingCity", profile.operatingCity);
      if (profile?.operatingState) setValue("operatingState", profile.operatingState);
      if (profile?.whatsappEnabled !== undefined) setValue("whatsappEnabled", profile.whatsappEnabled);

      // If the profile already has a distinct last name, trust the existing fields
      if (profile?.lastName) {
        if (profile?.firstName) setValue("firstName", profile.firstName);
        if (profile?.middleName) setValue("middleName", profile.middleName);
        if (profile?.lastName) setValue("lastName", profile.lastName);
        nameSetRef.current = true;
        return;
      }

      // Otherwise, take whatever name we have and split it
      const rawName = profile?.firstName || user?.displayName || profile?.username || "";
      const parts = rawName.trim().split(/\s+/).filter(Boolean);

      let first = "";
      let middle = "";
      let last = "";

      if (parts.length === 1) {
        first = parts[0];
      } else if (parts.length === 2) {
        first = parts[0];
        middle = parts[1];
      } else if (parts.length >= 3) {
        first = parts[0];
        middle = parts.slice(1, -1).join(" ");
        last = parts[parts.length - 1];
      }

      if (first) setValue("firstName", first);
      if (middle) setValue("middleName", middle);
      if (last) setValue("lastName", last);

      if (first || middle || last || rawName) {
        nameSetRef.current = true;
      }
    }
  }, [user, profile, loading, setValue]);

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
              <label className="block text-sm font-medium mb-1">Middle Name (Optional)</label>
              <input
                {...register("middleName")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="Hassan"
              />
              {errors.middleName && <p className="text-brand-accent text-xs mt-1">{errors.middleName.message}</p>}
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                {...register("phone")}
                className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
              />
              {errors.phone && <p className="text-brand-accent text-xs mt-1">{errors.phone.message}</p>}

              <div className="flex items-center gap-2 mt-3 ml-1">
                <input
                  type="checkbox"
                  id="whatsappEnabled"
                  {...register("whatsappEnabled")}
                  className="w-4 h-4 rounded text-[#25D366] focus:ring-[#25D366] bg-transparent border-gray-300"
                />
                <label htmlFor="whatsappEnabled" className="text-xs md:text-sm text-foreground/80 flex items-center gap-1 cursor-pointer select-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#25D366]">
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                  Available on WhatsApp
                </label>
              </div>
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
            <label className="block text-sm font-medium mb-1">ID Number <span className="dark:text-yellow-500  text-yellow-700 text-[10px] md:text-sm font-medium text-foreground/80"> (NIN/Driver's License/Int. Passport/Voters Card)</span></label>
            <input
              {...register("identityNumber")}
              className="w-full px-3 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
              placeholder="Enter ID Number"
            />
            {errors.identityNumber && <p className="text-brand-accent text-xs mt-1">{errors.identityNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload Identity Image</label>
            <div className="border-2 border-dashed border-card-border rounded-xl h-40 md:h-48 text-center hover:bg-card-bg/50 transition-colors cursor-pointer relative overflow-hidden flex flex-col items-center justify-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIdFile(file);
                    setIdImagePreview(URL.createObjectURL(file));
                  } else {
                    setIdFile(null);
                    setIdImagePreview(null);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {idImagePreview ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={idImagePreview} alt="ID Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-0">
                    <p className="text-white font-medium text-sm">Click to change image</p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-foreground/50" />
                  <p className="text-sm font-medium">
                    Click or drag image to upload
                  </p>
                </>
              )}
            </div>
            {uploadError && <p className="text-brand-accent text-xs mt-1">{uploadError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Operating City</label>
              <input
                {...register("operatingCity")}
                className="w-full px-2 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                placeholder="Ikeja"
              />
              {errors.operatingCity && <p className="text-brand-accent text-[10px] md:text-xs mt-1">{errors.operatingCity.message}</p>}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Operating State</label>
              <select
                {...register("operatingState")}
                className="w-full px-2 py-2 md:px-4 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base rounded-xl"
              >
                <option value="">Select State</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.operatingState && <p className="text-brand-accent text-[10px] md:text-xs mt-1">{errors.operatingState.message}</p>}
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

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3 bg-transparent text-foreground/70 hover:text-foreground font-medium text-sm md:text-base transition-colors flex justify-center items-center"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
