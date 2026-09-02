"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bike,
  Car,
  Bus,
  Truck,
  Plane,
  Ship,
  Navigation,
  Users
} from "lucide-react";

const categories = [
  { name: "Dispatch Rider", id: "dispatch-rider", icon: Bike, color: "text-orange-500", bg: "bg-orange-500/10", hoverBorder: "hover:border-orange-500/50", hoverShadow: "hover:shadow-orange-500/20" },
  { name: "Keke (Tricycle)", id: "keke", icon: Navigation, color: "text-green-500", bg: "bg-green-500/10", hoverBorder: "hover:border-green-500/50", hoverShadow: "hover:shadow-green-500/20" },
  { name: "Car", id: "car", icon: Car, color: "text-blue-500", bg: "bg-blue-500/10", hoverBorder: "hover:border-blue-500/50", hoverShadow: "hover:shadow-blue-500/20" },
  { name: "Bus", id: "bus", icon: Bus, color: "text-indigo-500", bg: "bg-indigo-500/10", hoverBorder: "hover:border-indigo-500/50", hoverShadow: "hover:shadow-indigo-500/20" },
  { name: "Mini Van", id: "mini van", icon: Bus, color: "text-violet-500", bg: "bg-violet-500/10", hoverBorder: "hover:border-violet-500/50", hoverShadow: "hover:shadow-violet-500/20" },
  { name: "Van", id: "van", icon: Truck, color: "text-cyan-500", bg: "bg-cyan-500/10", hoverBorder: "hover:border-cyan-500/50", hoverShadow: "hover:shadow-cyan-500/20" },
  { name: "Truck", id: "truck", icon: Truck, color: "text-rose-500", bg: "bg-rose-500/10", hoverBorder: "hover:border-rose-500/50", hoverShadow: "hover:shadow-rose-500/20" },
  { name: "Airplane (Cargo)", id: "airplane", icon: Plane, color: "text-sky-500", bg: "bg-sky-500/10", hoverBorder: "hover:border-sky-500/50", hoverShadow: "hover:shadow-sky-500/20" },
  { name: "Ship", id: "ship", icon: Ship, color: "text-teal-500", bg: "bg-teal-500/10", hoverBorder: "hover:border-teal-500/50", hoverShadow: "hover:shadow-teal-500/20" },
];

export default function PassengerCategories() {
  const [showContactsModal, setShowContactsModal] = useState(false);

  return (
    <div className="min-h-screen py-8 md:py-16 px-3 md:px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-secondary/10 rounded-full blur-3xl -z-10 animate-pulse-slow pointer-events-none"></div>

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-6 md:mb-8 relative flex flex-col items-center">
          <h1 className="text-2xl md:text-5xl font-bold mb-0 md:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
            Choose Your Ride
          </h1>
          <p className="px-3 md:px-0 text-sm md:text-lg text-foreground/70 max-w-2xl mx-auto">
            Select a transport category below to find the perfect vehicle for your journey or cargo needs.
          </p>

          <div className="flex justify-end mt-4 md:mt-0 w-full md:w-auto px-2 md:px-0 md:absolute md:right-0 md:top-2">
            <button onClick={() => setShowContactsModal(true)} className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-xs md:text-sm hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>My Contacts</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.id} href={`/passenger/${cat.id}`} className="group block">
                <div className={`glass-panel rounded-lg md:rounded-2xl p-4 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${cat.hoverShadow} border-2 border-transparent ${cat.hoverBorder} h-full`}>
                  <div className={`w-16 h-16 rounded-full ${cat.bg} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:${cat.bg.replace('/10', '/20')} transition-all duration-300`}>
                    <Icon className={`w-8 h-8 ${cat.color}`} />
                  </div>
                  <h3 className="font-bold text-lg">{cat.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {showContactsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative zoom-in-95 duration-200">
            <button 
              onClick={() => setShowContactsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-card-border/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-card-border">
              <Users className="w-8 h-8 text-foreground/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">My Contacts</h2>
            <p className="text-foreground/70 mb-8 text-sm px-2">
              No contacts found. You haven't added any favorite drivers yet.
            </p>
            <button 
              onClick={() => setShowContactsModal(false)}
              className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
