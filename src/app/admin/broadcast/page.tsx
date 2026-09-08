"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { Loader2, ArrowLeft, Megaphone, Save, Trash2, Edit3 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export default function BroadcastPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);



  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    image: "",
    url: "",
    urlLabel: "",
    audience: "All"
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const broadcastImageRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/driver/login");
      return;
    }

    const fetchData = async () => {
      try {
        const hQuery = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
        const hSnap = await getDocs(hQuery);
        
        const now = new Date();
        const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
        const hData: any[] = [];
        
        for (const d of hSnap.docs) {
          const data = d.data();
          const createdAt = new Date(data.createdAt).getTime();
          
          if (now.getTime() - createdAt > sixtyDaysMs) {
            // Auto delete old broadcast
            deleteDoc(doc(db, "broadcasts", d.id)).catch(console.error);
          } else {
            hData.push({ id: d.id, ...data });
          }
        }
        
        setHistory(hData);
      } catch (err) {
        console.error("Error fetching broadcast data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user, authLoading, router]);


  // Handle Image Upload for Broadcast Form
  const handleBroadcastImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const toastId = toast.loading("Uploading image...");
    try {
      const url = await uploadImageToCloudinary(file);
      setBroadcastForm(prev => ({ ...prev, image: url }));
      toast.success("Image uploaded", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    }
  };


  // Send Manual Broadcast
  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      toast.error("Title and Message are required.");
      return;
    }

    setSendingBroadcast(true);
    const toastId = toast.loading("Broadcasting message...");
    try {
      const newBroadcast = {
        ...broadcastForm,
        createdAt: new Date().toISOString(),
        sentBy: user?.uid
      };

      const docRef = await addDoc(collection(db, "broadcasts"), newBroadcast);

      setHistory([{ id: docRef.id, ...newBroadcast }, ...history]);

      setBroadcastForm({ title: "", message: "", image: "", url: "", urlLabel: "", audience: "All" });

      toast.success("Broadcast sent successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send broadcast", { id: toastId });
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Delete Broadcast from history
  const deleteBroadcast = async (id: string) => {
    const toastId = toast.loading("Deleting broadcast...");
    try {
      await deleteDoc(doc(db, "broadcasts", id));
      setHistory(history.filter(h => h.id !== id));
      setDeleteConfirm(null);
      toast.success("Broadcast deleted", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete", { id: toastId });
    }
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
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-6">
          <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
            Broadcasts & Notifications
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Send manual alerts or configure automated system messages.</p>
        </div>


        {/* ─── 1. Manual Broadcast Form ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send New Broadcast</h2>
          <p className="text-xs text-gray-500 mb-6">Manually push a notification to active users.</p>

          <form onSubmit={sendBroadcast}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-primary text-sm"
                  placeholder="Important Update..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Audience Target *</label>
                <select
                  value={broadcastForm.audience}
                  onChange={e => setBroadcastForm({ ...broadcastForm, audience: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-primary text-sm font-semibold"
                >
                  <option value="All">All Users (Drivers, Passengers, Admins)</option>
                  <option value="Drivers">Drivers Only</option>
                  <option value="Passengers">Passengers Only</option>
                  <option value="Admins">Admins Only</option>
                </select>
              </div>
            </div>

            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message Content *</label>
            <textarea
              value={broadcastForm.message}
              onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-primary text-sm min-h-[120px] mb-6"
              placeholder="Write the full broadcast message..."
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Attached Image</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={broadcastForm.image}
                      onChange={e => setBroadcastForm({ ...broadcastForm, image: e.target.value })}
                      className="flex-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-xs"
                      placeholder="Image URL"
                    />
                    <button type="button" onClick={() => broadcastImageRef.current?.click()} className="px-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors">
                      Upload
                    </button>
                    <input type="file" hidden ref={broadcastImageRef} accept="image/*" onChange={handleBroadcastImage} />
                  </div>
                  {broadcastForm.image && (
                    <div className="h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mt-2 bg-black">
                      <img src={broadcastForm.image} className="w-full h-full object-cover opacity-80" alt="Preview" />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Call to Action URL</label>
                  <input
                    type="text"
                    value={broadcastForm.url}
                    onChange={e => setBroadcastForm({ ...broadcastForm, url: e.target.value })}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">URL Button Label</label>
                  <input
                    type="text"
                    value={broadcastForm.urlLabel}
                    onChange={e => setBroadcastForm({ ...broadcastForm, urlLabel: e.target.value })}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm"
                    placeholder="e.g. View More"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sendingBroadcast}
                className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50"
              >
                {sendingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                Send Broadcast
              </button>
            </div>
          </form>
        </div>

        {/* ─── 2. Broadcast History ─── */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            Broadcast History
          </h2>

          {history.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-gray-100 dark:border-gray-800">
              <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No broadcasts sent yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 md:items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.audience}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">{item.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setBroadcastForm({
                        title: item.title, message: item.message, image: item.image || "",
                        url: item.url || "", urlLabel: item.urlLabel || "", audience: item.audience
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Re-use
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Broadcast?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This removes it from history. Users who already received it will still see it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm && deleteBroadcast(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all text-sm shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
