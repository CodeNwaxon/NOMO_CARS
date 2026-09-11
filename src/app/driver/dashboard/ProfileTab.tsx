"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  User, Phone, Star, Camera, Check, X, LogOut, MapPin, CarFront, Share2, Crown, Ticket, Briefcase, Bus, Truck, Car, Info
} from "lucide-react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { toast } from "react-hot-toast";
import { checkUsernameUnique } from "@/lib/userUtils";
import ShareOverlay from "@/components/ShareOverlay";
import { websiteLink, getVIPBadge, freeTicketPlanDays, buildDriverSearchTokens } from "@/lib/constants";

const CATEGORIES = [
  { id: "car", name: "Car", icon: Car, bg: "bg-blue-500/10", color: "text-blue-500", hoverShadow: "hover:shadow-blue-500/20", hoverBorder: "hover:border-blue-500/50" },
  { id: "suv", name: "SUV", icon: CarFront, bg: "bg-brand-primary/10", color: "text-brand-primary", hoverShadow: "hover:shadow-brand-primary/20", hoverBorder: "hover:border-brand-primary/50" },
  { id: "minibus", name: "Mini Bus", icon: Bus, bg: "bg-orange-500/10", color: "text-orange-500", hoverShadow: "hover:shadow-orange-500/20", hoverBorder: "hover:border-orange-500/50" },
  { id: "bus", name: "Bus", icon: Bus, bg: "bg-amber-500/10", color: "text-amber-500", hoverShadow: "hover:shadow-amber-500/20", hoverBorder: "hover:border-amber-500/50" },
  { id: "truck", name: "Truck", icon: Truck, bg: "bg-red-500/10", color: "text-red-500", hoverShadow: "hover:shadow-red-500/20", hoverBorder: "hover:border-red-500/50" },
];

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

