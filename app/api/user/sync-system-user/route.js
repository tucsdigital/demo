import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createSystemUser, updateUserLastLogin, getSystemUser } from "@/lib/user-system";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * Endpoint para sincronizar usuario en system/users después del login
 * POST /api/user/sync-system-user
 * Headers: Authorization: Bearer <token>
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        {
          status: "fail",
          message: "Token de autorización requerido",
        },
        { status: 401 }
      );
    }

    // Verificar token y obtener información del usuario
    const decoded = await verifyFirebaseToken(authHeader);
    const uid = decoded?.uid;

    if (!uid) {
      return NextResponse.json(
        {
          status: "fail",
          message: "UID no encontrado en el token",
        },
        { status: 401 }
      );
    }

    // Obtener información completa del usuario desde Firebase Auth
    const auth = getAdminAuth();
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (error) {
      return NextResponse.json(
        {
          status: "fail",
          message: "Usuario no encontrado en Firebase Auth",
          error: error.message,
        },
        { status: 404 }
      );
    }

    // Verificar si el usuario ya existe en system/users
    const existingUser = await getSystemUser(uid);

    if (existingUser) {
      // Si existe, actualizar último login
      await updateUserLastLogin(uid);
      
      return NextResponse.json(
        {
          status: "success",
          message: "Usuario sincronizado (actualizado último login)",
          data: {
            uid,
            email: userRecord.email,
            name: userRecord.displayName || "",
            action: "updated",
          },
        },
        { status: 200 }
      );
    } else {
      // Si no existe, crear nuevo usuario en system/users con 1 día de validez
      const systemUser = await createSystemUser(
        uid,
        {
          email: userRecord.email || "",
          name: userRecord.displayName || "",
          metadata: {
            createdVia: "login_sync",
            authProvider: userRecord.providerData[0]?.providerId || "email",
            lastSync: new Date().toISOString(),
          },
        },
        1 // 1 día de validez por defecto
      );

      return NextResponse.json(
        {
          status: "success",
          message: "Usuario creado en system/users con 1 día de validez",
          data: {
            uid,
            email: userRecord.email,
            name: userRecord.displayName || "",
            systemUser,
            action: "created",
          },
        },
        { status: 201 }
      );
    }
  } catch (error) {
    // console.error("Error sincronizando usuario:", error);
    return NextResponse.json(
      {
        status: "fail",
        message: "Error interno del servidor",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

