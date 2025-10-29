import { NextResponse } from "next/server";
import { getAllModules, getEnabledModules, setModuleEnabled, updateModule, createModule } from "@/lib/modules";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { preflightApi, withCorsApi } from "@/lib/cors-api";

// Handler para OPTIONS (CORS preflight)
export function OPTIONS(request) {
  return preflightApi(request);
}

// Obtener todos los módulos o solo los habilitados
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";
    
    // Opcional: verificar autenticación
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      try {
        await verifyFirebaseToken(authHeader);
      } catch (error) {
        // Permitir acceso público para lectura de módulos
      }
    }

    const modules = enabledOnly 
      ? await getEnabledModules() 
      : await getAllModules();
    
    return withCorsApi(
      NextResponse.json({
        success: true,
        data: modules
      }),
      request
    );
  } catch (error) {
    console.error("Error obteniendo módulos:", error);
    return withCorsApi(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Error obteniendo módulos"
        },
        { status: 500 }
      ),
      request
    );
  }
}

// Crear nuevo módulo
export async function POST(request) {
  try {
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
    
    const moduleData = await request.json();
    
    if (!moduleData.id) {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "ID del módulo es requerido" },
          { status: 400 }
        ),
        request
      );
    }

    const result = await createModule(moduleData);

    if (result) {
      const modules = await getAllModules();
      return withCorsApi(
        NextResponse.json({
          success: true,
          data: modules
        }),
        request
      );
    } else {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "Error creando módulo" },
          { status: 500 }
        ),
        request
      );
    }
  } catch (error) {
    console.error("Error creando módulo:", error);
    return withCorsApi(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Error creando módulo"
        },
        { status: 500 }
      ),
      request
    );
  }
}

// Actualizar módulo
export async function PATCH(request) {
  try {
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
    const { moduleId, action, ...updates } = body;

    if (!moduleId) {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "ID del módulo es requerido" },
          { status: 400 }
        ),
        request
      );
    }

    let result = false;

    if (action === "toggle") {
      // Obtener módulo actual para toggle
      const { getModule } = await import("@/lib/modules");
      const module = await getModule(moduleId);
      result = await setModuleEnabled(moduleId, !(module?.enabled !== false));
    } else {
      result = await updateModule(moduleId, updates);
    }

    if (result) {
      const modules = await getAllModules();
      return withCorsApi(
        NextResponse.json({
          success: true,
          data: modules
        }),
        request
      );
    } else {
      return withCorsApi(
        NextResponse.json(
          { success: false, error: "Error actualizando módulo" },
          { status: 500 }
        ),
        request
      );
    }
  } catch (error) {
    console.error("Error actualizando módulo:", error);
    return withCorsApi(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Error actualizando módulo"
        },
        { status: 500 }
      ),
      request
    );
  }
}

