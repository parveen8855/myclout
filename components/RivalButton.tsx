"use client";

import { arrayUnion } from "firebase/firestore";
import toast from "react-hot-toast";
import { updateUserDoc } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

interface RivalButtonProps {
  targetUserId?: string;
  targetName?: string;
}

export default function RivalButton({
  targetName,
  targetUserId,
}: RivalButtonProps) {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const rivals = Array.isArray(currentUser?.rivals) ? currentUser.rivals : [];
  const isRival = Boolean(targetUserId && rivals.includes(targetUserId));

  async function handleAddRival() {
    if (!currentUser?.uid || !targetUserId || isRival) {
      return;
    }

    try {
      await updateUserDoc(currentUser.uid, {
        rivals: arrayUnion(targetUserId),
      });
      setUser({
        ...currentUser,
        rivals: [...rivals, targetUserId],
      });
      toast.success("⚔️ Rival added! Beat them this week.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add rival.",
      );
    }
  }

  return (
    <button
      className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold transition ${
        isRival
          ? "cursor-default border-white/10 bg-white/5 text-[#888899]"
          : "border-[#f0c040]/40 text-[#f0c040] hover:bg-[#f0c040] hover:text-[#111118]"
      }`}
      disabled={isRival}
      onClick={handleAddRival}
      title={targetName ? `Add ${targetName} as rival` : "Add rival"}
      type="button"
    >
      {isRival ? "✓ Rival" : "⚔️ Add Rival"}
    </button>
  );
}
