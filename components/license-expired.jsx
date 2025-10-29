"use client";
import React from "react";
import { AlertCircle, Clock, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { logoutFirebase } from "@/lib/firebase";

const LicenseExpired = ({ licenseInfo }) => {
  const router = useRouter();
  const daysRemaining = licenseInfo?.daysRemaining || 0;
  const expired = licenseInfo?.expired || true;

  const handleLogout = async () => {
    await logoutFirebase();
    router.push("/auth/login");
  };

  if (!expired && daysRemaining > 0) {
    // Advertencia cuando quedan pocos días
    if (daysRemaining <= 7) {
      return (
        <div className="w-full h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <CardTitle>Licencia por Vencer</CardTitle>
              </div>
              <CardDescription>
                Tu licencia demo está por vencer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Quedan {daysRemaining} días</AlertTitle>
                <AlertDescription>
                  Tu período de evaluación expirará pronto. Contacta al administrador para extender tu licencia.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={handleLogout} variant="outline" className="flex-1">
                  Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return null; // Licencia válida y con tiempo suficiente
  }

  // Licencia expirada - Bloqueo total
  return (
    <div className="w-full h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            <CardTitle>Licencia Expirada</CardTitle>
          </div>
          <CardDescription>
            Tu período de evaluación ha finalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acceso Restringido</AlertTitle>
            <AlertDescription>
              El período de demo ha expirado. Para continuar utilizando el sistema, 
              necesitas una licencia activa. Contacta al administrador para obtener una nueva licencia.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>¿Qué pasó?</strong></p>
            <p>
              Tu licencia de evaluación temporal ha llegado a su fecha de expiración.
            </p>
            <p className="pt-2"><strong>¿Qué puedes hacer?</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contacta al administrador del sistema</li>
              <li>Solicita una extensión o licencia completa</li>
              <li>Una vez activada, podrás acceder nuevamente</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleLogout} variant="destructive" className="flex-1">
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseExpired;


