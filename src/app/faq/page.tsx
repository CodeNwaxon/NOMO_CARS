"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";

const faqData = [
  {
    question: "How do I book a ride with Nomo Cars?",
    answer: "Simply sign in as a passenger, browse our available transport categories (like Dispatch Riders, Cars, or Buses), select a vehicle, and follow the prompts to complete your booking."
  },
  {
    question: "How can I register as a driver?",
    answer: "Navigate to the Driver Portal from the home page. Sign in with Google, fill out your vehicle or logistic company details, and submit them for review. Once approved, you can start earning."
  },
  {
    question: "Are the vehicles inspected before approval?",
    answer: "Yes, all vehicles and drivers go through a thorough vetting process to ensure safety, reliability, and high service standards before they are activated on our platform."
  },
  {
    question: "How is the pricing calculated?",
    answer: "Pricing is dynamically calculated based on distance, vehicle category, and current demand. You will always see an estimated fare before confirming your booking."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit/debit cards and various digital wallets depending on your region. Payment is seamlessly handled within the platform."
  },
  {
    question: "How does the job bidding system work?",
    answer: (
      <div className="space-y-4">
        <div>
          <strong className="block mb-1 text-foreground">For Passengers:</strong>
          Post a job request for drivers to bid on by using the "Create Bid" button on any vehicle category page. Your VIP tier determines your request limits (Non-VIP users get 1 free request per month).
        </div>
        <div>
          <strong className="block mb-1 text-foreground">For Drivers:</strong>
          Find jobs by clicking "Bid for Job" on your dashboard, or on any vehicle category page. Placing a bid consumes one of your available bids (Non-VIP drivers receive 1 free bid per month).
        </div>
        <div className="text-xs opacity-80 italic">
           Note: Limits reset monthly. If a passenger deletes a job you bid on, your bid is returned. If a user cancels maliciously, limits are not automatically returned, but you should report the user from their profile or chat.
        </div>
      </div>
    )
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Dynamic overlay for dark/light mode */}
      <div className="absolute inset-0 dark:bg-black/90 bg-white/95 z-0 transition-colors duration-300"></div>
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-secondary/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative pt-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-brand-secondary/10 text-brand-secondary rounded-full mb-4">
            <MessageCircleQuestion className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br from-gray-900 dark:from-white via-purple-800 dark:via-purple-200 to-brand-secondary">
            Frequently Asked Questions
          </h1>
          <p className="text-sm md:text-base text-foreground/70 max-w-xl mx-auto">
            Got questions? We've got answers. If you can't find what you're looking for, feel free to reach out to our support team.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'border-brand-secondary shadow-[0_0_20px_rgba(139,92,246,0.15)]' : 'hover:border-foreground/20'}`}
            >
              <button 
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-bold text-base md:text-lg pr-8">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-brand-secondary' : 'text-foreground/50'}`} />
              </button>
              
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-[800px] pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="text-sm md:text-base text-foreground/70 leading-relaxed border-t border-border/50 pt-4 mt-2">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-sm text-foreground/70 mb-4">Still have questions?</p>
          <Link href="/help" className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-white rounded-xl font-medium shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
