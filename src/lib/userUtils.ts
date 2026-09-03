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
