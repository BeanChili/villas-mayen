import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserPermissions } from "@/lib/permissions"

// Permisos del usuario logueado, para que el frontend arme el menu y
// oculte acciones. El enforcement real vive en cada endpoint.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!session || !userId) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const perms = await getUserPermissions(userId)
    if (!perms) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    return NextResponse.json({ success: true, data: perms })
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}
