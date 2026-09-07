"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_SITE_CONFIG } from "@/lib/defaultCMS";
export function Footer() {
  const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE_CONFIG);
  
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "adminSettings", "siteConfig"));
        if (docSnap.exists()) {
          setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...docSnap.data() });
        }
      } catch (err) {}
    };
    fetchSiteConfig();
  }, []);

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
      case 'x': 
      case 'twitter': return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>;
      case 'instagram': return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
      case 'linkedin': return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;
      case 'tiktok': return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.31-1.9 1.53-4.36 2.16-6.75 1.88-2.4-.27-4.66-1.44-6.05-3.32-1.39-1.89-1.88-4.33-1.45-6.66.43-2.33 1.83-4.39 3.86-5.59 1.99-1.18 4.39-1.41 6.57-.69v4.13c-1.49-.91-3.41-.67-4.63.56-1.22 1.23-1.46 3.19-.6 4.67.86 1.48 2.71 2.22 4.4 1.75 1.67-.47 2.82-2.02 2.8-3.76-.03-5.74-.01-11.48-.02-17.22.01-.01.01-.01.02-.02z"/></svg>;
      default: return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
    }
  };

  return (
    <footer className="pb-8 w-full mt-auto z-10 relative bg-background/50 backdrop-blur-sm">
      <div className="w-full px-8 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-center border-t dark:border-white/10 border-black/10 pt-8 pb-6">

        {/* Left: Write up */}
        <div className="text-center md:text-left order-1 md:order-1">
          <h3 className="md:text-xl font-bold mb-2 dark:text-white text-gray-900 flex items-center justify-center md:justify-start gap-2">
            {siteConfig.siteLogo && (
              <img src={siteConfig.siteLogo} alt="Logo" className="w-6 h-6 rounded-full object-cover" />
            )}
            {siteConfig.siteName}
          </h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed max-w-xs mx-auto md:ml-0 md:mr-auto">
            {siteConfig.footerText}
          </p>
        </div>

        {/* Center: Buttons */}
        <div className="flex flex-row flex-nowrap justify-center items-center gap-1 md:gap-4 order-2 md:order-2 overflow-x-auto w-full no-scrollbar pb-1 md:pb-0">
          <Link href="/about" className="whitespace-nowrap px-2 md:px-6 py-1.5 md:py-2 dark:bg-white/10 bg-black/5 rounded-full font-medium dark:text-white text-gray-800 hover:bg-brand-primary hover:text-white transition-all border dark:border-white/10 border-black/10 shadow-sm text-[10px] md:text-sm">
            About Us
          </Link>
          <Link href="/policy" className="whitespace-nowrap px-2 md:px-6 py-1.5 md:py-2 dark:bg-white/10 bg-black/5 rounded-full font-medium dark:text-white text-gray-800 hover:bg-brand-primary hover:text-white transition-all border dark:border-white/10 border-black/10 shadow-sm text-[10px] md:text-sm">
            Privacy Policy
          </Link>
          <Link href="/faq" className="whitespace-nowrap px-2 md:px-6 py-1.5 md:py-2 dark:bg-white/10 bg-black/5 rounded-full font-medium dark:text-white text-gray-800 hover:bg-brand-primary hover:text-white transition-all border dark:border-white/10 border-black/10 shadow-sm text-[10px] md:text-sm">
            FAQ & Support
          </Link>
        </div>

        {/* Right: Socials */}
        <div className="flex justify-center md:justify-end gap-4 order-3 md:order-3">
          {siteConfig.socials.map((social, idx) => (
            <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full dark:bg-white/10 bg-gray-200 dark:hover:bg-brand-primary hover:bg-brand-primary dark:text-white text-gray-700 hover:text-white transition-all shadow-sm">
              {getSocialIcon(social.platform)}
            </a>
          ))}
        </div>

      </div>
      <div className="text-center pb-8 pt-4 text-sm dark:text-gray-500 text-gray-500">
        © {new Date().getFullYear()} {siteConfig.siteName}. All rights reserved.
      </div>
    </footer>
  );
}
