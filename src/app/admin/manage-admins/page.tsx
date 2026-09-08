"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, startAt, endAt, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, Search, User, Shield, Phone, Mail, Image as ImageIcon, Save, Lock, UploadCloud, X, CheckCircle2, ArrowLeft, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

const ADMIN_ROUTES = [
  { id: "/admin/driver-approvals", name: "Driver Approvals" },
  { id: "/admin/vehicle-approvals", name: "Vehicle Approvals" },
  { id: "/admin/manage-purchases", name: "Manage Purchases (Tickets & VIP)" },
  { id: "/admin/reports", name: "User Reports & Issues" },
  { id: "/admin/site-settings", name: "Site Settings" },
  { id: "/admin/statistics", name: "Platform Statistics" }
];

export default function ManageAdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [assignedRoutes, setAssignedRoutes] = useState<string[]>([]);
  const [savingRoutes, setSavingRoutes] = useState(false);

  // Admin List State
  const [adminList, setAdminList] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // CEO Contact Info State
  const [contactInfo, setContactInfo] = useState({
    name: "",
    image: "",
    phone: "",
    email: "",
    message: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [savingContact, setSavingContact] = useState(false);

  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Remove Admin Modal State
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  const [removePassword, setRemovePassword] = useState("");
  const [verifyingRemove, setVerifyingRemove] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.uid !== CEO_UID) {
          toast.error("Unauthorized. CEO access only.");
          router.push("/");
          return;
        }
        setUserUid(user.uid);
        await loadInitialData();
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadInitialData = async () => {
    try {
      // Load Contact Info
      const aboutRef = doc(db, "adminSettings", "about");
      const aboutSnap = await getDoc(aboutRef);
      if (aboutSnap.exists()) {
        const data = aboutSnap.data();
        setContactInfo({
          name: data.name || "",
          image: data.image || "",
          phone: data.phone || "",
          email: data.email || "",
          message: data.message || ""
        });
        setImagePreview(data.image || "");
      }

      // Load Admins
      const adminsSnapshot = await getDocs(collection(db, "adminRoles"));
      const adminsData: any[] = [];
      adminsSnapshot.forEach(doc => {
        adminsData.push({ id: doc.id, ...doc.data() });
      });
      setAdminList(adminsData);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedUser(null);
    try {
      const usersRef = collection(db, "users");
      
      const q = query(usersRef, orderBy("username"), startAt(searchQuery), endAt(searchQuery + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

      const q2 = query(usersRef, orderBy("firstName"), startAt(searchQuery), endAt(searchQuery + '\uf8ff'));
      const querySnapshot2 = await getDocs(q2);
      querySnapshot2.forEach((doc) => {
        if (!results.find(r => r.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
      });

      // Search by email
      const q3 = query(usersRef, orderBy("email"), startAt(searchQuery), endAt(searchQuery + '\uf8ff'));
      const querySnapshot3 = await getDocs(q3);
      querySnapshot3.forEach((doc) => {
        if (!results.find(r => r.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
      });

      // Search by lowercased email
      const lowerQuery = searchQuery.toLowerCase();
      if (lowerQuery !== searchQuery) {
        const q4 = query(usersRef, orderBy("email"), startAt(lowerQuery), endAt(lowerQuery + '\uf8ff'));
        const querySnapshot4 = await getDocs(q4);
        querySnapshot4.forEach((doc) => {
          if (!results.find(r => r.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
        });
      }
      
      // Search by capitalized username/firstName
      const capitalizedQuery = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);
      if (capitalizedQuery !== searchQuery) {
        const q5 = query(usersRef, orderBy("username"), startAt(capitalizedQuery), endAt(capitalizedQuery + '\uf8ff'));
        const querySnapshot5 = await getDocs(q5);
        querySnapshot5.forEach((doc) => {
          if (!results.find(r => r.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
        });
        
        const q6 = query(usersRef, orderBy("firstName"), startAt(capitalizedQuery), endAt(capitalizedQuery + '\uf8ff'));
        const querySnapshot6 = await getDocs(q6);
        querySnapshot6.forEach((doc) => {
          if (!results.find(r => r.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: any) => {
    setSelectedUser(user);
    // Fetch their current admin roles if any
    try {
      const roleRef = doc(db, "adminRoles", user.id);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        setAssignedRoutes(roleSnap.data().routes || []);
      } else {
        setAssignedRoutes([]);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      setAssignedRoutes([]);
    }
  };

  const toggleRoute = (routeId: string) => {
    setAssignedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId) 
        : [...prev, routeId]
    );
  };

  const saveAdminRoles = async () => {
    if (!selectedUser) return;
    setSavingRoutes(true);
    try {
      const finalRoutes = assignedRoutes.length > 0 
        ? Array.from(new Set(["/admin", ...assignedRoutes]))
        : [];
      
      await setDoc(doc(db, "adminRoles", selectedUser.id), {
        routes: finalRoutes,
        email: selectedUser.email || "No Email Provided",
        name: selectedUser.name || selectedUser.username || selectedUser.firstName || "Unknown"
      });
      // Also tag the user doc as an admin
      await updateDoc(doc(db, "users", selectedUser.id), {
        role: assignedRoutes.length > 0 ? "admin" : "driver"
      });
      
      // Update local admin list
      if (assignedRoutes.length > 0) {
        setAdminList(prev => {
          const existing = prev.filter(a => a.id !== selectedUser.id);
          return [...existing, {
            id: selectedUser.id,
            routes: finalRoutes,
            email: selectedUser.email || "No Email Provided",
            name: selectedUser.name || selectedUser.username || selectedUser.firstName || "Unknown"
          }];
        });
      } else {
        setAdminList(prev => prev.filter(a => a.id !== selectedUser.id));
      }

      toast.success("Admin roles updated successfully!");
      setSelectedUser(null);
      setSearchQuery("");
    } catch (error) {
      console.error("Error saving roles:", error);
      toast.error("Failed to save admin roles");
    } finally {
      setSavingRoutes(false);
    }
  };

  const promptRemoveAdmin = (adminId: string) => {
    setAdminToRemove(adminId);
    setRemovePassword("");
  };

  const confirmRemoveAdmin = async () => {
    if (!adminToRemove) return;
    if (!removePassword) {
      toast.error("Please enter the master password");
      return;
    }
    setVerifyingRemove(true);
    try {
      const ceoRef = doc(db, "adminSettings", "ceo");
      const ceoSnap = await getDoc(ceoRef);
      const currentPassword = ceoSnap.exists() ? ceoSnap.data().password : "prince123";

      if (removePassword !== currentPassword) {
        toast.error("Incorrect password!");
        setVerifyingRemove(false);
        return;
      }

      await updateDoc(doc(db, "users", adminToRemove), { role: "driver" });
      await setDoc(doc(db, "adminRoles", adminToRemove), { routes: [], name: "Removed", email: "" }, { merge: true });
      setAdminList(prev => prev.filter(a => a.id !== adminToRemove));
      toast.success("Admin removed successfully");
      setAdminToRemove(null);
    } catch(err) {
      console.error("Error removing admin:", err);
      toast.error("Error removing admin");
    } finally {
      setVerifyingRemove(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setContactInfo({ ...contactInfo, image: "" }); // Clear URL if file selected
    }
  };

  const saveContactInfo = async () => {
    setSavingContact(true);
    try {
      let finalImageUrl = contactInfo.image;
      
      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary(imageFile);
      }

      const dataToSave = {
        ...contactInfo,
        image: finalImageUrl
      };

      await setDoc(doc(db, "adminSettings", "about"), dataToSave, { merge: true });
      
      // Update local state to reflect the new saved URL
      setContactInfo(dataToSave);
      setImagePreview(finalImageUrl);
      setImageFile(null); // Clear file so we don't re-upload
      
      toast.success("CEO Contact Info updated!");
    } catch (error) {
      console.error("Error saving contact info:", error);
      toast.error("Failed to save contact info");
    } finally {
      setSavingContact(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error("Please enter both passwords");
      return;
    }
    setSavingPassword(true);
    try {
      const ceoRef = doc(db, "adminSettings", "ceo");
      const ceoSnap = await getDoc(ceoRef);
      
      const currentPassword = ceoSnap.exists() ? ceoSnap.data().password : "prince123";

      if (oldPassword !== currentPassword) {
        toast.error("Old password is incorrect!");
        setSavingPassword(false);
        return;
      }

      await setDoc(ceoRef, { password: newPassword }, { merge: true });
      toast.success("Master password changed successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("Error saving password:", error);
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-brand-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary flex items-center gap-2">
              <Shield className="w-6 h-6 md:w-8 md:h-8" />
              Admin Management
            </h1>
            <p className="text-xs md:text-sm text-foreground/60 mt-1">CEO Exclusive Control Panel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            
            {/* Create Admin Section */}
            <div className="glass-panel p-4 md:p-6 rounded-lg md:rounded-xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><User className="w-5 h-5"/> Assign Admin Roles</h2>
              
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by email or name..."
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                />
                  
                  {searchResults.length > 0 && !selectedUser && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-black/5 dark:shadow-brand-primary/5 border border-slate-100 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto z-50">
                      {searchResults.map(user => (
                        <button 
                          key={user.id}
                          onClick={() => selectUser(user)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email || "No Email Provided"}</p>
                            {(user.username || user.firstName) && (
                              <p className="text-xs text-slate-500 mt-0.5">{user.username || user.firstName} {user.lastName}</p>
                            )}
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-brand-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              {selectedUser && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl shadow-brand-primary/5 ring-1 ring-black/5 dark:ring-white/5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="font-bold text-lg">{selectedUser.name || selectedUser.username || selectedUser.firstName}</p>
                      <p className="text-sm text-foreground/60">{selectedUser.email || "No Email Provided"}</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-1 bg-card-border rounded-full hover:bg-red-500 hover:text-white transition"><X className="w-4 h-4"/></button>
                  </div>

                  <h3 className="font-bold mb-3 text-[11px] sm:text-xs text-brand-primary uppercase tracking-wider opacity-70">Access Privileges</h3>
                  <div className="flex flex-col gap-1 mb-6">
                    {ADMIN_ROUTES.map(route => (
                      <label key={route.id} className="group flex items-center gap-3 py-2 px-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={assignedRoutes.includes(route.id)}
                          onChange={() => toggleRoute(route.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-primary focus:ring-brand-primary focus:ring-offset-0 bg-transparent cursor-pointer transition-colors"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{route.name}</span>
                      </label>
                    ))}
                  </div>

                  <button 
                    onClick={saveAdminRoles}
                    disabled={savingRoutes}
                    className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-green-600 transition"
                  >
                    {savingRoutes ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Admin Access
                  </button>
                </div>
              )}
            </div>

            {/* Admin List Section */}
            <div className="glass-panel p-4 md:p-6 rounded-lg md:rounded-xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield className="w-5 h-5"/> Current Admins</h2>
              
              {loadingAdmins ? (
                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
              ) : adminList.filter(a => a.routes?.length > 0).length === 0 ? (
                <p className="text-sm text-foreground/60 text-center p-4">No admins assigned yet.</p>
              ) : (
                <div className="space-y-4">
                  {adminList.filter(a => a.routes?.length > 0).map(admin => (
                    <div key={admin.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{admin.name}</p>
                        <p className="text-sm text-slate-500 mb-2">{admin.email}</p>
                        <div className="flex flex-wrap gap-2">
                          {admin.routes.filter((r: string) => r !== "/admin").map((route: string) => {
                            const rName = ADMIN_ROUTES.find(r => r.id === route)?.name || route;
                            return (
                              <span key={route} className="bg-brand-primary/10 text-brand-primary text-xs font-medium px-2.5 py-1 rounded-full">
                                {rName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-row gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                        <button 
                          onClick={() => {
                            setSearchQuery("");
                            selectUser(admin);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex-1 sm:flex-none text-xs font-medium text-brand-primary bg-brand-primary/10 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-brand-primary/20 transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => promptRemoveAdmin(admin.id)}
                          className="flex-1 sm:flex-none text-xs font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center justify-center gap-1.5"
                          title="Remove Access"
                        >
                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            
            {/* CEO Contact Info */}
            <div className="glass-panel p-4 md:p-6 rounded-lg md:rounded-xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Phone className="w-5 h-5"/> About Page Info</h2>
              
              <div className="space-y-5">
                
                <div>
                  <label className="block text-sm font-bold mb-1">CEO Name</label>
                  <input 
                    type="text" 
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo({...contactInfo, name: e.target.value})}
                    placeholder="e.g. Prince O. Nwachukwu"
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                  />
                </div>

                {/* Image Upload/URL */}
                <div>
                  <label className="block text-sm font-bold mb-3">CEO Image</label>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-card-border flex items-center justify-center overflow-hidden bg-background relative shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-foreground/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="ceo-image-upload"
                        />
                        <label 
                          htmlFor="ceo-image-upload"
                          className="flex items-center justify-center gap-2 w-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition py-2 px-4 rounded-xl cursor-pointer font-bold text-sm"
                        >
                          <UploadCloud className="w-4 h-4" /> Upload Image File
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-card-border flex-1"></div>
                        <span className="text-xs font-bold text-foreground/40 uppercase">OR</span>
                        <div className="h-px bg-card-border flex-1"></div>
                      </div>

                      <input 
                        type="text" 
                        value={contactInfo.image}
                        onChange={(e) => {
                          setContactInfo({...contactInfo, image: e.target.value});
                          setImagePreview(e.target.value);
                          setImageFile(null); // Clear file if URL is provided
                        }}
                        placeholder="Paste Image URL"
                        className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 text-sm shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">CEO Message</label>
                  <textarea 
                    value={contactInfo.message}
                    onChange={(e) => setContactInfo({...contactInfo, message: e.target.value})}
                    rows={8}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all resize-none"
                  />
                </div>

                <button 
                  onClick={saveContactInfo}
                  disabled={savingContact}
                  className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-brand-primary/90 transition"
                >
                  {savingContact ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save About Info
                </button>
              </div>
            </div>

            {/* Password Section */}
            <div className="glass-panel p-4 md:p-6 rounded-lg md:rounded-xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Lock className="w-5 h-5"/> Master Password</h2>
              <p className="text-xs text-foreground/60 mb-6">This password is required by admins to save sensitive changes (like ticket prices).</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Old Password</label>
                  <input 
                    type="password" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePassword()}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePassword()}
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all"
                    placeholder="Enter new password"
                  />
                </div>
                <button 
                  onClick={savePassword}
                  disabled={savingPassword}
                  className="w-full bg-brand-accent text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-brand-accent/90 transition mt-2"
                >
                  {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Change Password
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Remove Admin Modal */}
      {adminToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-500" /> Verify Master Password
              </h3>
              <button 
                onClick={() => setAdminToRemove(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You are about to remove this user's admin access. Please enter the master password to confirm this action.
              </p>
              
              <div>
                <input 
                  type="password"
                  value={removePassword}
                  onChange={(e) => setRemovePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRemoveAdmin()}
                  placeholder="Master Password"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setAdminToRemove(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRemoveAdmin}
                  disabled={verifyingRemove}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 transition flex items-center gap-2"
                >
                  {verifyingRemove ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Remove Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
