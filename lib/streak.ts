/* eslint-disable @typescript-eslint/no-explicit-any */

import { updateUserDoc } from "@/lib/firestore";
import { getCurrentWeek } from "@/lib/utils";

export function getPreviousWeek() {
  const date = new Date();
  date.setDate(date.getDate() - 7);

  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function updateStreak(uid: string, user: any) {
  const lastDonationWeek = user?.lastDonationWeek;
  const currentWeek = getCurrentWeek();
  const previousWeek = getPreviousWeek();
  let newStreak = user?.streak ?? 0;

  if (lastDonationWeek === currentWeek) {
    newStreak = user?.streak ?? 0;
  } else if (lastDonationWeek === previousWeek) {
    newStreak = (user?.streak ?? 0) + 1;
  } else {
    newStreak = 1;
  }

  await updateUserDoc(uid, {
    lastDonationWeek: currentWeek,
    streak: newStreak,
  });

  return newStreak;
}
