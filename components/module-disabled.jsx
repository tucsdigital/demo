"use client";
import React from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ModuleDisabled = ({ moduleName = "este módulo" }) => {
  const router = useRouter();

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-background min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Módulo No Disponible</CardTitle>
          </div>
          <CardDescription>
            Este módulo no está habilitado en tu licencia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acceso Restringido</AlertTitle>
            <AlertDescription>
              El módulo "<strong>{moduleName}</strong>" no está disponible en tu licencia actual.
              Contacta al administrador para habilitarlo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>¿Qué puedes hacer?</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contacta al administrador del sistema</li>
              <li>Solicita la habilitación de este módulo</li>
              <li>Una vez habilitado, podrás acceder a todas sus funciones</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => router.push("/dashboard")} 
              variant="default" 
              className="flex-1"
            >
              Volver al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDisabled;


