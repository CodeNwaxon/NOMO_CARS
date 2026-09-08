"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, ArrowLeft, Shield, Clock, Users, MapPin, Loader2, Star, Trash2 } from "lucide-react";
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_ABOUT_CONFIG } from "@/lib/defaultCMS";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function AboutPage() {
  const { user, profile } = useAuth();
  const [ceoData, setCeoData] = useState({
    name: "Prince O. Nwachukwu",
    image: "/ceo2.jpeg",
    phone: "+234 703 463 2037",
    email: "princenwachukwu308@yahoo.com",
    message: "When we started Nomo Cars, we had a clear vision: to build a seamless, reliable, and highly efficient logistics network that connects businesses across Africa. Today, we are transforming how goods move.\n\nThe freight industry has historically struggled with supply chain bottlenecks, fragmented fleets, and lack of transparency. We built this platform to bridge the gap between heavy-duty transporters, businesses, and individuals who need reliable cargo movement.\n\nOur unique bidding system ensures competitive freight pricing, while our strict driver and vehicle verification guarantees the safety of your cargo. We are more than just a logistics company; we are your strategic partner in growth.\n\nThank you for trusting Nomo Cars to move your business. Together, we are delivering Africa's future."
  });
  const [aboutConfig, setAboutConfig] = useState(DEFAULT_ABOUT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const fetchedReviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(fetchedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newReviewComment.trim()) {
      toast.error("Please enter a review comment.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        userId: user.uid,
        userName: profile.username || profile.firstName || "Anonymous User",
        userImage: profile.displayImage || null,
        rating: newReviewRating,
        comment: newReviewComment,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "reviews"), reviewData);
      toast.success("Review submitted successfully!");
      setNewReviewComment("");
      setNewReviewRating(5);
      fetchReviews();
    } catch (error) {
      console.error("Error adding review:", error);
      toast.error("Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    setDeleteConfirmId(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "reviews", deleteConfirmId));
      toast.success("Review deleted successfully!");
      fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const userReview = user ? reviews.find(r => r.userId === user.uid) : null;

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const docRef = doc(db, "adminSettings", "about");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCeoData(prev => ({ ...prev, ...docSnap.data() }));
          setAboutConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error fetching CEO data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCeoData();
  }, []);

  return (
    <div className="pb-18 min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-secondary/10 to-transparent -z-10"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 z-10 relative">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary mb-1 md:mb-4">
            About Nomo Cars
          </h1>
          <p className="text-xs md:text-xl text-foreground/70 max-w-2xl whitespace-pre-wrap">
            {aboutConfig.subHeader}
          </p>
        </div>

        {/* CEO Message Section */}
        <section className="mb-12 md:mb-20 glass-panel rounded-xl md:rounded-3xl p-3 md:p-12 border border-white/10 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>

          {loading ? (
            <div className="flex justify-center items-center py-20 relative z-10">
              <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
              <div className="md:col-span-5 flex flex-col items-center md:items-start">
                <div className="relative w-60 h-65 md:w-72 md:h-72 mb-6 rounded-xl md:rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                  <Image
                    src={ceoData.image}
                    alt="Nomo Cars CEO"
                    fill
                    sizes="(max-width: 768px) 240px, 288px"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold dark:text-white">{ceoData.name}</h3>
                <p className="text-brand-primary font-medium mb-4">CEO & Founder, Nomo Cars</p>

                <div className="flex flex-col gap-2 w-full max-w-[300px]">
                  <a href={`tel:${ceoData.phone}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-bg border border-card-border hover:border-brand-primary/50 hover:shadow-sm transition-all text-sm group">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{ceoData.phone}</span>
                  </a>
                  <a href={`mailto:${ceoData.email}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-bg border border-card-border hover:border-brand-secondary/50 hover:shadow-sm transition-all text-[13px] sm:text-sm group">
                    <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-colors shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="font-medium truncate">{ceoData.email}</span>
                  </a>
                </div>
              </div>

              <div className="md:col-span-7">
                <h2 className="text-xl md:text-3xl font-bold mb-6 dark:text-white">Message from the CEO</h2>
                <div className="space-y-4 text-foreground/80 leading-relaxed text-sm md:text-lg whitespace-pre-wrap">
                  {ceoData.message}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Why Choose Us Section */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-12 dark:text-white">What Makes Nomo Cars Different?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mb-6">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">{aboutConfig.card1Title}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap">
                {aboutConfig.card1Text}
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary mb-6">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">{aboutConfig.card2Title}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap">
                {aboutConfig.card2Text}
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">{aboutConfig.card3Title}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap">
                {aboutConfig.card3Text}
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">{aboutConfig.card4Title}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap">
                {aboutConfig.card4Text}
              </p>
            </div>
          </div>
        </section>

        {/* Next Steps / CTA Section */}
        <section className="mt-20 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 dark:text-white">Have more questions?</h2>
          <div className="flex flex-row flex-nowrap items-center justify-center gap-2 md:gap-4 px-2">
            <Link
              href="/faq"
              className="px-4 py-2 md:px-8 md:py-3.5 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-1 text-xs md:text-base whitespace-nowrap"
            >
              Find Out More
            </Link>
            <Link
              href="/policy"
              className="px-4 py-2 md:px-8 md:py-3.5 bg-card-bg border border-card-border hover:border-brand-primary/50 text-foreground font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 text-xs md:text-base whitespace-nowrap"
            >
              Our Policies
            </Link>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="max-w-6xl mx-auto mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold dark:text-white mb-1">What Our Users Say</h2>
            <p className="text-xs md:text-base text-foreground/70">Read reviews from people who have used Nomo Cars</p>
          </div>

          <div className="flex flex-col gap-4 md:gap-10">
            {/* Review List */}
            <div>
              {loadingReviews ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="flex flex-row gap-2 overflow-x-auto pb-3 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 scrollbar-hide">
                  {reviews.map((review) => (
                    <div key={review.id} className="glass-panel p-2 md:p-5 rounded-md md:rounded-xl border border-card-border hover:border-brand-primary/20 transition-colors min-w-[47%] max-w-[47%] flex-shrink-0 snap-start md:min-w-0 md:max-w-none">
                      <div className="flex justify-between items-start mb-1.5 md:mb-3">
                        <div className="flex items-center gap-1.5 md:gap-3">
                          <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-card-border overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-brand-primary uppercase text-[8px] md:text-base">
                            {review.userImage ? (
                              <img src={review.userImage} alt={review.userName} className="w-full h-full object-cover" />
                            ) : (
                              review.userName?.charAt(0) || "U"
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-[9px] md:text-sm dark:text-white leading-tight truncate max-w-[80px] md:max-w-none">{review.userName}</h4>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-2 h-2 md:w-3 md:h-3 ${star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {user && user.uid === review.userId && (
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 md:p-1.5 rounded-lg transition-colors"
                            title="Delete your review"
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] md:text-sm text-foreground/80 leading-snug md:leading-relaxed break-words line-clamp-4 md:line-clamp-none">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 glass-panel rounded-2xl border border-dashed border-card-border">
                  <Star className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                  <p className="text-foreground/60">No reviews yet. Be the first to share your experience!</p>
                </div>
              )}
            </div>

            {/* Review Form */}
            <div>
              <div className="glass-panel p-4 rounded-md md:rounded-xl sticky top-2">
                <h3 className="text-xl font-bold mb-4 dark:text-white">Leave a Review</h3>

                {!user ? (
                  <div className="bg-brand-primary/10 rounded-md md:rounded-xl p-4 text-center border border-brand-primary/20">
                    <p className="text-sm mb-4">Please log in to share your review.</p>
                    <Link href="/" className="px-6 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors inline-block">
                      Sign In
                    </Link>
                  </div>
                ) : userReview ? (
                  <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-3">You have already submitted a review.</p>
                    <button
                      onClick={() => handleDeleteReview(userReview.id)}
                      className="text-xs text-red-500 hover:text-red-600 underline font-medium"
                    >
                      Delete my review to write a new one
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAddReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground/80">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-5 h-5 ${star <= newReviewRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground/80">Your Review</label>
                      <textarea
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="Tell us about your experience..."
                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all rounded-xl resize-none h-32 text-sm"

                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !newReviewComment.trim()}
                      className="w-full py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isSubmittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Review
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Review Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold mb-2 dark:text-white">Delete Review?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete your review? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteReview}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
