"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().optional(),
  phone: z.string().min(10, "Valid phone number required"),
  age: z.string().refine((val) => parseInt(val) >= 18, {
    message: "You must be at least 18 years old",
  }),
  operatingCity: z.string().min(2, "City is required"),
  operatingState: z.string().min(2, "State is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileTab({ profile, userId }: { profile: any; userId: string }) {
  const { refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName || "",
      phone: profile.phone,
      age: profile.age,
      operatingCity: profile.operatingCity,
      operatingState: profile.operatingState,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      setMessage("");
      
      const docRef = doc(db, "users", userId);
      await updateDoc(docRef, {
        ...data,
      });

      await refreshProfile();
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl glass-panel rounded-3xl p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg font-medium hover:bg-brand-primary/20 transition-colors"
        >
          {isEditing ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 ${message.includes("success") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">First Name</label>
            <input
              {...register("firstName")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
            {errors.firstName && <p className="text-brand-accent text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">Last Name</label>
            <input
              {...register("lastName")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground/70">Middle Name</label>
          <input
            {...register("middleName")}
            disabled={!isEditing}
            className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">Phone Number</label>
            <input
              {...register("phone")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">Age</label>
            <input
              type="number"
              {...register("age")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">Operating City</label>
            <input
              {...register("operatingCity")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground/70">Operating State</label>
            <input
              {...register("operatingState")}
              disabled={!isEditing}
              className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 disabled:opacity-70"
            />
          </div>
        </div>
        
        <div>
           <label className="block text-sm font-medium mb-1 text-foreground/70">Identity Number (Non-editable)</label>
           <input
             value={profile.identityNumber || ""}
             disabled
             className="w-full bg-background/30 border border-card-border/50 rounded-xl px-4 py-3 opacity-60 cursor-not-allowed"
           />
        </div>

        {isEditing && (
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-brand-primary text-white rounded-xl font-medium shadow-lg hover:bg-brand-primary/90 transition-colors flex justify-center items-center gap-2"
          >
            {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </form>
    </div>
  );
}
