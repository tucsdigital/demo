"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/provider/auth.provider";

/**
 * Hook para verificar y gestionar el acceso del usuario al sistema
 * Verifica si el usuario tiene acceso válido según system/users
 */
export function useUserAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState({
    valid: false,
    expired: false,
    daysRemaining: 0,
    loading: true,
    message: "",
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.uid) {
        setAccess({
          valid: false,
          expired: true,
          daysRemaining: 0,
          loading: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      try {
        const response = await fetch(`/api/user/create-system-user?uid=${user.uid}`);
        const data = await response.json();

        if (data.status === "success" && data.data) {
          setAccess({
            valid: data.data.valid,
            expired: data.data.expired,
            daysRemaining: data.data.daysRemaining,
            loading: false,
            message: data.data.message,
            expiresAt: data.data.expiresAt,
          });
        } else {
          setAccess({
            valid: false,
            expired: true,
            daysRemaining: 0,
            loading: false,
            message: data.message || "Error verificando acceso",
          });
        }
      } catch (error) {
        // console.error("Error verificando acceso:", error);
        setAccess({
          valid: false,
          expired: true,
          daysRemaining: 0,
          loading: false,
          message: "Error al verificar acceso",
        });
      }
    };

    checkAccess();
  }, [user?.uid]);

  return access;
}

