"use client";

import { Shield, Lock, FileText, CheckCircle, Smartphone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_POLICY_CONFIG } from "@/lib/defaultCMS";

const ICONS_MAP: Record<string, any> = {
  Shield: Shield,
  Lock: Lock,
  FileText: FileText,
  CheckCircle: CheckCircle,
  Smartphone: Smartphone,
  Mail: Mail,
  MapPin: MapPin,
};

export default function PolicyPage() {
  const [policyData, setPolicyData] = useState(DEFAULT_POLICY_CONFIG);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const docSnap = await getDoc(doc(db, "adminSettings", "policy"));
        if (docSnap.exists() && docSnap.data().items?.length > 0) {
          setPolicyData(docSnap.data().items);
        }
      } catch (err) {}
    };
    fetchPolicy();
  }, []);
  return (
    <div className="min-h-screen py-4 px-2 md:p-12 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Dynamic overlay for dark/light mode */}
      <div className="absolute inset-0 dark:bg-black/90 bg-white/95 z-0 transition-colors duration-300"></div>

      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-primary/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative pt-8">
        <div className="px-4 text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-5xl font-black mb-1 md:mb-2 text-transparent bg-clip-text bg-gradient-to-br from-gray-900 dark:from-white via-blue-800 dark:via-blue-200 to-brand-primary">
            Privacy Policy & Terms
          </h1>
          <p className="text-xs md:text-sm text-foreground/70 max-w-2xl mx-auto">
            Your privacy and security are our top priorities. Read our policies below to understand how we protect your data and the terms of using Nomo Cars.
          </p>
        </div>

        <div className="glass-panel rounded md:p-6 p-4 space-y-12">

          {policyData.map((policy, idx) => {
            const Icon = ICONS_MAP[policy.icon] || CheckCircle;
            
            return (
              <div key={idx}>
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold">{policy.title}</h2>
                  </div>
                  <div className="space-y-4 text-sm md:text-base text-foreground/70 leading-relaxed px-2 md:px-11">
                    <p className="whitespace-pre-wrap">{policy.description}</p>
                    {policy.bulletins && policy.bulletins.length > 0 && (
                      <ul className="list-disc pl-5 space-y-2 mt-4">
                        {policy.bulletins.map((bull, bIdx) => (
                          <li key={bIdx}>{bull}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
                {idx < policyData.length - 1 && (
                  <div className="h-px w-full bg-border/50 my-12"></div>
                )}
              </div>
            );
          })}

        </div>

        <div className="mt-12 text-center text-xs md:text-sm text-foreground/50">
          Last Updated: September 2026
        </div>
      </div>
    </div>
  );
}
