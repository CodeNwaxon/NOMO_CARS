import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const checkUsernameUnique = async (username: string, currentUserId?: string): Promise<boolean> => {
  if (!username) return false;
  
  try {
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const querySnapshot = await getDocs(q);
    
    // If no one has this username, it's unique
    if (querySnapshot.empty) {
      return true;
    }
    
    // If there's a match, ensure it only belongs to the current user (in case they haven't changed it)
    let isUnique = true;
    querySnapshot.forEach((doc) => {
      if (currentUserId && doc.id !== currentUserId) {
        isUnique = false;
      }
    });
    
    return isUnique;
  } catch (error) {
    console.error("Error checking username uniqueness:", error);
    // Fail safe: return false to prevent overriding, though could throw error
    return false;
  }
};

/**
 * Generate username suggestions when the desired username is taken.
 * Mixes random numbers and special characters (-, @, _) into various
 * positions of the base name to produce 5 unique-looking alternatives.
 */
export function generateUsernameSuggestions(base: string): string[] {
  const specialChars = ["-", "_", "@"];
  const suggestions = new Set<string>();

  const rand = (max: number) => Math.floor(Math.random() * max);
  const randNum = () => rand(1000); // 0–999
  const randSmall = () => rand(100); // 0–99
  const pick = <T,>(arr: T[]) => arr[rand(arr.length)];

  // Strategy 1: Append number  (e.g. Prince42)
  suggestions.add(`${base}${randSmall()}`);

  // Strategy 2: Append special + number  (e.g. Prince_83)
  suggestions.add(`${base}${pick(specialChars)}${randSmall()}`);

  // Strategy 3: Prepend number + special  (e.g. 7_Prince)
  suggestions.add(`${rand(10)}${pick(specialChars)}${base}`);

  // Strategy 4: Insert special in middle  (e.g. Pri-nce3)
  if (base.length >= 2) {
    const splitAt = Math.max(1, rand(base.length));
    const left = base.slice(0, splitAt);
    const right = base.slice(splitAt);
    suggestions.add(`${left}${pick(specialChars)}${right}${rand(10)}`);
  }

  // Strategy 5: Append larger number  (e.g. Prince247)
  suggestions.add(`${base}${randNum()}`);

  // Strategy 6: Double special insert (e.g. _Prince_9)
  suggestions.add(`${pick(specialChars)}${base}${pick(specialChars)}${rand(10)}`);

  // Strategy 7: Number in middle  (e.g. Prin5ce)
  if (base.length >= 3) {
    const splitAt = Math.max(1, rand(base.length - 1));
    const left = base.slice(0, splitAt);
    const right = base.slice(splitAt);
    suggestions.add(`${left}${rand(10)}${right}`);
  }

  // Return exactly 5 unique suggestions (deduplicated, no original)
  suggestions.delete(base);
  return Array.from(suggestions).slice(0, 5);
}

/**
 * Normalize a Nigerian phone number to the canonical +234XXXXXXXXXX format.
 * Handles inputs like 07034632037, 7034632037, +2347034632037, 2347034632037.
 */
export function normalizePhone(phone: string): string {
  // Strip everything except digits
  let digits = phone.replace(/\D/g, "");

  // If it starts with 234 and is 13 digits, it's already the full number
  if (digits.startsWith("234") && digits.length === 13) {
    return "+" + digits;
  }

  // If it starts with 0 and is 11 digits (e.g. 07034632037)
  if (digits.startsWith("0") && digits.length === 11) {
    return "+234" + digits.substring(1);
  }

  // If it's 10 digits without leading 0 (e.g. 7034632037)
  if (digits.length === 10 && !digits.startsWith("0")) {
    return "+234" + digits;
  }

  // Fallback: return with + prefix if it looks like it has country code
  if (digits.startsWith("234")) {
    return "+" + digits;
  }

  return "+" + digits;
}

/**
 * Check if a phone number is already used by another user.
 * Normalizes the input and checks against all possible stored formats.
 */
export const checkPhoneUnique = async (phone: string, currentUserId?: string): Promise<boolean> => {
  if (!phone) return true; // Empty phone is fine (optional field)

  const normalized = normalizePhone(phone);
  // Extract the 10-digit core (without country code and leading 0)
  const core = normalized.replace("+234", "");

  // Build all possible stored formats for this number
  const formats = [
    normalized,            // +2347034632037
    "0" + core,            // 07034632037
    core,                  // 7034632037
    "234" + core,          // 2347034632037
  ];

  try {
    // Query for each possible format (Firestore "in" supports up to 30 values)
    const q = query(
      collection(db, "users"),
      where("phone", "in", formats)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return true;

    // If there's a match, check it's not the current user
    let isUnique = true;
    querySnapshot.forEach((docSnap) => {
      if (currentUserId && docSnap.id !== currentUserId) {
        isUnique = false;
      } else if (!currentUserId) {
        isUnique = false;
      }
    });

    return isUnique;
  } catch (error) {
    console.error("Error checking phone uniqueness:", error);
    return true; // Fail open for phone (don't block save)
  }
};
