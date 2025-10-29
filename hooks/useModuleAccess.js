"use client";
import { useEffect, useState } from "react";
import { useLicense } from "@/provider/license.provider";
import { useRouter } from "next/navigation";
import ModuleDisabled from "@/components/module-disabled";

/**
 * Hook para verificar acceso a un módulo específico
 * @param {string} moduleId - ID del módulo a verificar
 * @returns {{ hasAccess: boolean, loading: boolean, ModuleGuard: React.Component }}
 */
export function useModuleAccess(moduleId) {
  const { checkAccess, enabledModules, loadingModules } = useLicense();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAccess = async () => {
      if (loadingModules) {
        setLoading(true);
        return;
      }

      try {
        // Verificar si el módulo está en la lista de habilitados
        const moduleEnabled = enabledModules.some(
          m => (m.id || m) === moduleId
        );

        if (!moduleEnabled) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Verificar acceso completo (incluye licencia)
        const access = await checkAccess(moduleId);
        setHasAccess(access.access);
      } catch (error) {
        console.error("Error verificando acceso al módulo:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [moduleId, enabledModules, loadingModules, checkAccess]);

  // Componente guard para proteger rutas
  const ModuleGuard = ({ children, moduleName }) => {
    if (loading) {
      return (
        <div className="w-full h-screen flex items-center justify-center text-lg text-muted-foreground">
          Verificando acceso...
        </div>
      );
    }

    if (!hasAccess) {
      return <ModuleDisabled moduleName={moduleName || moduleId} />;
    }

    return <>{children}</>;
  };

  return {
    hasAccess,
    loading,
    ModuleGuard,
  };
}

/**
 * HOC para proteger componentes de página
 * @param {React.Component} Component - Componente a proteger
 * @param {string} moduleId - ID del módulo
 * @param {string} moduleName - Nombre del módulo para mostrar
 */
export function withModuleAccess(Component, moduleId, moduleName) {
  return function ProtectedComponent(props) {
    const { ModuleGuard } = useModuleAccess(moduleId);
    
    return (
      <ModuleGuard moduleName={moduleName}>
        <Component {...props} />
      </ModuleGuard>
    );
  };
}


