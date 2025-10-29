import { NextResponse } from "next/server";
import { getLicense, updateLicense, extendLicense, isLicenseValid, getLicenseInfo } from "@/lib/license";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { preflightApi, withCorsApi } from "@/lib/cors-api";

// Handler para OPTIONS (CORS preflight)
export function OPTIONS(request) {
  return preflightApi(request);
}

// Obtener información de licencia
export async function GET(request) {
  try {
    // Verificar autenticación (opcional, puede ser público para el cliente)
    const authHeader = request.headers.get("authorization");
    
    if (authHeader) {
      try {
        await verifyFirebaseToken(authHeader);
      } catch (error) {
        // Si falla la autenticación, aún permitir acceso (para demos)
        // O retornar error si prefieres autenticación obligatoria
      }
    }

    const licenseInfo = await getLicenseInfo();
    
    return withCorsApi(
      NextResponse.json({
        success: true,
        data: licenseInfo
      }),
      request
    );
  } catch (error) {
    console.error("Error obteniendo licencia:", error);
    return withCorsApi(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Error obteniendo información de licencia"
        },
        { status: 500 }
      ),
      request
    );
  }
}

// Actualizar licencia (solo para administradores en producción)
export async function PATCH(request) {
  try {
    // En producción, verificar rol de administrador
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "No autorizado" },
          { status: 401 }
        ),
        request
      );
    }

    await verifyFirebaseToken(authHeader);
    
    const body = await request.json();
    const { action, days, ...updates } = body;

    let result = false;

    switch (action) {
      case "extend":
        if (!days || days <= 0) {
          return withCorsApi(
            NextResponse.json(
              { success: false, error: "Días inválidos" },
              { status: 400 }
            ),
            request
          );
        }
        result = await extendLicense(days);
        break;
      
      case "update":
        result = await updateLicense(updates);
        break;
      
      default:
        return withCorsApi(
          NextResponse.json(
            { success: false, error: "Acción inválida" },
            { status: 400 }
          ),
          request
        );
    }

    if (result) {
      const licenseInfo = await getLicenseInfo();
      return withCorsApi(
        NextResponse.json({
          success: true,
          data: licenseInfo
        }),
        request
      );
    } else {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "Error actualizando licencia" },
          { status: 500 }
        ),
        request
      );
    }
  } catch (error) {
    console.error("Error actualizando licencia:", error);
    return withCorsApi(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Error actualizando licencia"
        },
        { status: 500 }
      ),
      request
    );
  }
}

