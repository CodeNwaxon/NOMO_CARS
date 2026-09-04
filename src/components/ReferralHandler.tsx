"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ReferralLogic() {
  const searchParams = useSearchParams();
  const refCode = searchParams?.get("ref");

  useEffect(() => {
    if (refCode) {
      localStorage.setItem("referralCode", refCode);
    }
  }, [refCode]);

  return null;
}

export default function ReferralHandler() {
  return (
    <Suspense fallback={null}>
      <ReferralLogic />
    </Suspense>
  );
}
