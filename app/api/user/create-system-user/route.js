import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { createSystemUser, checkUserAccess } from "@/lib/user-system";

/**
 * Endpoint para crear un usuario en Firebase Auth y guardarlo en system/users
 * POST /api/user/create-system-user
 * Body: { email, password, name, validityDays? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, validityDays = 1 } = body;

    // Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        {
          status: "fail",
          message: "Email y contraseña son requeridos",
        },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          status: "fail",
          message: "Formato de email inválido",
        },
        { status: 400 }
      );
    }

    // Validar contraseña
    if (password.length < 6) {
      return NextResponse.json(
        {
          status: "fail",
          message: "La contraseña debe tener al menos 6 caracteres",
        },
        { status: 400 }
      );
    }

    // Validar días de validez
    const days = parseInt(validityDays) || 1;
    if (days < 1 || days > 365) {
      return NextResponse.json(
        {
          status: "fail",
          message: "Los días de validez deben estar entre 1 y 365",
        },
        { status: 400 }
      );
    }

    // Crear usuario en Firebase Auth usando Admin SDK
    const auth = getAdminAuth();
    let userRecord;
    
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name || "",
        emailVerified: false,
      });
    } catch (authError) {
      // Si el usuario ya existe, obtener su información
      if (authError.code === "auth/email-already-exists") {
        try {
          const existingUser = await auth.getUserByEmail(email);
          userRecord = existingUser;
          
          // Verificar si ya está en system/users
          const access = await checkUserAccess(existingUser.uid);
          if (access.valid) {
            return NextResponse.json(
              {
                status: "success",
                message: "Usuario ya existe y tiene acceso válido",
                data: {
                  uid: existingUser.uid,
                  email: existingUser.email,
                  access: access,
                },
              },
              { status: 200 }
            );
          }
        } catch (getError) {
          return NextResponse.json(
            {
              status: "fail",
              message: "Error al obtener usuario existente",
              error: getError.message,
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          {
            status: "fail",
            message: "Error al crear usuario en Firebase Auth",
            error: authError.message,
          },
          { status: 500 }
        );
      }
    }

    // Guardar usuario en system/users con validez de 1 día (o los días especificados)
    const systemUser = await createSystemUser(
      userRecord.uid,
      {
        email: userRecord.email,
        name: name || userRecord.displayName || "",
        metadata: {
          createdVia: "api",
          authProvider: "email",
        },
      },
      days
    );

    // Verificar acceso
    const access = await checkUserAccess(userRecord.uid);

    return NextResponse.json(
      {
        status: "success",
        message: "Usuario creado exitosamente",
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: name || userRecord.displayName || "",
          systemUser,
          access,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // console.error("Error en create-system-user:", error);
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

/**
 * GET - Verificar acceso de un usuario
 * Query: ?uid=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json(
        {
          status: "fail",
          message: "UID es requerido",
        },
        { status: 400 }
      );
    }

    const access = await checkUserAccess(uid);

    return NextResponse.json(
      {
        status: "success",
        data: access,
      },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error verificando acceso:", error);
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

