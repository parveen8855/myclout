import { NextResponse } from "next/server";
import { arrayUnion, collection, getDocs, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const updates = snapshot.docs.map(async (userDoc) => {
      const user = userDoc.data();
      const donatedThisWeek = Number(user.currentWeekDonated ?? 0) > 0;

      if (donatedThisWeek) {
        await updateDoc(userDoc.ref, {
          currentWeekDonated: 0,
        });
        return;
      }

      if (Number(user.streakFreezes ?? 0) > 0 && Number(user.streak ?? 0) > 0) {
        await updateDoc(userDoc.ref, {
          currentWeekDonated: 0,
          streakFreezes: increment(-1),
          timeline: arrayUnion({
            date: new Date(),
            description: "Used a Streak Freeze — streak saved!",
            icon: "🧊",
            milestone: true,
            title: "Used a Streak Freeze",
          }),
        });
        return;
      }

      await updateDoc(userDoc.ref, {
        currentWeekDonated: 0,
        streak: 0,
      });
    });

    await Promise.all(updates);

    return NextResponse.json({
      message: "Weekly reset complete",
      usersProcessed: snapshot.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Weekly reset failed.",
      },
      { status: 500 },
    );
  }
}
