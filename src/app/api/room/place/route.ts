import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, posX, posY, placed } = await req.json();

    if (!itemId || posX === undefined || posY === undefined || placed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user item
    const updatedItem = await prisma.userItem.update({
      where: {
        id: itemId,
        userId: user.id
      },
      data: {
        placed,
        posX: placed ? posX : null,
        posY: placed ? posY : null
      },
      include: {
        item: true
      }
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Error placing item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
