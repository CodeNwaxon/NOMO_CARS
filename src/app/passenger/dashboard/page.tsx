"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  User, Phone, Star, Camera, Check, X, LogOut, MessageCircle, MapPin, Car, CarFront, Share2, Crown, ArrowLeft
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { toast } from "react-hot-toast";
import { checkUsernameUnique } from "@/lib/userUtils";
import ShareOverlay from "@/components/ShareOverlay";
import { websiteLink, getVIPBadge, VIP_PLANS } from "@/lib/constants";
import { useChat } from "@/context/ChatContext";
import MessagesTab from "@/app/driver/dashboard/MessagesTab";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function PassengerDashboard() {
  const { user, profile, refreshProfile, signOut, loading: authLoading, deleteAccount } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { totalUnread } = useChat();

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    username: profile?.username && profile.username !== user?.displayName ? profile.username : (user?.displayName?.split(" ")[0] || profile?.username?.split(" ")[0] || ""),
    phone: profile?.phone || "",
    displayImage: profile?.displayImage || "",
    whatsappEnabled: profile?.whatsappEnabled ?? true,
  });

  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Auto-open messages tab from notification link
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("tab") === "messages") {
      setShowMessages(true);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        username: profile.username && profile.username !== user?.displayName ? profile.username : (user?.displayName?.split(" ")[0] || profile?.username?.split(" ")[0] || ""),
        phone: profile.phone || "",
        displayImage: profile.displayImage || "",
        whatsappEnabled: profile.whatsappEnabled ?? true,
      });
    }
  }, [profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-6 pb-18 px-4 md:p-12 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto z-10 relative">
          <div className="flex justify-between items-start md:items-center mb-10 gap-2 md:gap-4">
            <div>
              <div className="h-8 md:h-10 w-48 bg-foreground/10 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-64 bg-foreground/10 animate-pulse rounded"></div>
            </div>
            <div className="h-10 w-24 bg-foreground/10 animate-pulse rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-panel rounded-xl md:rounded-3xl p-8 lg:col-span-1 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full bg-foreground/10 animate-pulse mb-6 shadow-xl"></div>
              <div className="h-6 w-32 bg-foreground/10 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-48 bg-foreground/10 animate-pulse rounded mb-6"></div>
              <div className="w-full h-12 bg-foreground/10 animate-pulse rounded-xl"></div>
            </div>
            <div className="glass-panel rounded-xl md:rounded-3xl p-6 lg:col-span-2">
              <div className="h-6 w-40 bg-foreground/10 animate-pulse rounded mb-6"></div>
              <div className="space-y-6">
                <div className="h-12 w-full bg-foreground/10 animate-pulse rounded-xl"></div>
                <div className="h-12 w-full bg-foreground/10 animate-pulse rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
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

  const getDisplayName = () => {
    if (!user) return "";
    const googleName = user.displayName;
    const currentName = profile?.username;

    if (currentName && currentName !== googleName) {
      return currentName;
    }

    if (googleName) return googleName.split(" ")[0];
    if (currentName) return currentName.split(" ")[0];
    return "User";
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

      // Check username uniqueness
      const currentUsername = profile?.username && profile.username !== user?.displayName ? profile.username : (user?.displayName?.split(" ")[0] || "");
      if (formData.username && formData.username !== currentUsername) {
        const isUnique = await checkUsernameUnique(formData.username, user.uid);
        if (!isUnique) {
          toast.error("Username is already taken. Please choose another one.");
          setLoading(false);
          return;
        }
      }

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

  const toggleWhatsAppPreference = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid);
      const newValue = !(profile?.whatsappEnabled ?? true);
      await updateDoc(docRef, {
        whatsappEnabled: newValue
      });
      setFormData(prev => ({ ...prev, whatsappEnabled: newValue }));
      await refreshProfile();
      toast.success(newValue ? "WhatsApp notifications enabled" : "WhatsApp notifications disabled");
    } catch (error) {
      console.error("Error toggling WhatsApp:", error);
      toast.error("Failed to update preference.");
    }
  };

  const initiateDelete = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    // Guarantee at least one letter and one number
    let codeArr = [
      letters[Math.floor(Math.random() * letters.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ];

    const all = letters + numbers;
    for (let i = 0; i < 6; i++) {
      codeArr.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle the characters
    const code = codeArr.sort(() => Math.random() - 0.5).join('');

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
      if (error.message === 'reauth-failed') {
        toast.error("Authentication required to delete your account.");
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

  const vipBadge = getVIPBadge(profile?.vipStars || 0);
  const activeVipPlan = profile?.vipStars ? VIP_PLANS.find(p => p.stars === profile?.vipStars) : null;

  return (
    <div className="min-h-screen bg-background pt-6 pb-18 px-2 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative">
        <div className="px-3 md:px-0 flex justify-between items-start md:items-center mb-10 gap-2 md:gap-4">
          <div>
            <h1 className="md:text-4xl text-xl font-bold md:mb-2 mb-0">My Dashboard</h1>
            <p className="text-[10px] md:text-sm text-foreground/70">Manage your passenger profile and preferences.</p>
          </div>
          <button
            onClick={() => setShowMessages(!showMessages)}
            className={`relative flex items-center gap-1.5 p-2 rounded-lg transition-colors ${showMessages ? "text-foreground/80 hover:bg-card-bg" : "text-brand-primary hover:bg-brand-primary/10"}`}
          >
            {showMessages ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span className="font-bold text-sm">Back</span>
              </>
            ) : (
              <>
                <span className="font-bold text-sm">Chat</span>
                <div className="relative">
                  <MessageCircle className="w-5 h-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </div>
              </>
            )}
          </button>
        </div>

        {showMessages ? (
          /* Messages View - same as driver dashboard Messages tab */
          <div className="pb-10">
            <MessagesTab userId={user.uid} />
          </div>
        ) : (
          <>
            <div className="px-4 md:px-0 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="glass-panel rounded-xl md:rounded-3xl p-4 lg:col-span-1 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  {vipBadge && (
                    <div className={`absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${vipBadge.colorClass}`}>
                      {vipBadge.tag}
                </div>
              )}
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-border shadow-xl">
                {imagePreview || (isEditing ? formData.displayImage : profile?.displayImage) || user.photoURL ? (
                  <img src={imagePreview || (isEditing ? formData.displayImage : profile?.displayImage) || user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-4xl uppercase">
                    {(isEditing ? formData.username : getDisplayName())?.charAt(0) || user.email?.charAt(0)}
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

            <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize w-full truncate px-2">{isEditing ? formData.username : getDisplayName()}</h2>
            <p className="text-sm text-foreground/60 mb-4 w-full truncate px-2">{user.email}</p>

            <div className="flex items-center gap-1 bg-card-border/50 px-4 py-2 rounded-full mb-6 shadow-inner">
              {renderStars(profile?.rating || 5.0)}
              <span className="ml-2 font-bold text-sm">{(profile?.rating || 5.0).toFixed(1)}</span>
            </div>

            {!isEditing ? (
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2 bg-brand-primary/10 text-brand-primary font-semibold rounded-xl hover:bg-brand-primary hover:text-white transition-colors"
                >
                  Edit Profile
                </button>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setShowShareOverlay(true)}
                    className="flex-1 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-1 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Share Link
                  </button>
                  <Link
                    href="/vip"
                    className={`flex-1 py-2 font-semibold rounded-xl transition-opacity flex justify-center items-center gap-1 text-sm shadow-md ${
                      activeVipPlan
                        ? (activeVipPlan.isPremium 
                            ? 'bg-gradient-to-br from-slate-900 to-black text-white hover:opacity-90 shadow-lg shadow-black/40 border border-slate-800' 
                            : `bg-gradient-to-r ${activeVipPlan.color} text-white hover:opacity-90`)
                        : 'bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:opacity-90'
                    }`}
                  >
                    <Crown className="w-4 h-4" /> 
                    {activeVipPlan ? `${activeVipPlan.tag} VIP` : 'Upgrade VIP'}
                  </Link>
                </div>
              </div>
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
                      username: profile?.username && profile.username !== user?.displayName ? profile.username : (user?.displayName?.split(" ")[0] || profile?.username?.split(" ")[0] || ""),
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
          <div className="lg:col-span-2 glass-panel rounded-xl md:rounded-3xl p-4 flex flex-col justify-center">
            <h3 className="text-xl font-bold mb-6 border-b border-card-border pb-4">Personal Information</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Display Name (Username)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="E.g. FastRider99"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-card-border/30 rounded-xl">
                    <User className="w-5 h-5 text-brand-primary" />
                    <span className="font-medium">{getDisplayName()}</span>
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
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="E.g. +1234567890"
                    />
                    <button
                      onClick={() => setFormData({ ...formData, whatsappEnabled: !formData.whatsappEnabled })}
                      type="button"
                      className={`p-3 rounded-xl shadow-lg transition-colors flex items-center justify-center min-w-[50px] hover:scale-105 ${formData.whatsappEnabled
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-200 text-gray-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700"
                        }`}
                      title={formData.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 px-4 py-3 bg-card-border/30 rounded-xl flex-1">
                      <Phone className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{profile?.phone || "Not set"}</span>
                    </div>
                    {profile?.phone && (
                      <button
                        onClick={toggleWhatsAppPreference}
                        className={`p-3 rounded-xl shadow-lg transition-colors flex items-center justify-center min-w-[50px] hover:scale-105 ${(profile?.whatsappEnabled ?? true)
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-200 text-gray-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700"
                          }`}
                        title={(profile?.whatsappEnabled ?? true) ? "WhatsApp Enabled - Click to Disable" : "WhatsApp Disabled - Click to Enable"}
                      >
                        <WhatsAppIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 mt-10 flex flex-row items-center gap-2 md:gap-4 justify-center w-full">
          {profile?.role !== "driver" && (
            <Link
              href="/driver/register?from=dashboard"
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

        {/* Sign Out Button */}
        <div className="mt-16 flex justify-center">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Delete Account Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={initiateDelete}
            className="text-red-500/70 hover:text-red-500 text-sm font-medium underline transition-colors"
          >
            Delete my account
          </button>
        </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-xl font-bold text-red-500 mb-4">Delete Account</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              This action is irreversible. All your data will be permanently wiped from our database.
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
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:hover:bg-red-500 shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Sign Out</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="flex-1 py-3 bg-brand-accent text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-brand-accent/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Overlay */}
      {showShareOverlay && user && profile && (
        <ShareOverlay
          onClose={() => setShowShareOverlay(false)}
          referralLink={`${websiteLink}/?ref=${user.uid}`}
          points={profile.points || 0}
        />
      )}
    </div>
  );
}
