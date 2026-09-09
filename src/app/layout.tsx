import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ChatProvider } from "@/context/ChatContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import ReferralHandler from "@/components/ReferralHandler";
import VisitorTracker from "@/components/VisitorTracker";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nomo Cars - Hire Vehicles, Trucks, Boats & More",
  description: "Experience premium transport services with Nomo Cars. Hire vehicles, trucks, boats, airplanes, and more.",
  openGraph: {
    title: "Nomo Cars - Hire Vehicles, Trucks, Boats & More",
    description: "Experience premium transport services with Nomo Cars. Hire vehicles, trucks, boats, airplanes, and more.",
    siteName: "Nomo Cars",
    images: [{
      url: "https://res.cloudinary.com/lab9viho/image/upload/v1783341679/vcuxhi9nkvnju9wjddmq.jpg",
      width: 1200,
      height: 630,
      alt: "Nomo Cars"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomo Cars - Hire Vehicles, Trucks, Boats & More",
    description: "Experience premium transport services with Nomo Cars. Hire vehicles, trucks, boats, airplanes, and more.",
    images: ["https://res.cloudinary.com/lab9viho/image/upload/v1783341679/vcuxhi9nkvnju9wjddmq.jpg"]
  },
  icons: {
    icon: "/favicon.png",
  },
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <ReferralHandler />
        <VisitorTracker />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <NotificationProvider>
              <ChatProvider>
                <Toaster position="top-center" />
                <Navbar />
                {children}
                <InstallPrompt />
              </ChatProvider>
            </NotificationProvider>
          </AuthProvider>
          <ThemeToggle />
        </ThemeProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // Clear all old caches first
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      names.forEach(function(name) { caches.delete(name); });
                    });
                  }
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      registration.update();
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
