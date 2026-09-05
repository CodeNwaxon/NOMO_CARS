"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Send, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface ReportUserOverlayProps {
  reportedUserId: string;
  reportedUserRole: "driver" | "passenger";
  onClose: () => void;
}

const REPORT_REASONS = [
  "Unprofessional behavior",
  "Vehicle issues",
  "Reckless driving",
  "Harassment",
  "Payment issues",
  "Other"
];

export default function ReportUserOverlay({ reportedUserId, reportedUserRole, onClose }: ReportUserOverlayProps) {
  const { user, profile } = useAuth();

  const [phone, setPhone] = useState(profile?.phone || "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportedUserData, setReportedUserData] = useState<any>(null);

  useEffect(() => {
    const fetchReportedUser = async () => {
      if (!reportedUserId) return;
      try {
        const userDoc = await getDoc(doc(db, "users", reportedUserId));
        if (userDoc.exists()) {
          setReportedUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching reported user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportedUser();
  }, [reportedUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error("You must be logged in to report an account.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the report.");
      return;
    }

    if (phone.trim() && !/^0\d{10}$/.test(phone.trim())) {
      toast.error("Phone number must be exactly 11 digits and start with 0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const reportRef = doc(db, "reports", reportedUserId);

      const newIncident = {
        reporterId: user.uid,
        reporterName: profile.username || profile.firstName || "Unknown User",
        reporterEmail: user.email || "",
        reporterImage: profile.displayImage || user.photoURL || "",
        reporterPhone: phone.trim() || profile.phone || "",
        reason: reason.trim(),
        date: new Date().toISOString(), // Use ISO string to avoid complex serialization issues
      };

      await setDoc(reportRef, {
        reportedUserId,
        reportedUserEmail: reportedUserData?.email || "",
        reportedUserName: reportedUserData?.username || reportedUserData?.firstName || "Unknown",
        reportedUserImage: reportedUserData?.displayImage || "",
        reportedUserRole,
        reportedUserPhone: reportedUserData?.phone || "",
        incidents: arrayUnion(newIncident)
      }, { merge: true });

      toast.success("Report submitted successfully. We will review it shortly.");
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-in fade-in duration-200">
      <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-4 md:p-8 max-w-lg w-full shadow-2xl relative zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold">Report Account</h2>
            <p className="text-xs md:text-sm text-foreground/60">
              Please provide details about the issue with this {reportedUserRole}.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Your Email</label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="text-sm md:text-base w-full px-4 py-2 bg-foreground/5 border border-card-border rounded-xl text-foreground/70 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Your Phone Number <span className="text-foreground/50 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                className="text-sm md:text-base w-full px-4 py-2 bg-transparent border border-card-border rounded-xl text-foreground focus:outline-none focus:border-brand-primary transition-colors placeholder:text-foreground/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason for reporting</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(prev => (prev ? prev + ", " + r : r))}
                    className="px-3 py-1.5 text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full hover:bg-brand-primary hover:text-white transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                required
                className="w-full px-4 py-2 bg-transparent border border-card-border rounded-xl text-foreground focus:outline-none focus:border-brand-primary transition-colors placeholder:text-foreground/30 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
