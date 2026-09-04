"use client";

import Link from "next/link";
import { CarFront, Users } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (refCode) {
      localStorage.setItem("referralCode", refCode);
    }
  }, [refCode]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Dynamic overlay for the background image for dark/light mode */}
      <div className="absolute inset-0 dark:bg-black/80 bg-white/90 z-0 transition-colors duration-300"></div>

      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-primary/20 rounded-full blur-[100px] animate-pulse-slow z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-secondary/20 rounded-full blur-[100px] animate-pulse-slow z-0 pointer-events-none" style={{ animationDelay: '2s' }}></div>



      <div className="w-full max-w-4xl flex flex-col items-center justify-center flex-1 z-10 px-6 pt-24 pb-12">
        <div className="text-center mb-8 md:mb-16 relative">
          <h1 className="text-4xl md:text-8xl font-black tracking-tighter mb-1 md:mb-4 text-transparent bg-clip-text bg-gradient-to-br from-gray-900 dark:from-white via-blue-800 dark:via-blue-100 to-brand-primary drop-shadow-md dark:drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            NOMO <span className="dark:text-white text-gray-900 font-extrabold tracking-tight dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">CARS</span>
          </h1>
          <p className="text-sm md:text-xl dark:text-gray-200 text-gray-700 max-w-2xl mx-auto drop-shadow-md font-medium">
            Experience the best transport services. Whether you want to earn on the go or reach your destination in comfort.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full relative">
          {/* Driver Card */}
          <Link href="/driver" className="group block h-[250px] md:h-[300px] order-2 md:order-1">
            <div className="rounded-xl h-full flex flex-col justify-end text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)] border-2 border-brand-primary hover:border-green-500 relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')" }}>

              <div className="relative w-full dark:bg-black/80 bg-white/90 backdrop-blur-md pb-3 md:p-4 flex flex-col items-center">
                <div className="p-2 absolute -top-4 md:-top-8 md:w-12 md:h-12 w-10 h-10 rounded-full brand-bg dark:bg-brand-primary/90 bg-brand-primary text-white backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-green-500 transition-all duration-300 border border-brand-primary group-hover:border-green-500 shadow-xl">
                  <CarFront size={32} className="drop-shadow-md" />
                </div>
                <h2 className="text-2xl font-bold mt-6 md:mt-0 mb-2 dark:text-white text-gray-900 drop-shadow-md">Drivers</h2>
                <p className="dark:text-gray-200 text-gray-700 md:text-sm text-xs font-medium drop-shadow-md px-4">
                  Register your vehicle and start earning today. Flexible hours, lots of Customers.
                </p>
              </div>
            </div>
          </Link>

          {/* Passenger Card */}
          <Link href="/passenger" className="group block h-[250px] md:h-[300px] order-1 md:order-2">
            <div className="rounded-xl h-full flex flex-col justify-end text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)] border-2 border-brand-secondary hover:border-green-500 relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://res.cloudinary.com/lab9viho/image/upload/v1783341679/vcuxhi9nkvnju9wjddmq.jpg')" }}>

              <div className="relative w-full dark:bg-black/80 bg-white/90 backdrop-blur-md pb-3 md:p-4 flex flex-col items-center">
                <div className="p-2 absolute -top-4 md:-top-8 md:w-12 md:h-12 w-10 h-10 rounded-full dark:bg-brand-secondary/90 bg-brand-secondary text-white backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-green-500 transition-all duration-300 border border-brand-secondary group-hover:border-green-500 shadow-xl">
                  <Users size={32} className="drop-shadow-md" />
                </div>
                <h2 className="text-2xl font-bold mt-6 md:mt-0 mb-2 dark:text-white text-gray-900 drop-shadow-md">Book a Ride</h2>
                <p className="dark:text-gray-200 text-gray-700 md:text-sm text-xs font-medium drop-shadow-md px-4">
                  Find the perfect ride for your journey. From dispatch riders to luxury cars and cargo ships.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
