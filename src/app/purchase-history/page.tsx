"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import { ArrowLeft, ExternalLink, Loader2, ReceiptText, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

type Transaction = {
  id: string;
  reference?: string;
  amount?: number;
  type?: string;
  planName?: string;
  createdAt?: string | { toDate?: () => Date };
};

function transactionDate(value: Transaction["createdAt"]) {
  if (value && typeof value === "object" && value.toDate) return value.toDate();
  return typeof value === "string" ? new Date(value) : null;
}

export default function PurchaseHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"delete" | "clear" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [transactionSnapshot, hiddenSnapshot] = await Promise.all([
        getDocs(query(collection(db, "transactions"), where("userId", "==", user.uid))),
        getDocs(collection(db, "users", user.uid, "hiddenTransactions")),
      ]);
      const hiddenIds = new Set(hiddenSnapshot.docs.map((hiddenDoc) => hiddenDoc.id));
      const visible = transactionSnapshot.docs
        .map((transactionDoc) => ({ id: transactionDoc.id, ...transactionDoc.data() } as Transaction))
        .filter((transaction) => !hiddenIds.has(transaction.id))
        .sort((a, b) => (transactionDate(b.createdAt)?.getTime() || 0) - (transactionDate(a.createdAt)?.getTime() || 0));
      setTransactions(visible);
    } catch (error) {
      console.error("Error loading purchase history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    loadHistory();
  }, [authLoading, user, router]);

  const hideTransactions = async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    setWorking(true);
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.set(doc(db, "users", user.uid, "hiddenTransactions", id), {
          transactionId: id,
          hiddenAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      setTransactions((current) => current.filter((transaction) => !ids.includes(transaction.id)));
      setAction(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error hiding purchase history:", error);
    } finally {
      setWorking(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-brand-primary animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link href="/" className="flex items-center gap-2 text-foreground/70 hover:text-brand-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button
            onClick={() => setAction("clear")}
            disabled={transactions.length === 0}
            className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear transaction history
          </button>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-primary">Account</p>
          <h1 className="text-3xl md:text-4xl font-black mt-1">Purchase History</h1>
          <p className="text-foreground/60 mt-2">Your receipts and completed purchases.</p>
        </div>

        {transactions.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-card-border p-12 text-center">
            <ReceiptText className="w-12 h-12 mx-auto text-foreground/30 mb-4" />
            <h2 className="text-xl font-bold">No purchase history</h2>
            <p className="text-foreground/60 mt-2">Completed purchases will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const date = transactionDate(transaction.createdAt);
              const purchaseName = transaction.planName || (transaction.type === "ticket" ? "Driver Ticket" : transaction.type === "vip" ? "VIP Upgrade" : "Purchase");
              return (
                <article key={transaction.id} className="glass-panel rounded-2xl border border-card-border p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold truncate">{purchaseName}</h2>
                    <p className="text-sm text-foreground/60 mt-1">{date ? date.toLocaleString() : "Date unavailable"}</p>
                    <p className="text-xs text-foreground/50 font-mono mt-1 truncate">{transaction.reference || transaction.id}</p>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <span className="font-black">₦{Number(transaction.amount || 0).toLocaleString()}</span>
                    <Link href={`/receipt/${transaction.reference || transaction.id}`} title="View receipt" className="p-2 rounded-lg text-brand-primary hover:bg-brand-primary/10">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button onClick={() => { setSelectedId(transaction.id); setAction("delete"); }} title="Hide purchase" className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <button onClick={() => { setAction(null); setSelectedId(null); }} className="float-right p-1 text-foreground/50 hover:text-foreground"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold mb-3">{action === "clear" ? "Clear transaction history?" : "Hide this transaction?"}</h2>
            <p className="text-sm text-foreground/70 mb-6">{action === "clear" ? "These purchases will disappear from your view. They will remain in our records." : "This purchase will disappear from your view. The receipt will remain in our records."}</p>
            <div className="flex gap-3">
              <button onClick={() => { setAction(null); setSelectedId(null); }} className="flex-1 py-2.5 rounded-xl border border-card-border font-semibold">Cancel</button>
              <button
                disabled={working}
                onClick={() => hideTransactions(action === "clear" ? transactions.map((transaction) => transaction.id) : selectedId ? [selectedId] : [])}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50"
              >
                {working ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : action === "clear" ? "Clear history" : "Hide transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
