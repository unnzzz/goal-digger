export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all user-related data
    await prisma.$transaction(async (tx) => {
      // Delete quest completions
      await tx.questCompletion.deleteMany({
        where: { userId: user.id }
      });

      // Delete user items
      await tx.userItem.deleteMany({
        where: { userId: user.id }
      });

      // Delete goals
      await tx.goal.deleteMany({
        where: { userId: user.id }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: user.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
