"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref } from "firebase/storage";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  Settings, Loader2, ArrowLeft, Image as ImageIcon, Save, X, Plus, Trash2, Shield, Lock, FileText, CheckCircle, Smartphone, Mail, MapPin, Search
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DEFAULT_SITE_CONFIG, DEFAULT_ABOUT_CONFIG, DEFAULT_FAQ_CONFIG, DEFAULT_POLICY_CONFIG
} from "@/lib/defaultCMS";

type Tab = "global" | "about" | "faq" | "policy" | "socials";

const ICONS_MAP: Record<string, any> = {
  Shield: Shield,
  Lock: Lock,
  FileText: FileText,
  CheckCircle: CheckCircle,
  Smartphone: Smartphone,
  Mail: Mail,
  MapPin: MapPin,
};

export default function SiteSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("global");

  // State for all sections
  const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE_CONFIG);
  const [aboutConfig, setAboutConfig] = useState(DEFAULT_ABOUT_CONFIG);
  const [faqConfig, setFaqConfig] = useState(DEFAULT_FAQ_CONFIG);
  const [policyConfig, setPolicyConfig] = useState(DEFAULT_POLICY_CONFIG);

  // Original state to check dirty
  const [originalSiteConfig, setOriginalSiteConfig] = useState(DEFAULT_SITE_CONFIG);
  const [originalAboutConfig, setOriginalAboutConfig] = useState(DEFAULT_ABOUT_CONFIG);
  const [originalFaqConfig, setOriginalFaqConfig] = useState(DEFAULT_FAQ_CONFIG);
  const [originalPolicyConfig, setOriginalPolicyConfig] = useState(DEFAULT_POLICY_CONFIG);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password Verification Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const driverImageInputRef = useRef<HTMLInputElement>(null);
  const passengerImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/driver/login");
      return;
    }

    const fetchData = async () => {
      try {
        const siteDoc = await getDoc(doc(db, "adminSettings", "siteConfig"));
        if (siteDoc.exists()) {
          const data = siteDoc.data() as typeof DEFAULT_SITE_CONFIG;
          setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...data });
          setOriginalSiteConfig({ ...DEFAULT_SITE_CONFIG, ...data });
        }

        const aboutDoc = await getDoc(doc(db, "adminSettings", "about"));
        if (aboutDoc.exists()) {
          const data = aboutDoc.data() as typeof DEFAULT_ABOUT_CONFIG;
          setAboutConfig({ ...DEFAULT_ABOUT_CONFIG, ...data });
          setOriginalAboutConfig({ ...DEFAULT_ABOUT_CONFIG, ...data });
        }

        const faqDoc = await getDoc(doc(db, "adminSettings", "faq"));
        if (faqDoc.exists()) {
          const data = faqDoc.data()?.items || [];
          if (data.length > 0) {
            setFaqConfig(data);
            setOriginalFaqConfig(data);
          }
        }

        const policyDoc = await getDoc(doc(db, "adminSettings", "policy"));
        if (policyDoc.exists()) {
          const data = policyDoc.data()?.items || [];
          if (data.length > 0) {
            setPolicyConfig(data);
            setOriginalPolicyConfig(data);
          }
        }
      } catch (err) {
        console.error("Error fetching site settings:", err);
        toast.error("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  // Deep compare to check if dirty
  useEffect(() => {
    const isSiteDirty = JSON.stringify(siteConfig) !== JSON.stringify(originalSiteConfig);
    const isAboutDirty = JSON.stringify(aboutConfig) !== JSON.stringify(originalAboutConfig);
    const isFaqDirty = JSON.stringify(faqConfig) !== JSON.stringify(originalFaqConfig);
    const isPolicyDirty = JSON.stringify(policyConfig) !== JSON.stringify(originalPolicyConfig);

    setIsDirty(isSiteDirty || isAboutDirty || isFaqDirty || isPolicyDirty);
  }, [siteConfig, aboutConfig, faqConfig, policyConfig, originalSiteConfig, originalAboutConfig, originalFaqConfig, originalPolicyConfig]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof siteConfig) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const toastId = toast.loading("Uploading image...");
    try {
      const url = await uploadImageToCloudinary(file);
      setSiteConfig((prev) => ({ ...prev, [field]: url }));
      toast.success("Image uploaded successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image", { id: toastId });
    }
  };

  const handleDiscard = () => {
    setSiteConfig(originalSiteConfig);
    setAboutConfig(originalAboutConfig);
    setFaqConfig(originalFaqConfig);
    setPolicyConfig(originalPolicyConfig);
    toast("Changes discarded", { icon: "↩️" });
  };

  const handleSaveInitiate = () => {
    setShowPasswordModal(true);
  };

  const handleSaveConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "prince123") {
      toast.error("Incorrect master password");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving configuration to database...");

    try {
      await setDoc(doc(db, "adminSettings", "siteConfig"), siteConfig);
      await setDoc(doc(db, "adminSettings", "about"), aboutConfig);
      await setDoc(doc(db, "adminSettings", "faq"), { items: faqConfig });
      await setDoc(doc(db, "adminSettings", "policy"), { items: policyConfig });

      setOriginalSiteConfig(siteConfig);
      setOriginalAboutConfig(aboutConfig);
      setOriginalFaqConfig(faqConfig);
      setOriginalPolicyConfig(policyConfig);

      setIsDirty(false);
      setShowPasswordModal(false);
      setPassword("");
      toast.success("All settings saved successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save configuration", { id: toastId });
    } finally {
      setSaving(false);
    }
  };



  const addFaq = () => setFaqConfig([...faqConfig, { question: "", answer: "" }]);
  const updateFaq = (idx: number, field: string, val: string) => {
    const newFaq = [...faqConfig];
    newFaq[idx] = { ...newFaq[idx], [field]: val };
    setFaqConfig(newFaq);
  };
  const removeFaq = (idx: number) => {
    setFaqConfig(faqConfig.filter((_, i) => i !== idx));
  };

  const addPolicy = () => setPolicyConfig([...policyConfig, { icon: "Shield", title: "", description: "", bulletins: [] }]);
  const updatePolicy = (idx: number, field: string, val: any) => {
    const newPol = [...policyConfig];
    newPol[idx] = { ...newPol[idx], [field]: val };
    setPolicyConfig(newPol);
  };
  const removePolicy = (idx: number) => {
    setPolicyConfig(policyConfig.filter((_, i) => i !== idx));
  };
  const addBulletin = (policyIdx: number) => {
    const newPol = [...policyConfig];
    newPol[policyIdx].bulletins.push("");
    setPolicyConfig(newPol);
  };
  const updateBulletin = (policyIdx: number, bullIdx: number, val: string) => {
    const newPol = [...policyConfig];
    newPol[policyIdx].bulletins[bullIdx] = val;
    setPolicyConfig(newPol);
  };
  const removeBulletin = (policyIdx: number, bullIdx: number) => {
    const newPol = [...policyConfig];
    newPol[policyIdx].bulletins = newPol[policyIdx].bulletins.filter((_, i) => i !== bullIdx);
    setPolicyConfig(newPol);
  };

  const addSocial = () => setSiteConfig({ ...siteConfig, socials: [...siteConfig.socials, { platform: "facebook", url: "https://facebook.com/" }] });
  const updateSocial = (idx: number, field: string, val: string) => {
    const newSoc = [...siteConfig.socials];
    if (field === "platform") {
      const boilerplates: Record<string, string> = {
        facebook: "https://facebook.com/",
        twitter: "https://twitter.com/",
        instagram: "https://instagram.com/",
        linkedin: "https://linkedin.com/in/",
        tiktok: "https://tiktok.com/@",
      };
      const oldBoilerplate = boilerplates[newSoc[idx].platform];
      const isUnmodified = !newSoc[idx].url || newSoc[idx].url === oldBoilerplate;
      
      newSoc[idx] = { ...newSoc[idx], platform: val };
      if (isUnmodified) {
        newSoc[idx].url = boilerplates[val] || "";
      }
    } else {
      newSoc[idx] = { ...newSoc[idx], [field]: val };
    }
    setSiteConfig({ ...siteConfig, socials: newSoc });
  };
  const removeSocial = (idx: number) => {
    setSiteConfig({ ...siteConfig, socials: siteConfig.socials.filter((_, i) => i !== idx) });
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-28 px-2 md:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <div className="px-3 md:px-0 flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
              Site Settings & CMS
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Manage global content, FAQs, Policies, and Site Settings.</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-lg mb-6 overflow-x-auto no-scrollbar shadow-sm border border-gray-100 dark:border-gray-700 md:justify-around">
          {(["global", "about", "faq", "policy", "socials"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all whitespace-nowrap capitalize ${activeTab === tab
                ? "bg-brand-primary text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              {tab === "global" ? "Global & Landing" : tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all">

          {/* GLOBAL TAB */}
          {activeTab === "global" && (
            <div className="space-y-10 animate-in fade-in duration-300">

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <ImageIcon className="w-5 h-5 text-brand-primary" /> Branding
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
                    <input
                      type="text"
                      value={siteConfig.siteName}
                      onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                      className="w-full px-3 py-2 md:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shows in Navbar (landing page) and Footer.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Logo (URL or Upload)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={siteConfig.siteLogo}
                        onChange={(e) => setSiteConfig({ ...siteConfig, siteLogo: e.target.value })}
                        className="flex-1 px-3 py-2 md:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                        placeholder="https://..."
                      />
                      <button onClick={() => logoInputRef.current?.click()} className="px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors">
                        Upload
                      </button>
                      <input type="file" hidden ref={logoInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, "siteLogo")} />
                    </div>
                    {siteConfig.siteLogo && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl inline-block border border-gray-200 dark:border-gray-700">
                        <img src={siteConfig.siteLogo} alt="Logo Preview" className="h-12 md:h-16 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <Smartphone className="w-5 h-5 text-brand-primary" /> Landing Page Settings
                </h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hero Title</label>
                      <input
                        type="text"
                        value={siteConfig.heroTitle}
                        onChange={(e) => setSiteConfig({ ...siteConfig, heroTitle: e.target.value })}
                        className="w-full py-2 px-3 md:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hero Subtitle</label>
                      <textarea
                        value={siteConfig.heroSubtitle}
                        onChange={(e) => setSiteConfig({ ...siteConfig, heroSubtitle: e.target.value })}
                        className="w-full py-2 px-3 md:p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Driver Card */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="font-bold mb-4 text-brand-primary">Driver Card</h3>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Image URL / Upload</label>
                      <div className="flex gap-2 mb-4">
                        <input type="text" value={siteConfig.driverCardImage} onChange={(e) => setSiteConfig({ ...siteConfig, driverCardImage: e.target.value })} className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none" />
                        <button onClick={() => driverImageInputRef.current?.click()} className="px-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium">Upload</button>
                        <input type="file" hidden ref={driverImageInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, "driverCardImage")} />
                      </div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Card Text</label>
                      <textarea value={siteConfig.driverCardText} onChange={(e) => setSiteConfig({ ...siteConfig, driverCardText: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                    </div>

                    {/* Passenger Card */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="font-bold mb-4 text-brand-secondary">Passenger Card</h3>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Image URL / Upload</label>
                      <div className="flex gap-2 mb-4">
                        <input type="text" value={siteConfig.passengerCardImage} onChange={(e) => setSiteConfig({ ...siteConfig, passengerCardImage: e.target.value })} className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none" />
                        <button onClick={() => passengerImageInputRef.current?.click()} className="px-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium">Upload</button>
                        <input type="file" hidden ref={passengerImageInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, "passengerCardImage")} />
                      </div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Card Text</label>
                      <textarea value={siteConfig.passengerCardText} onChange={(e) => setSiteConfig({ ...siteConfig, passengerCardText: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === "about" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
                  About Page Settings
                </h2>
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sub-header</label>
                  <textarea
                    value={aboutConfig.subHeader}
                    onChange={(e) => setAboutConfig({ ...aboutConfig, subHeader: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>

                <h3 className="text-lg font-bold mb-4">Features Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-2 py-4 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-bold mb-1">Card 1 Title</label>
                    <input type="text" value={aboutConfig.card1Title} onChange={(e) => setAboutConfig({ ...aboutConfig, card1Title: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none mb-3" />
                    <label className="block text-xs font-bold mb-1">Card 1 Text</label>
                    <textarea value={aboutConfig.card1Text} onChange={(e) => setAboutConfig({ ...aboutConfig, card1Text: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                  </div>
                  {/* Card 2 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-2 py-4 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-bold mb-1">Card 2 Title</label>
                    <input type="text" value={aboutConfig.card2Title} onChange={(e) => setAboutConfig({ ...aboutConfig, card2Title: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none mb-3" />
                    <label className="block text-xs font-bold mb-1">Card 2 Text</label>
                    <textarea value={aboutConfig.card2Text} onChange={(e) => setAboutConfig({ ...aboutConfig, card2Text: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                  </div>
                  {/* Card 3 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-2 py-4 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-bold mb-1">Card 3 Title</label>
                    <input type="text" value={aboutConfig.card3Title} onChange={(e) => setAboutConfig({ ...aboutConfig, card3Title: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none mb-3" />
                    <label className="block text-xs font-bold mb-1">Card 3 Text</label>
                    <textarea value={aboutConfig.card3Text} onChange={(e) => setAboutConfig({ ...aboutConfig, card3Text: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                  </div>
                  {/* Card 4 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-2 py-4 md:p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-bold mb-1">Card 4 Title</label>
                    <input type="text" value={aboutConfig.card4Title} onChange={(e) => setAboutConfig({ ...aboutConfig, card4Title: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none mb-3" />
                    <label className="block text-xs font-bold mb-1">Card 4 Text</label>
                    <textarea value={aboutConfig.card4Text} onChange={(e) => setAboutConfig({ ...aboutConfig, card4Text: e.target.value })} className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none min-h-[80px]" />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === "faq" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">FAQ Manager</h2>
                <button onClick={addFaq} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Add FAQ
                </button>
              </div>

              {faqConfig.length === 0 && (
                <p className="text-gray-500 text-center py-8">No FAQs added yet.</p>
              )}

              {faqConfig.map((faq, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 relative group">
                  <button onClick={() => removeFaq(idx)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Question {idx + 1}</label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, "question", e.target.value)}
                    className="w-full p-3 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Answer</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* POLICY TAB */}
          {activeTab === "policy" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Policies & Terms</h2>
                <button onClick={addPolicy} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Add Policy
                </button>
              </div>

              {policyConfig.map((policy, pIdx) => (
                <div key={pIdx} className="bg-gray-50 dark:bg-gray-900/50 p-3 md:p-5 rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 relative">
                  <button onClick={() => removePolicy(pIdx)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-12">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                      <select
                        value={policy.icon}
                        onChange={(e) => updatePolicy(pIdx, "icon", e.target.value)}
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                      >
                        {Object.keys(ICONS_MAP).map(iconName => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                      <input
                        type="text"
                        value={policy.title}
                        onChange={(e) => updatePolicy(pIdx, "title", e.target.value)}
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={policy.description}
                    onChange={(e) => updatePolicy(pIdx, "description", e.target.value)}
                    className="w-full p-3 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none min-h-[80px]"
                  />

                  {/* Bulletins */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm">Bulletins</h4>
                      <button onClick={() => addBulletin(pIdx)} className="text-xs bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg font-semibold hover:bg-brand-primary/20 transition-colors">
                        + Add Bulletin
                      </button>
                    </div>
                    {policy.bulletins.map((bull, bIdx) => (
                      <div key={bIdx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={bull}
                          onChange={(e) => updateBulletin(pIdx, bIdx, e.target.value)}
                          className="flex-1 p-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-brand-primary"
                          placeholder="e.g. Users must be at least 18 years old..."
                        />
                        <button onClick={() => removeBulletin(pIdx, bIdx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {policy.bulletins.length === 0 && <p className="text-xs text-gray-500 italic">No bulletins added.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SOCIALS & CONTACT TAB */}
          {activeTab === "socials" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
                  Footer Write-up
                </h2>
                <textarea
                  value={siteConfig.footerText}
                  onChange={(e) => setSiteConfig({ ...siteConfig, footerText: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
                />
              </section>

              <section>
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Social Media Links</h2>
                  <button onClick={addSocial} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg text-sm font-semibold hover:bg-brand-primary/20 transition-colors">
                    <Plus className="w-4 h-4" /> Add Social
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {siteConfig.socials.map((social, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                      <select
                        value={social.platform}
                        onChange={(e) => updateSocial(idx, "platform", e.target.value)}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm w-32"
                      >
                        <option value="facebook">Facebook</option>
                        <option value="x">X (Twitter)</option>
                        <option value="instagram">Instagram</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="tiktok">TikTok</option>
                      </select>
                      <input
                        type="text"
                        value={social.url}
                        onChange={(e) => updateSocial(idx, "url", e.target.value)}
                        className="flex-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm"
                        placeholder="https://..."
                      />
                      <button onClick={() => removeSocial(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {siteConfig.socials.length === 0 && <p className="text-sm text-gray-500 col-span-full">No social media links configured.</p>}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
                  Customer Care Contact (Help Page)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Phone</label>
                    <input
                      type="text"
                      value={siteConfig.contactPhone}
                      onChange={(e) => setSiteConfig({ ...siteConfig, contactPhone: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                    <input
                      type="text"
                      value={siteConfig.contactEmail}
                      onChange={(e) => setSiteConfig({ ...siteConfig, contactEmail: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Office Address</label>
                    <textarea
                      value={siteConfig.contactAddress}
                      onChange={(e) => setSiteConfig({ ...siteConfig, contactAddress: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none min-h-[80px]"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>

      {/* DIRTY SAVE FLOATING BAR */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-50 pointer-events-none">
          <div className="max-w-3xl mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto border border-white/10 dark:border-black/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm md:text-base">Unsaved Changes</h3>
                <p className="text-xs md:text-sm opacity-80">You have modified site settings.</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 w-full md:w-auto">
              <button
                onClick={handleDiscard}
                className="flex-1 md:flex-none px-3 py-2 md:px-6 md:py-2.5 text-xs md:text-base bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-lg md:rounded-xl font-semibold transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveInitiate}
                className="flex-1 md:flex-none px-3 py-2 md:px-6 md:py-2.5 text-xs md:text-base bg-brand-primary text-white rounded-lg md:rounded-xl font-bold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD VERIFICATION MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Master Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                You are about to make global changes to the live platform. Please enter the CEO master password to authorize this action.
              </p>

              <form onSubmit={handleSaveConfirm}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Master Password"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none mb-6"
                  required
                />

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setPassword(""); }}
                    className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !password}
                    className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Confirm & Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
