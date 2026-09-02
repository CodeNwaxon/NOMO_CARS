"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  User, Phone, Star, Camera, Check, X, LogOut, MessageCircle, MapPin, Car, CarFront
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { toast } from "react-hot-toast";

export default function PassengerDashboard() {
  const { user, profile, refreshProfile, signOut, loading: authLoading, deleteAccount } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    username: profile?.username || "",
    phone: profile?.phone || "",
    displayImage: profile?.displayImage || "",
    whatsappEnabled: profile?.whatsappEnabled ?? true,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-secondary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      let formattedPhone = formData.phone.trim();
      
      if (formattedPhone) {
        if (!/^\+?[0-9]+$/.test(formattedPhone)) {
          toast.error("Phone number should only contain numbers.");
          return;
        }
        
        const digits = formattedPhone.replace(/\D/g, "");
        if (digits.length !== 11 && digits.length !== 13) {
          toast.error("Please enter a valid 11-digit phone number (e.g., 07012345678).");
          return;
        }
      }

      setLoading(true);
      const docRef = doc(db, "users", user.uid);

      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+234" + formattedPhone.substring(1);
      }

      let finalImageUrl = formData.displayImage;
      if (imageFile) {
        setUploadingImage(true);
        finalImageUrl = await uploadImageToCloudinary(imageFile);
        setUploadingImage(false);
      }

      await updateDoc(docRef, {
        firstName: formData.firstName,
        username: formData.username,
        phone: formattedPhone,
        displayImage: finalImageUrl,
        whatsappEnabled: formData.whatsappEnabled,
      });
      
      setFormData(prev => ({ ...prev, phone: formattedPhone, displayImage: finalImageUrl }));
      setImageFile(null);
      setImagePreview(null);
      await refreshProfile();
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
      setUploadingImage(false);
    } finally {
      setLoading(false);
    }
  };

  const initiateDelete = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDeleteCode(code);
    setDeleteInput("");
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteInput !== deleteCode) {
      toast.error("Confirmation code does not match.");
      return;
    }
    try {
      setIsDeleting(true);
      await deleteAccount();
      toast.success("Account deleted successfully.");
      router.push("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please sign out and sign in again before deleting your account.");
      } else {
        toast.error("Failed to delete account. Please try again.");
      }
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const renderStars = (rating: number = 5) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-foreground/20"}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background pt-6 pb-18 px-4 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="flex justify-between items-start md:items-center mb-10 gap-2 md:gap-4">
          <div>
            <h1 className="md:text-4xl text-xl font-bold md:mb-2 mb-0">My Dashboard</h1>
            <p className="text-[10px] md:text-sm text-foreground/70">Manage your passenger profile and preferences.</p>
          </div>
          <button
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="text-xs flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="glass-panel rounded-xl md:rounded-3xl p-8 lg:col-span-1 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-border shadow-xl">
                {imagePreview || formData.displayImage || user.photoURL ? (
                  <img src={imagePreview || formData.displayImage || user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-4xl">
                    {(formData.username || user.email)?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 p-3 bg-brand-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize">{formData.username || user.displayName || "User"}</h2>
            <p className="text-sm text-foreground/60 mb-4">{user.email}</p>

            <div className="flex items-center gap-1 bg-card-border/50 px-4 py-2 rounded-full mb-6 shadow-inner">
              {renderStars(profile?.rating || 5.0)}
              <span className="ml-2 font-bold text-sm">{(profile?.rating || 5.0).toFixed(1)}</span>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-brand-primary/10 text-brand-primary font-semibold rounded-xl hover:bg-brand-primary hover:text-white transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setImageFile(null);
                    setImagePreview(null);
                    // Revert changes
                    setFormData({
                      firstName: profile?.firstName || "",
                      username: profile?.username || "",
                      phone: profile?.phone || "",
                      displayImage: profile?.displayImage || "",
                      whatsappEnabled: profile?.whatsappEnabled ?? true,
                    });
                  }}
                  className="flex-1 py-3 bg-card-border hover:bg-foreground/10 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || uploadingImage}
                  className="flex-1 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Check className="w-4 h-4" /> {loading ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2 glass-panel rounded-xl md:rounded-3xl p-8 flex flex-col justify-center">
            <h3 className="text-xl font-bold mb-6 border-b border-card-border pb-4">Personal Information</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Display Name (Username)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-card-border focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="E.g. FastRider99"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-card-border/30 rounded-xl">
                    <User className="w-5 h-5 text-brand-primary" />
                    <span className="font-medium">{profile?.username || "Not set"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-card-border focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-card-border/30 rounded-xl">
                    <User className="w-5 h-5 text-brand-secondary" />
                    <span className="font-medium">{profile?.firstName || "Not set"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Phone Number</label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-card-border focus:outline-none focus:border-brand-primary transition-colors"
                      placeholder="E.g. +1234567890"
                    />
                    <button
                      onClick={() => setFormData({ ...formData, whatsappEnabled: !formData.whatsappEnabled })}
                      type="button"
                      className={`p-3 rounded-xl shadow-lg transition-colors flex items-center justify-center min-w-[50px] ${formData.whatsappEnabled ? "bg-green-500 text-white hover:bg-green-600" : "bg-card-border text-foreground/50 hover:bg-card-border/80"} hover:scale-105`}
                      title={formData.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 px-4 py-3 bg-card-border/30 rounded-xl flex-1">
                      <Phone className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{profile?.phone || "Not set"}</span>
                    </div>
                    {profile?.phone && profile?.whatsappEnabled !== false && (
                      <a
                        href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-green-500 text-white rounded-xl shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center hover:scale-105"
                        title="Open in WhatsApp"
                      >
                        <MessageCircle className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-row items-center gap-2 md:gap-4 justify-center w-full">
          {profile?.role !== "driver" && (
            <Link
              href="/driver/register"
              className="flex-1 sm:flex-none sm:w-auto px-2 py-3 md:px-8 md:py-4 bg-brand-primary text-white text-xs md:text-base font-bold rounded-md md:rounded-xl shadow-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-1 md:gap-2 hover:scale-105 whitespace-nowrap"
            >
              <CarFront className="w-3.5 h-3.5 md:w-5 md:h-5" />
              Become a Driver
            </Link>
          )}
          <Link
            href="/passenger"
            className="flex-1 sm:flex-none sm:w-auto px-2 py-3 md:px-8 md:py-4 bg-brand-secondary text-white text-xs md:text-base font-bold rounded-md md:rounded-xl shadow-lg hover:bg-brand-secondary/90 transition-all flex items-center justify-center gap-1 md:gap-2 hover:scale-105 whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5 md:w-5 md:h-5" />
            Book a Ride
          </Link>
        </div>

        {/* Delete Account Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={initiateDelete}
            className="text-red-500/70 hover:text-red-500 text-sm font-medium underline transition-colors"
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-card-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-500 mb-4">Delete Account</h3>
            <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
              This action is irreversible. All your data will be permanently wiped from our database.
              To confirm, please type the following code:
            </p>
            <div className="bg-card-border/30 p-4 rounded-lg text-center tracking-[0.3em] font-mono text-2xl font-bold mb-6 text-foreground">
              {deleteCode}
            </div>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
              placeholder="Enter code here"
              className="w-full px-4 py-3 rounded-xl bg-background border border-card-border focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all mb-8 text-center font-mono tracking-widest uppercase"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-card-border hover:bg-foreground/10 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting || deleteInput !== deleteCode}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:hover:bg-red-500"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
