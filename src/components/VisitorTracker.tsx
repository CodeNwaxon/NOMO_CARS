"use client";

import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function VisitorTracker() {
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        const hasVisited = localStorage.getItem("visitor_tracked");
        if (!hasVisited) {
          await addDoc(collection(db, "visitors"), {
            createdAt: new Date().toISOString(),
            userAgent: window.navigator.userAgent
          });
          localStorage.setItem("visitor_tracked", "true");
        }
      } catch (e) {
        console.error("Failed to track visitor:", e);
      }
    };
    
    // Slight delay to not block rendering
    const timer = setTimeout(() => {
      trackVisitor();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
