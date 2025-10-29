"use client";
import React, { useState, useEffect } from "react";
import { useLicense } from "@/provider/license.provider";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LicenseCounter = () => {
  const { licenseInfo, tolerantMode } = useLicense();
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!licenseInfo?.expiresAt) return "";

      const now = new Date();
      let expiresAt;

      // Si estamos en modo tolerante, extender 24 horas
      if (tolerantMode && licenseInfo.expired) {
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(licenseInfo.expiresAt);
      }

      const diff = expiresAt - now;

      if (diff <= 0) {
        return "Expirada";
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    };

    setTimeRemaining(calculateTimeRemaining());

    // Actualizar cada minuto
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [licenseInfo, tolerantMode]);

  if (!licenseInfo || !licenseInfo.expiresAt) {
    return null;
  }

  const isExpired = licenseInfo.expired && !tolerantMode;
  const isWarning = !isExpired && licenseInfo.daysRemaining <= 7;
  const isTolerant = tolerantMode && licenseInfo.expired;

  return (
    <Badge
      variant={isExpired ? "destructive" : isWarning ? "default" : "secondary"}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
        {
          "bg-yellow-500 hover:bg-yellow-600 text-white": isWarning,
          "bg-orange-500 hover:bg-orange-600 text-white": isTolerant,
        }
      )}
    >
      <Clock className="w-3 h-3" />
      <span className="font-mono">
        {isExpired ? "Expirada" : isTolerant ? `Modo gracia: ${timeRemaining}` : timeRemaining}
      </span>
    </Badge>
  );
};

export default LicenseCounter;

