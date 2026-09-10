"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { finalizePayment } from "@/actions/payment";
import { Loader2, Printer, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

interface Transaction {
  reference: string;
  amount: number;
  type: string;
  createdAt: string;
  userEmail: string;
  userId: string;
}

export default function ReceiptPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/auth");
      return;
    }

    let retryCount = 0;
    const maxRetries = 10;

    const fetchReceipt = async () => {
      try {
        const docRef = doc(db, "transactions", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Transaction;
          setTransaction(data);
          setLoading(false);
        } else {
          // Recover a successful payment if the webhook has not written yet.
          await finalizePayment(id, user.uid);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchReceipt, 1500);
          } else {
            setError("Receipt not found. It may take a moment to process. Please refresh the page in a minute.");
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error("Error fetching receipt:", err);
        try {
          await finalizePayment(id, user.uid);
        } catch (finalizeError) {
          console.error("Receipt finalization retry failed:", finalizeError);
        }
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchReceipt, 1500);
        } else {
          setError("You do not have permission to view this receipt or it does not exist.");
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchReceipt();
    }
  }, [id, user, authLoading, router]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Receipt Unavailable</h1>
        <p className="text-gray-500 text-center mb-6">{error}</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const date = new Date(transaction.createdAt).toLocaleString();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 pt-8">
      {/* Non-printable controls */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
      </div>

      {/* The Receipt Container */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:bg-white print:text-black">
        
        {/* Header */}
        <div className="bg-brand-primary p-8 text-center print:bg-transparent print:text-black print:border-b-2 print:border-black">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md print:shadow-none print:border print:border-black">
            <CheckCircle2 className="w-8 h-8 text-brand-primary print:text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight print:text-black">Payment Successful</h1>
          <p className="text-white/80 mt-1 font-medium print:text-gray-600">{date}</p>
        </div>

        {/* Body */}
        <div className="p-8 md:p-10">
          <div className="flex justify-between items-end mb-10 pb-6 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount Paid</p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white print:text-black">₦{transaction.amount.toLocaleString()}</h2>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-sm rounded-full print:border print:border-green-600 print:bg-transparent">
                PAID
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Transaction ID</p>
              <p className="font-mono text-slate-900 dark:text-white font-medium print:text-black">{transaction.reference}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Customer Email</p>
                <p className="text-slate-900 dark:text-white font-medium print:text-black">{transaction.userEmail || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Purchase Type</p>
                <p className="text-slate-900 dark:text-white font-medium capitalize print:text-black">{transaction.type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 text-center border-t border-slate-200 dark:border-slate-800 print:bg-transparent print:border-t-2 print:border-black">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Thank you for your business!</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">If you have any questions, please contact support at nomocars.com.</p>
        </div>
      </div>
    </div>
  );
}
