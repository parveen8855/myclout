/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  arrayUnion,
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserDoc } from "@/lib/firestore";
import { getPreviousWeek } from "@/lib/streak";
import { getCurrentWeek } from "@/lib/utils";

type HallOfFameFilterType = "district" | "state" | "national";

export const saveWeeklyChampion = async (
  user: any,
  filterType: string,
  rank: number,
) => {
  if (rank !== 1 || !user?.uid) {
    return;
  }

  const week = getCurrentWeek();
  const currentChronicleRef = doc(
    db,
    "weekly_chronicle",
    `${week}_${filterType}_${user.uid}`,
  );

  await setDoc(
    currentChronicleRef,
    {
      amount: user.currentWeekDonated ?? 0,
      badges: user.badges || [],
      createdAt: serverTimestamp(),
      displayName: user.isAnonymous ? "👻 Anonymous" : user.name,
      district: user.district,
      filterType,
      state: user.state,
      streak: user.streak,
      totalDonated: user.totalDonated,
      userId: user.uid,
      week,
    },
    { merge: true },
  );

  const prevWeek = getPreviousWeek();
  const prevRef = doc(
    db,
    "weekly_chronicle",
    `${prevWeek}_${filterType}_${user.uid}`,
  );
  const prevSnap = await getDoc(prevRef);

  if (prevSnap.exists()) {
    const prevData = prevSnap.data();
    const consecutiveWeeks = (prevData.consecutiveWeeks || 1) + 1;

    await updateDoc(currentChronicleRef, { consecutiveWeeks });

    if (consecutiveWeeks >= 3) {
      await updateUserDoc(user.uid, {
        badges: arrayUnion("undefeated"),
        isUndefeated: true,
      });
    }
  }

  const hofRef = doc(db, "hall_of_fame", `national_1_${user.uid}`);
  const hofSnap = await getDoc(hofRef);
  const existingTotal = hofSnap.exists()
    ? hofSnap.data()?.totalDonated || hofSnap.data()?.amount || 0
    : 0;

  if (!hofSnap.exists() || (user.totalDonated ?? 0) > existingTotal) {
    await setDoc(
      hofRef,
      {
        badges: user.badges || [],
        displayName: user.isAnonymous ? "👻 Anonymous" : user.name,
        district: user.district,
        state: user.state,
        streak: user.streak,
        timestamp: serverTimestamp(),
        totalDonated: user.totalDonated ?? 0,
        type: "national_1",
        userId: user.uid,
        week,
        weeklyAmount: user.currentWeekDonated ?? 0,
      },
      { merge: true },
    );
  }
};

export const getWeeklyChronicle = async () => {
  const chronicleQuery = query(
    collection(db, "weekly_chronicle"),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  const snap = await getDocs(chronicleQuery);

  return snap.docs.map((chronicleDoc) => ({
    id: chronicleDoc.id,
    ...chronicleDoc.data(),
  }));
};

export const getStateLegends = async () => {
  const legendsQuery = query(
    collection(db, "hall_of_fame"),
    orderBy("totalDonated", "desc"),
    limit(28),
  );
  const snap = await getDocs(legendsQuery);

  return snap.docs.map((legendDoc) => ({
    id: legendDoc.id,
    ...legendDoc.data(),
  }));
};

export async function updateHallOfFame(
  user: any,
  rank: number,
  filterType: HallOfFameFilterType,
) {
  await saveWeeklyChampion(user, filterType, rank);
}
