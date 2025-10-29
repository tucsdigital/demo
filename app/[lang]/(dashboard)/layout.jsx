"use client";
import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";
import { useAuth } from "@/provider/auth.provider";
import { useLicense } from "@/provider/license.provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LicenseExpired from "@/components/license-expired";

const Layout = ({ children, params: { lang } }) => {
  const { user, loading } = useAuth();
  const { licenseInfo, isValid, loading: loadingLicense } = useLicense();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="w-full h-screen flex items-center justify-center text-lg text-muted-foreground">Cargando sesión...</div>;
  }

  // Verificar licencia después de cargar
  if (loadingLicense) {
    return <div className="w-full h-screen flex items-center justify-center text-lg text-muted-foreground">Verificando licencia...</div>;
  }

  // Si la licencia está expirada, mostrar pantalla de bloqueo
  if (!isValid || licenseInfo?.expired) {
    return <LicenseExpired licenseInfo={licenseInfo} />;
  }

  // Puedes agregar aquí la lógica de traducción si lo necesitas
  return (
    <DashBoardLayoutProvider>{children}</DashBoardLayoutProvider>
  );
};

export default Layout;
