"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Headphones, CheckCircle, ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HelpPage() {
  const { user } = useAuth();
  
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await addDoc(collection(db, "contact_messages"), {
        email,
        phone: phone || null,
        message,
        createdAt: new Date(),
        userId: user?.uid || null
      });
      
      setIsSuccess(true);
      setMessage("");
      setPhone("");
      if (!user) setEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to submit message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-8 md:pt-16 pb-12 px-6 lg:px-20 relative z-10">
        {/* Header - mobile only (above grid) */}
        <div className="w-full max-w-6xl mb-8 lg:hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-semibold mb-4">
            <Headphones className="w-4 h-4" />
            <span>Customer Support</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-3 leading-tight">
            We're Here to <span className="text-brand-primary">Help You</span>
          </h1>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-md">
            Have questions about our service, pricing, or need technical assistance? Our dedicated support team is ready to assist you.
          </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-start">
          
          {/* Left Column: Header (desktop) + Contact Info */}
          <div className="flex flex-col space-y-4 order-2 lg:order-1">
            {/* Header - desktop only (inside left column) */}
            <div className="hidden lg:block mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-semibold mb-4">
                <Headphones className="w-4 h-4" />
                <span>Customer Support</span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground mb-3 leading-tight">
                We're Here to <span className="text-brand-primary">Help You</span>
              </h1>
              <p className="text-sm text-foreground/70 leading-relaxed max-w-md">
                Have questions about our service, pricing, or need technical assistance? Our dedicated support team is ready to assist you.
              </p>
            </div>
            <div className="space-y-3 lg:space-y-6">
              {/* Email */}
              <div className="flex items-start gap-3 lg:gap-5 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-card-bg/50 transition-colors border border-transparent hover:border-card-border">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-brand-primary/10 text-brand-primary rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Mail className="w-4 h-4 lg:w-6 lg:h-6" />
                </div>
                <div>
                  <h3 className="text-sm lg:text-lg font-bold text-foreground mb-0.5 lg:mb-1">Email Support</h3>
                  <p className="text-sm lg:text-base text-foreground/70">Drop us a line anytime at</p>
                  <a href="mailto:support@nomocars.com" className="text-sm lg:text-base text-brand-primary font-medium hover:underline">support@nomocars.com</a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 lg:gap-5 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-card-bg/50 transition-colors border border-transparent hover:border-card-border">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-brand-primary/10 text-brand-primary rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Phone className="w-4 h-4 lg:w-6 lg:h-6" />
                </div>
                <div>
                  <h3 className="text-sm lg:text-lg font-bold text-foreground mb-0.5 lg:mb-1">Customer Care</h3>
                  <p className="text-sm lg:text-base text-foreground/70">Available Mon-Fri, 9am-6pm</p>
                  <a href="tel:+15551234567" className="text-sm lg:text-base text-brand-primary font-medium hover:underline">+1 (555) 123-4567</a>
                </div>
              </div>

              {/* Office Address */}
              <div className="flex items-start gap-3 lg:gap-5 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-card-bg/50 transition-colors border border-transparent hover:border-card-border">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-brand-primary/10 text-brand-primary rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-4 h-4 lg:w-6 lg:h-6" />
                </div>
                <div>
                  <h3 className="text-sm lg:text-lg font-bold text-foreground mb-0.5 lg:mb-1">Office Location</h3>
                  <p className="text-sm lg:text-base text-foreground/70 leading-relaxed">
                    123 Nomo Cars Boulevard<br />
                    Innovation District<br />
                    Tech City, TC 90210
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="w-full order-1 lg:order-2">
            <div className="bg-card-bg rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.05)] p-4 md:p-10 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-full -z-10" />
              
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Send a Message</h2>
              <p className="text-xs md:text-sm text-foreground/60 mb-8">Fill out the form below and we'll get back to you.</p>

              {isSuccess ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-500 mb-3">Message Sent!</h2>
                  <p className="text-foreground/80 mb-8 leading-relaxed">
                    Thank you for reaching out. Our support team has received your message and will contact you shortly.
                  </p>
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="w-full px-6 py-3 bg-card-bg border border-card-border hover:bg-foreground/5 text-foreground rounded-xl font-semibold transition-all shadow-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground">
                      Email Address <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all text-foreground placeholder:text-foreground/40 font-medium shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground">
                      Phone Number <span className="text-foreground/40 font-normal ml-1">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all text-foreground placeholder:text-foreground/40 font-medium shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground">
                      Your Message <span className="text-brand-primary">*</span>
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you today?"
                      rows={5}
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all text-foreground placeholder:text-foreground/40 font-medium resize-none shadow-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 text-base bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg hover:shadow-brand-primary/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Submit Message
                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
