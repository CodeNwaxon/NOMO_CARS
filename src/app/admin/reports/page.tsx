"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, MessageCircle, AlertTriangle, Phone, Mail, Loader2, ArrowLeft, User, Search, Flag } from "lucide-react";
import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import toast from "react-hot-toast";

interface HelpMessage {
  id: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: any;
  userId?: string;
}

interface Incident {
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterImage: string;
  reporterPhone: string;
  reason: string;
  date: string;
}

interface UserReport {
  id: string;
  reportedUserId: string;
  reportedUserEmail: string;
  reportedUserName: string;
  reportedUserImage: string;
  reportedUserRole: string;
  reportedUserPhone: string;
  incidents: Incident[];
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"help" | "reports">("help");
  
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/driver/login");
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Fetch contact messages
        const msgSnap = await getDocs(collection(db, "contact_messages"));
        const messages: HelpMessage[] = [];
        msgSnap.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as HelpMessage);
        });
        // Sort newest first
        messages.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setHelpMessages(messages);

        // Fetch reports
        const repSnap = await getDocs(collection(db, "reports"));
        const reports: UserReport[] = [];
        repSnap.forEach((doc) => {
          reports.push({ id: doc.id, ...doc.data() } as UserReport);
        });
        setUserReports(reports);

        // Mark as seen globally for all admins
        if (reports.length > 0) {
          const notifRef = doc(db, "adminSettings", "notifications");
          const notifSnap = await getDoc(notifRef);
          const data = notifSnap.exists() ? notifSnap.data() : {};
          const currentSeen = new Set(data.seenReports || []);
          reports.forEach(r => currentSeen.add(r.id));
          
          await setDoc(notifRef, {
            ...data,
            seenReports: Array.from(currentSeen)
          }, { merge: true });
        }
      } catch (err) {
        console.error("Error fetching reports data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  const formatPhoneForWhatsApp = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "234" + cleaned.substring(1);
    }
    return cleaned;
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-20 px-3 md:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-brand-primary transition-colors flex items-center gap-2 mb-6 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
              Reports & Messages
            </h1>
          </div>

          <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1.5 rounded-lg self-start">
            <button
              onClick={() => setActiveTab("help")}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all ${
                activeTab === "help"
                  ? "bg-white dark:bg-gray-700 text-brand-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Help Messages
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all ${
                activeTab === "reports"
                  ? "bg-white dark:bg-gray-700 text-brand-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              User Misconduct
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "help" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {helpMessages.length === 0 ? (
              <div className="col-span-full py-8 md:py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <MessageCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No help messages found.</p>
              </div>
            ) : (
              helpMessages.map((msg) => (
                <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-lg p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex-1 truncate pr-4">{msg.email}</h3>
                    {msg.createdAt?.seconds && (
                      <span className="text-xs text-gray-400">{new Date(msg.createdAt.seconds * 1000).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  {msg.phone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {msg.phone}
                    </p>
                  )}
                  
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-gray-700 dark:text-gray-300 text-sm mb-6 flex-1 overflow-y-auto max-h-[150px]">
                    {msg.message}
                  </div>

                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-400">Quick Contact:</span>
                    <div className="flex gap-2">
                      {msg.phone && (
                        <>
                          <a href={`tel:${msg.phone}`} className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                          <a href={`https://wa.me/${formatPhoneForWhatsApp(msg.phone)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <a href={`mailto:${msg.email}`} className="w-9 h-9 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors">
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {userReports.length === 0 ? (
              <div className="col-span-full py-8 md:py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No user misconduct reports found.</p>
              </div>
            ) : (
              userReports.map((report) => (
                <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      {report.reportedUserImage ? (
                        <img src={report.reportedUserImage} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate w-full pr-2">{report.reportedUserName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{report.reportedUserRole}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedReport(report)}
                    className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all border border-red-100 dark:border-red-900/30 group"
                  >
                    <Flag className="w-4 h-4" />
                    Flagged <span className="font-black text-lg group-hover:text-white transition-colors">{report.incidents?.length || 0}</span> times
                  </button>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/driver/profile/${report.reportedUserId}`} className="flex-1 text-center py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors">
                      View Profile
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Expanded Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Incidents for {selectedReport.reportedUserName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Review all flags submitted against this user.
                </p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-gray-900">
              {selectedReport.incidents?.map((incident, idx) => (
                <div key={idx} className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-5 border border-red-100/50 dark:border-red-900/30">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                        {incident.reporterImage ? (
                          <img src={incident.reporterImage} alt="Reporter" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Reported by {incident.reporterName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(incident.date).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Reporter Actions */}
                    <div className="flex gap-1">
                      {incident.reporterPhone && (
                        <>
                          <a href={`tel:${incident.reporterPhone}`} className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors" title="Call Reporter">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a href={`https://wa.me/${formatPhoneForWhatsApp(incident.reporterPhone)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors" title="WhatsApp Reporter">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      {incident.reporterEmail && (
                        <a href={`mailto:${incident.reporterEmail}`} className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors" title="Email Reporter">
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-gray-700 dark:text-gray-300 text-sm border border-gray-100 dark:border-gray-700">
                    <span className="font-bold block mb-1 text-gray-900 dark:text-white">Reason:</span>
                    {incident.reason}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
