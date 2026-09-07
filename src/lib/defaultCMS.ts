export const DEFAULT_SITE_CONFIG = {
  siteName: "NOMO CARS",
  siteLogo: "",
  heroTitle: "NOMO CARS",
  heroSubtitle: "Experience the best transport services. Whether you want to earn on the go or reach your destination in comfort.",
  driverCardImage: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop",
  driverCardText: "Register your vehicle and start earning today. Flexible hours, lots of Customers.",
  passengerCardImage: "https://res.cloudinary.com/lab9viho/image/upload/v1783341679/vcuxhi9nkvnju9wjddmq.jpg",
  passengerCardText: "Find the perfect ride for your journey. From dispatch riders to luxury cars and cargo ships.",
  footerText: "Experience the future of African transport systems. Connecting you with top-tier drivers for a seamless journey.",
  socials: [] as { platform: string; url: string }[],
  contactPhone: "+234 703 463 2037",
  contactEmail: "nomopoventures@gmail.com",
  contactAddress: "123 Nomo Cars Boulevard\nInnovation District\nTech City, TC 90210"
};

export const DEFAULT_ABOUT_CONFIG = {
  subHeader: "Redefining the future of freight and logistics across Africa.",
  card1Title: "Safety First",
  card1Text: "Every driver and vehicle undergoes rigorous vetting. We prioritize the security and integrity of your cargo above all else.",
  card2Title: "Reliable & Timely",
  card2Text: "Whether you're moving a small parcel or heavy haulage, our logistics network ensures your goods arrive exactly on time.",
  card3Title: "Fair Bidding",
  card3Text: "Transporters and clients negotiate freight rates transparently. Say goodbye to hidden fees and unpredictable logistics costs.",
  card4Title: "Anywhere You Go",
  card4Text: "From major ports to remote warehouses, Nomo Cars connects you to a fleet ready to deliver anywhere across the continent.",
};

export const DEFAULT_FAQ_CONFIG = [
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
  }
];

export const DEFAULT_POLICY_CONFIG = [
  {
    icon: "Shield",
    title: "1. Terms of Service",
    description: "By accessing and using Nomo Cars, you agree to comply with our platform's guidelines. We provide a seamless connection between independent drivers, logistic companies, and passengers.",
    bulletins: [
      "Users must be at least 18 years old to register as a driver.",
      "All vehicles must meet our safety and inspection standards before approval.",
      "Passengers must ensure they select the correct transport category for their needs."
    ]
  },
  {
    icon: "Lock",
    title: "2. Privacy Policy",
    description: "We are committed to safeguarding your personal information. When you use Nomo Cars, we collect data necessary to provide and improve our services.",
    bulletins: [
      "Location Data: Used strictly for matching you with nearby rides or passengers and tracking active journeys for safety.",
      "Account Information: Your profile details, including images and contact info, are securely stored and never sold to third parties."
    ]
  },
  {
    icon: "FileText",
    title: "3. Data Usage & Cookies",
    description: "Nomo Cars utilizes cookies and similar tracking technologies to enhance user experience, remember preferences, and analyze app traffic. You can manage your cookie preferences through your browser settings.",
    bulletins: []
  },
  {
    icon: "CheckCircle",
    title: "4. Compliance & Safety",
    description: "Safety is built into every ride. We strictly verify drivers and monitor trips. Any violation of our terms, including inappropriate behavior or fraudulent activity, will result in immediate account termination.",
    bulletins: []
  }
];
