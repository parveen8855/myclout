/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function getDateMillis(value: any) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toDate?.()?.getTime?.() ?? 0;
}

export async function createUserDoc(uid: string, data: any) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function getUserDoc(uid: string) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function updateUserDoc(uid: string, data: any) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function getWeeklyLeaderboard(
  filterType: "state" | "district" | "national",
  filterValue?: string,
): Promise<any[]> {
  try {
    console.log("Fetching leaderboard:", filterType, filterValue);

    const leaderboardRef = collection(db, "leaderboard_weekly");
    const leaderboardQuery =
      filterType === "national"
        ? query(leaderboardRef, orderBy("amount", "desc"), limit(50))
        : query(
            leaderboardRef,
            where(filterType, "==", filterValue ?? ""),
            orderBy("amount", "desc"),
            limit(50),
          );
    const snapshot = await getDocs(leaderboardQuery);
    const docs = await Promise.all(
      snapshot.docs.map(async (leaderboardDoc, index) => {
        const data = leaderboardDoc.data() as any;
        const userId = data.userId as string | undefined;

        if (!userId) {
          return {
            ...data,
            rank: data.rank ?? index + 1,
          };
        }

        try {
          const userRef = doc(db, "users", userId);
          const userSnapshot = await getDoc(userRef);
          const userData = userSnapshot.exists() ? userSnapshot.data() : {};
          const boostExpiry = userData.boostExpiry;
          const boostIsValid =
            Boolean(userData.boostActive) &&
            getDateMillis(boostExpiry) > Date.now();

          if (userData.boostActive && !boostIsValid) {
            await updateDoc(userRef, { boostActive: false });
          }

          return {
            ...data,
            boostActive: boostIsValid,
            boostExpiry,
            photoURL: userData.photoURL,
            rank: data.rank ?? index + 1,
            upgrades: userData.upgrades ?? {},
          };
        } catch (error) {
          console.log("Leaderboard user enrichment error:", error);
          return {
            ...data,
            rank: data.rank ?? index + 1,
          };
        }
      }),
    );

    console.log("Results:", docs.length);

    return docs;
  } catch (error) {
    console.log("getWeeklyLeaderboard error:", error);
    return [];
  }
}

export async function addDonation(data: any) {
  return addDoc(collection(db, "donations"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getUserDonations(uid: string) {
  try {
    const donationsQuery = query(
      collection(db, "donations"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const snapshot = await getDocs(donationsQuery);

    return snapshot.docs.map((donationDoc) => ({
      id: donationDoc.id,
      ...donationDoc.data(),
    }));
  } catch (error) {
    console.log("getUserDonations error:", error);
    return [];
  }
}

export async function createRequest(data: any) {
  return addDoc(collection(db, "requests"), {
    ...data,
    status: data.status ?? "pending_review",
    createdAt: serverTimestamp(),
  });
}

export async function addRequest(data: any) {
  return createRequest(data);
}

export async function getRequest(requestId: string) {
  try {
    const snapshot = await getDoc(doc(db, "requests", requestId));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    console.log("getRequest error:", error);
    return null;
  }
}

export async function getRequests(
  filterType: "district" | "state" | "all",
  filterValue?: string,
  category?: string,
) {
  try {
    const constraints: QueryConstraint[] = [];

    if (filterType === "district") {
      constraints.push(where("district", "==", filterValue ?? ""));
    }

    if (filterType === "state") {
      constraints.push(where("state", "==", filterValue ?? ""));
    }

    if (category && category !== "all") {
      constraints.push(where("category", "==", category));
    }

    constraints.push(orderBy("createdAt", "desc"), limit(20));

    const requestsQuery = query(collection(db, "requests"), ...constraints);
    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));
  } catch (error) {
    console.log("getRequests error:", error);
    return [];
  }
}

export async function getUserRequests(uid: string) {
  try {
    const requestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30),
    );
    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));
  } catch (error) {
    console.log("getUserRequests error:", error);
    return [];
  }
}

export async function getCompletedPublicRequests() {
  try {
    const requestsQuery = query(
      collection(db, "requests"),
      where("status", "==", "completed"),
      where("isAnonymous", "==", false),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));
  } catch (error) {
    console.log("getCompletedPublicRequests error:", error);
    return [];
  }
}

export async function getAllRequestsForAdmin() {
  try {
    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));
  } catch (error) {
    console.log("getAllRequestsForAdmin error:", error);
    return [];
  }
}

export async function updateRequestDoc(requestId: string, data: any) {
  await updateDoc(doc(db, "requests", requestId), data);
}

export async function completeRequest(requestId: string) {
  // Admin-only helper for internal WeClout operations.
  await updateDoc(doc(db, "requests", requestId), {
    status: "completed",
  });
}
