import Link from "next/link";

export function Footer() {
  return (
    <footer className="pb-8 w-full mt-auto z-10 relative bg-background/50 backdrop-blur-sm">
      <div className="w-full px-8 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-center border-t dark:border-white/10 border-black/10 pt-8 pb-6">

        {/* Left: Write up */}
        <div className="text-center md:text-left order-1 md:order-1">
          <h3 className="md:text-xl font-bold mb-2 dark:text-white text-gray-900">NOMO CARS</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed max-w-xs mx-auto md:ml-0 md:mr-auto">
            Experience the future of African transport systems. Connecting you with top-tier drivers for a seamless journey.
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
          <a href="#" className="p-3 rounded-full dark:bg-white/10 bg-gray-200 dark:hover:bg-brand-primary hover:bg-brand-primary dark:text-white text-gray-700 hover:text-white transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
          </a>
          <a href="#" className="p-3 rounded-full dark:bg-white/10 bg-gray-200 dark:hover:bg-brand-primary hover:bg-brand-primary dark:text-white text-gray-700 hover:text-white transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
          </a>
          <a href="#" className="p-3 rounded-full dark:bg-white/10 bg-gray-200 dark:hover:bg-brand-primary hover:bg-brand-primary dark:text-white text-gray-700 hover:text-white transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
          </a>
        </div>

      </div>
      <div className="text-center pb-8 pt-4 text-sm dark:text-gray-500 text-gray-500">
        © {new Date().getFullYear()} Nomo Cars. All rights reserved.
      </div>
    </footer>
  );
}