export default function ProfileTab({ profile, userId, onSignOut }: { profile: any; userId: string; onSignOut?: () => void }) {
  const { user, refreshProfile, deleteAccount } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [showBidCategoryModal, setShowBidCategoryModal] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultUsername = profile?.username || profile?.firstName || user?.displayName?.split(" ")[0] || "Driver";

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    middleName: profile?.middleName || "",
    lastName: profile?.lastName || "",
    username: defaultUsername,
    phone: profile?.phone || "",
    displayImage: profile?.displayImage || "",
    whatsappEnabled: profile?.whatsappEnabled ?? true,
    operatingCity: profile?.operatingCity || "",
    operatingState: profile?.operatingState || "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [startTicketCollection, setStartTicketCollection] = useState(true);
  const [ticketCollectionStartedAt, setTicketCollectionStartedAt] = useState<string | null>(null);
  const [ticketConfigLoaded, setTicketConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const pricingRef = doc(db, "adminSettings", "pricing");
        const snap = await getDoc(pricingRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.startTicketCollection !== undefined) {
            setStartTicketCollection(data.startTicketCollection);
          }
          if (data.ticketCollectionStartedAt) {
            setTicketCollectionStartedAt(
              data.ticketCollectionStartedAt.toDate 
                ? data.ticketCollectionStartedAt.toDate().toISOString() 
                : data.ticketCollectionStartedAt
            );
          }
        }
      } catch (err) {
        console.error("Error fetching pricing config:", err);
      } finally {
        setTicketConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  const vipBadge = getVIPBadge(profile?.vipStars || 0);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        middleName: profile.middleName || "",
        lastName: profile.lastName || "",
        username: profile.username || profile.firstName || user?.displayName?.split(" ")[0] || "Driver",
        phone: profile.phone || "",
        displayImage: profile.displayImage || "",
        whatsappEnabled: profile.whatsappEnabled ?? true,
        operatingCity: profile.operatingCity || "",
        operatingState: profile.operatingState || "",
      });
    }
  }, [profile, user]);

  if (!user) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const getDisplayName = () => {
    return profile?.username || profile?.firstName || user?.displayName?.split(" ")[0] || "Driver";
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

      if (!formData.firstName || !formData.lastName || !formData.operatingCity || !formData.operatingState) {
        toast.error("Please fill out all required fields.");
        return;
      }

      setLoading(true);

      const currentUsername = profile?.username || profile?.firstName || user?.displayName?.split(" ")[0] || "";
      if (formData.username && formData.username !== currentUsername) {
        const isUnique = await checkUsernameUnique(formData.username, userId);
        if (!isUnique) {
          toast.error("Username is already taken. Please choose another one.");
          setLoading(false);
          return;
        }
      }

      const docRef = doc(db, "users", userId);

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
        middleName: formData.middleName,
        lastName: formData.lastName,
        username: formData.username,
        phone: formattedPhone,
        displayImage: finalImageUrl,
        whatsappEnabled: formData.whatsappEnabled,
        operatingCity: formData.operatingCity,
        operatingState: formData.operatingState,
        searchTokens: buildDriverSearchTokens(formData.firstName, formData.middleName, formData.lastName, formData.username, formData.operatingCity, formData.operatingState),
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
      const docRef = doc(db, "users", userId);
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
        className={`w-4 h-4 md:w-5 md:h-5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-foreground/20"}`}
      />
    ));
  };

  const getTicketButtonInfo = () => {
    const now = new Date();
    let hasOwnTicket = false;
    let ownTicketMsLeft = 0;

    if (profile?.ticketExpiry) {
      const expiryDate = new Date(profile.ticketExpiry);
      ownTicketMsLeft = expiryDate.getTime() - now.getTime();
      if (ownTicketMsLeft > 0) hasOwnTicket = true;
    }

    // Check global free plan
    const defaultStart = ticketCollectionStartedAt ? new Date(ticketCollectionStartedAt) : new Date();
    
    let driverCreatedAtStr = null;
    if (profile?.createdAt) {
      driverCreatedAtStr = profile.createdAt.toDate ? profile.createdAt.toDate().toISOString() : profile.createdAt;
    }
    const driverStart = driverCreatedAtStr ? new Date(driverCreatedAtStr) : defaultStart;
    
    // The effective start date for their 90 days is whichever is later: when they joined, or when the button was turned on.
    const effectiveStartDate = new Date(Math.max(driverStart.getTime(), defaultStart.getTime()));
    const freePeriodEnd = new Date(effectiveStartDate.getTime() + freeTicketPlanDays * 24 * 60 * 60 * 1000);
    const globalFreeMsLeft = freePeriodEnd.getTime() - now.getTime();
    const hasGlobalFree = startTicketCollection && globalFreeMsLeft > 0;

    // If the user has their own ticket, it always overwrites the free plan
    if (hasOwnTicket) {
      const hoursLeft = Math.floor(ownTicketMsLeft / (1000 * 60 * 60));
      const daysLeft = Math.floor(hoursLeft / 24);
      const minutesLeft = Math.floor(ownTicketMsLeft / (1000 * 60));
      const secondsLeft = Math.floor(ownTicketMsLeft / 1000);
      
      let timeLeftStr = "";
      if (daysLeft > 0) {
        timeLeftStr = `${daysLeft}d`;
      } else if (hoursLeft > 0) {
        timeLeftStr = `${hoursLeft}hr`;
      } else if (minutesLeft > 0) {
        timeLeftStr = `${minutesLeft}min`;
      } else {
        timeLeftStr = `${secondsLeft}sec`;
      }
      
      const priceStr = profile?.lastTicketPrice ? `(₦${profile.lastTicketPrice})` : "";
      
      const totalMs = (profile?.lastTicketDays || 1) * 24 * 60 * 60 * 1000;
      const percentageLeft = ownTicketMsLeft / totalMs;

      return {
        text: `Active Ticket ${priceStr} Time: ${timeLeftStr}`,
        className: percentageLeft <= 0.20 
          ? "bg-white text-red-700 hover:bg-red-50 border border-red-200" 
          : "bg-white text-green-700 hover:bg-green-50 border border-green-200",
        hideIcon: true,
        textSizeClass: "text-[10px] sm:text-xs md:text-sm"
      };
    }

    if (hasGlobalFree) {
      const hoursLeft = Math.floor(globalFreeMsLeft / (1000 * 60 * 60));
      const daysLeft = Math.floor(hoursLeft / 24);
      const timeLeftStr = daysLeft > 0 ? `${daysLeft} days` : `${hoursLeft} hrs`;
      
      return {
        text: `Free Plan {${timeLeftStr}}`,
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white"
      };
    }

    // No valid ticket and no free plan
    return {
      text: "Purchase Ticket",
      className: "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white"
    };
  };

  const ticketInfo = getTicketButtonInfo();

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-panel rounded-xl md:rounded-3xl p-4 lg:col-span-1 flex flex-col items-center text-center">
          <div className="relative mb-4 md:mb-6">
            {vipBadge && (
              <div className={`absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${vipBadge.colorClass}`}>
                {vipBadge.tag}
              </div>
            )}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-border shadow-xl">
              {imagePreview || (isEditing ? formData.displayImage : profile?.displayImage) || user.photoURL ? (
                <img src={imagePreview || (isEditing ? formData.displayImage : profile?.displayImage) || user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-3xl md:text-4xl uppercase">
                  {(isEditing ? formData.username : getDisplayName())?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
            </div>

            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2 md:p-3 bg-brand-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
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

          <h2 className="text-lg md:text-2xl font-bold mb-1 capitalize w-full truncate px-2">{isEditing ? formData.username : getDisplayName()}</h2>
          <p className="text-xs md:text-sm text-foreground/60 mb-4 w-full truncate px-2">{user.email}</p>

          <div className="flex flex-col items-center gap-1 bg-card-border/50 px-4 py-2 rounded-xl mb-6 shadow-inner relative">
            <button 
              onClick={() => setShowLevelInfo(true)} 
              className="absolute top-2 right-2 p-1 text-foreground/40 hover:text-brand-primary transition-colors"
              title="How to level up?"
            >
              <Info className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 mt-1">
              {renderStars(Math.min(5, Math.floor((profile?.jobsWon || 0) / 2)))}
              <span className="ml-1.5 md:ml-2 font-bold text-xs md:text-sm uppercase text-brand-primary">
                Level {Math.min(5, Math.floor((profile?.jobsWon || 0) / 2))}
              </span>
            </div>
            <span className="text-[10px] text-foreground/60 font-medium">{profile?.jobsWon || 0} jobs won</span>
          </div>

          {!isEditing ? (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2 bg-brand-primary/10 text-brand-primary font-semibold rounded-xl hover:bg-brand-primary hover:text-white transition-colors text-sm md:text-base"
              >
                Edit Profile
              </button>

              {ticketConfigLoaded ? (
                <Link
                  href="/driver/ticket"
                  className={`w-full py-2 font-bold rounded-xl transition-colors flex justify-center items-center gap-2 ${ticketInfo.textSizeClass || "text-sm md:text-base"} ${ticketInfo.className}`}
                >
                  {!ticketInfo.hideIcon && <Ticket className="w-4 h-4 md:w-5 md:h-5" />} {ticketInfo.text}
                </Link>
              ) : (
                <div className="w-full py-2 rounded-xl bg-foreground/5 animate-pulse h-10" />
              )}

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setShowShareOverlay(true)}
                  className="flex-1 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-1 text-xs md:text-sm"
                >
                  <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> Share
                </button>
                <Link
                  href="/vip"
                  className={`flex-1 py-2 font-semibold rounded-xl transition-opacity flex justify-center items-center gap-1 text-xs md:text-sm shadow-md ${
                    vipBadge
                      ? vipBadge.colorClass + ' hover:opacity-90'
                      : 'bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:opacity-90'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                  {vipBadge ? `${vipBadge.tag} VIP` : 'Upgrade VIP'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 md:gap-3 w-full">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setImageFile(null);
                  setImagePreview(null);
                  setFormData({
                    firstName: profile?.firstName || "",
                    middleName: profile?.middleName || "",
                    lastName: profile?.lastName || "",
                    username: profile?.username || profile?.firstName || user?.displayName?.split(" ")[0] || "Driver",
                    phone: profile?.phone || "",
                    displayImage: profile?.displayImage || "",
                    whatsappEnabled: profile?.whatsappEnabled ?? true,
                    operatingCity: profile?.operatingCity || "",
                    operatingState: profile?.operatingState || "",
                  });
                }}
                className="flex-1 py-2.5 md:py-3 bg-card-border hover:bg-foreground/10 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 text-xs md:text-sm"
              >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || uploadingImage}
                className="flex-1 py-2.5 md:py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-1 text-xs md:text-sm disabled:opacity-70"
              >
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> {loading ? "Saving" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 glass-panel rounded-xl md:rounded-3xl p-6 md:p-8 flex flex-col justify-center">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 border-b border-card-border pb-3 md:pb-4">Personal Information</h3>

          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Display Name (Username)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base placeholder:text-slate-400"
                  placeholder="E.g. FastRider99"
                />
              ) : (
                <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-brand-primary" />
                  <span className="font-medium text-sm md:text-base">{getDisplayName()}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="col-span-1 order-1">
                <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base"
                    placeholder="First Name"
                  />
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-brand-secondary" />
                    <span className="font-medium text-sm md:text-base">{profile?.firstName || "Not set"}</span>
                  </div>
                )}
              </div>
              <div className="col-span-2 md:col-span-1 order-3 md:order-2">
                <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base"
                    placeholder="Middle Name (Optional)"
                  />
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-brand-secondary" />
                    <span className="font-medium text-sm md:text-base">{profile?.middleName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="col-span-1 order-2 md:order-3">
                <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base"
                    placeholder="Last Name"
                  />
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-brand-secondary" />
                    <span className="font-medium text-sm md:text-base">{profile?.lastName || "Not set"}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Phone Number</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base placeholder:text-slate-400"
                    placeholder="E.g. +1234567890"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, whatsappEnabled: !formData.whatsappEnabled })}
                    type="button"
                    className={`p-2.5 md:p-3 rounded-xl shadow-lg transition-colors flex items-center justify-center min-w-[45px] md:min-w-[50px] hover:scale-105 ${formData.whatsappEnabled
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-200 text-gray-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700"
                      }`}
                    title={formData.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                  >
                    <WhatsAppIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 md:gap-3 justify-between">
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl flex-1">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    <span className="font-medium text-sm md:text-base">{profile?.phone || "Not set"}</span>
                  </div>
                  {profile?.phone && (
                    <button
                      onClick={toggleWhatsAppPreference}
                      className={`p-2.5 md:p-3 rounded-xl shadow-lg transition-colors flex items-center justify-center min-w-[45px] md:min-w-[50px] hover:scale-105 ${(profile?.whatsappEnabled ?? true)
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-200 text-gray-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700"
                        }`}
                      title={(profile?.whatsappEnabled ?? true) ? "WhatsApp Enabled - Click to Disable" : "WhatsApp Disabled - Click to Enable"}
                    >
                      <WhatsAppIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Operating City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.operatingCity}
                    onChange={(e) => setFormData({ ...formData, operatingCity: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base"
                  />
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-brand-primary" />
                    <span className="font-medium text-sm md:text-base">{profile?.operatingCity || "Not set"}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5 md:mb-2">Operating State</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.operatingState}
                    onChange={(e) => setFormData({ ...formData, operatingState: e.target.value })}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm text-sm md:text-base"
                  />
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-card-border/30 rounded-xl">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-brand-primary" />
                    <span className="font-medium text-sm md:text-base">{profile?.operatingState || "Not set"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 mt-10 flex flex-row items-center gap-2 md:gap-4 justify-center w-full">
        <button
          onClick={() => setShowBidCategoryModal(true)}
          className="flex-1 sm:flex-none sm:w-auto px-2 py-3 md:px-8 md:py-4 bg-brand-primary text-white text-xs md:text-base font-bold rounded-md md:rounded-xl shadow-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-1 md:gap-2 hover:scale-105 whitespace-nowrap"
        >
          <Briefcase className="w-3.5 h-3.5 md:w-5 md:h-5" />
          Bid for Job
        </button>
        <Link
          href="/passenger"
          className="flex-1 sm:flex-none sm:w-auto px-2 py-3 md:px-8 md:py-4 bg-brand-secondary text-white text-xs md:text-base font-bold rounded-md md:rounded-xl shadow-lg hover:bg-brand-secondary/90 transition-all flex items-center justify-center gap-1 md:gap-2 hover:scale-105 whitespace-nowrap"
        >
          <CarFront className="w-3.5 h-3.5 md:w-5 md:h-5" />
          Book a Ride
        </Link>
      </div>

      {/* Sign Out Button */}
      {onSignOut && (
        <div className="mt-16 flex justify-center">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

      {/* Delete Account Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={initiateDelete}
          className="text-red-500/70 hover:text-red-500 text-sm font-medium underline transition-colors"
        >
          Delete my account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-lg md:text-xl font-bold text-red-500 mb-3 md:mb-4">Delete Account</h3>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mb-4 md:mb-6 leading-relaxed">
              This action is irreversible. All your data will be permanently wiped from our database.
              To confirm, please type the following code:
            </p>
            <div className="bg-gray-100 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg text-center tracking-[0.3em] font-mono text-xl md:text-2xl font-bold mb-4 md:mb-6 text-slate-900 dark:text-slate-100 shadow-inner">
              {deleteCode}
            </div>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
              placeholder="Enter code here"
              className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all mb-6 md:mb-8 text-center font-mono tracking-widest uppercase shadow-sm text-sm md:text-base"
            />
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 md:py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors shadow-sm text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting || deleteInput !== deleteCode}
                className="flex-1 py-2.5 md:py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:hover:bg-red-500 shadow-sm text-sm md:text-base"
              >
                {isDeleting ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Overlay */}
      {showShareOverlay && (
        <ShareOverlay
          onClose={() => setShowShareOverlay(false)}
          referralLink={`${websiteLink}/?ref=${user.uid}`}
          points={profile?.points || 0}
        />
      )}

      {/* Bid Category Modal */}
      {showBidCategoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative zoom-in-95 duration-200 text-center">
            <button 
              onClick={() => setShowBidCategoryModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-primary/20">
              <Briefcase className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Bid for a Job</h2>
            <p className="text-foreground/60 mb-8">Select the category of your vehicle to view available passenger jobs.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link 
                    key={cat.id} 
                    href={`/passenger/${cat.id}?bids=open`}
                    className={`glass-panel rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${cat.hoverShadow} border border-transparent ${cat.hoverBorder}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center mb-2`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <span className="font-bold text-sm">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Level Info Modal */}
      {showLevelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-card-border rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowLevelInfo(false)}
              className="absolute top-4 right-4 p-2 text-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
            </div>
            
            <h3 className="text-xl md:text-2xl font-bold text-center mb-2">Driver Level</h3>
            <p className="text-sm text-center text-foreground/70 mb-6">
              Your star level is determined by the number of successful bids you win. For every 2 jobs won, you gain 1 star!
            </p>
            
            <div className="space-y-3 mb-6 bg-card-border/30 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm">Boosts customer confidence when they review your profile.</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm">Increases your ranking in search results, placing you ahead of lower-level drivers.</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm">Helps you secure better and higher-paying jobs!</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLevelInfo(false)}
              className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
