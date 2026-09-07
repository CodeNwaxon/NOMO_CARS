"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, startAt, endAt, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Loader2, Search, User, Shield, Phone, Mail, Image as ImageIcon, Save, Lock, UploadCloud, X, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";

const CEO_UID = "xFAB29wQyBfGk4W2oLaD9qwxgfY2";

const ADMIN_ROUTES = [
  { id: "/admin/manage-purchases", name: "Manage Purchases (Tickets & VIP)" },
  { id: "/admin", name: "Admin Dashboard Overview" }
];

export default function ManageAdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected User State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [assignedRoutes, setAssignedRoutes] = useState<string[]>([]);
  const [savingRoutes, setSavingRoutes] = useState(false);

  // CEO Contact Info State
  const [contactInfo, setContactInfo] = useState({
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
          image: data.image || "",
          phone: data.phone || "",
          email: data.email || "",
          message: data.message || ""
        });
        setImagePreview(data.image || "");
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedUser(null);
    try {
      // Basic prefix search on 'username' or 'firstName'
      // Requires names to match case, usually we uppercase or rely on standard queries
      const usersRef = collection(db, "users");
      // For a basic startAt/endAt search, we need to order by the same field
      const q = query(
        usersRef, 
        orderBy("username"), 
        startAt(searchQuery), 
        endAt(searchQuery + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      // Also try firstName if username is empty
      const q2 = query(
        usersRef, 
        orderBy("firstName"), 
        startAt(searchQuery), 
        endAt(searchQuery + '\uf8ff')
      );
      const querySnapshot2 = await getDocs(q2);
      querySnapshot2.forEach((doc) => {
        if (!results.find(r => r.id === doc.id)) {
          results.push({ id: doc.id, ...doc.data() });
        }
      });

      setSearchResults(results);
      if (results.length === 0) toast.error("No users found matching this name.");
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
      await setDoc(doc(db, "adminRoles", selectedUser.id), {
        routes: assignedRoutes,
        email: selectedUser.email,
        name: selectedUser.username || selectedUser.firstName || "Unknown"
      });
      // Also tag the user doc as an admin
      await updateDoc(doc(db, "users", selectedUser.id), {
        role: assignedRoutes.length > 0 ? "admin" : "driver"
      });
      toast.success("Admin roles updated successfully!");
    } catch (error) {
      console.error("Error saving roles:", error);
      toast.error("Failed to save admin roles");
    } finally {
      setSavingRoutes(false);
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
        
        <div className="flex items-center gap-4 mb-8">
          <Shield className="w-10 h-10 text-brand-primary" />
          <div>
            <h1 className="text-3xl font-extrabold text-brand-primary">Admin Management</h1>
            <p className="text-foreground/60">CEO Exclusive Control Panel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            
            {/* Create Admin Section */}
            <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><User className="w-5 h-5"/> Assign Admin Roles</h2>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by name..."
                  className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/90 transition"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>

              {searchResults.length > 0 && !selectedUser && (
                <div className="bg-background rounded-xl border border-card-border overflow-hidden mb-6 max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <button 
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-card-border last:border-0 flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-bold">{user.username || user.firstName} {user.lastName}</p>
                        <p className="text-xs text-foreground/60">{user.email}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-transparent group-hover:text-brand-primary" />
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="bg-slate-100 dark:bg-slate-900/50 p-5 rounded-2xl border border-card-border">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="font-bold text-lg">{selectedUser.username || selectedUser.firstName}</p>
                      <p className="text-sm text-foreground/60">{selectedUser.email}</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-1 bg-card-border rounded-full hover:bg-red-500 hover:text-white transition"><X className="w-4 h-4"/></button>
                  </div>

                  <h3 className="font-bold mb-3 text-sm text-brand-primary uppercase tracking-wider">Access Routes</h3>
                  <div className="space-y-2 mb-6">
                    {ADMIN_ROUTES.map(route => (
                      <label key={route.id} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-card-border cursor-pointer hover:border-brand-primary/50 transition">
                        <input 
                          type="checkbox" 
                          checked={assignedRoutes.includes(route.id)}
                          onChange={() => toggleRoute(route.id)}
                          className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="font-medium text-sm">{route.name}</span>
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

            {/* Password Section */}
            <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Lock className="w-5 h-5"/> Master Password</h2>
              <p className="text-xs text-foreground/60 mb-6">This password is required by admins to save sensitive changes (like ticket prices).</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Old Password</label>
                  <input 
                    type="password" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary"
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

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            
            {/* CEO Contact Info */}
            <div className="glass-panel p-6 rounded-3xl border border-card-border/50 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Phone className="w-5 h-5"/> About Page Info</h2>
              
              <div className="space-y-5">
                
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
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary"
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
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">CEO Message</label>
                  <textarea 
                    value={contactInfo.message}
                    onChange={(e) => setContactInfo({...contactInfo, message: e.target.value})}
                    rows={8}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary resize-none"
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

          </div>
        </div>

      </div>
    </div>
  );
}
