"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getLicenseInfo, isLicenseValid } from "@/lib/license";
import { getAllModules, getEnabledModules, checkModuleAccess } from "@/lib/modules";

const LicenseContext = createContext({
  license: null,
  licenseInfo: null,
  loading: true,
  isValid: false,
  modules: [],
  enabledModules: [],
  loadingModules: true,
  checkAccess: async () => ({ access: false }),
  refreshLicense: async () => {},
  refreshModules: async () => {}
});

export const useLicense = () => useContext(LicenseContext);

const LicenseProvider = ({ children }) => {
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [modules, setModules] = useState([]);
  const [enabledModules, setEnabledModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Cargar información de licencia
  const loadLicense = async () => {
    try {
      setLoading(true);
      const info = await getLicenseInfo();
      const valid = await isLicenseValid();
      
      setLicenseInfo(info);
      setIsValid(valid);
    } catch (error) {
      console.error("Error cargando licencia:", error);
      setLicenseInfo({
        valid: false,
        expired: true,
        daysRemaining: 0,
        demoMode: false,
        message: "Error cargando licencia"
      });
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  // Cargar módulos
  const loadModules = async () => {
    try {
      setLoadingModules(true);
      const allModules = await getAllModules();
      const enabled = await getEnabledModules();
      
      setModules(allModules);
      setEnabledModules(enabled);
    } catch (error) {
      console.error("Error cargando módulos:", error);
      setModules([]);
      setEnabledModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  // Verificar acceso a un módulo
  const checkAccess = async (moduleId) => {
    return await checkModuleAccess(moduleId);
  };

  // Refrescar licencia
  const refreshLicense = async () => {
    await loadLicense();
  };

  // Refrescar módulos
  const refreshModules = async () => {
    await loadModules();
  };

  useEffect(() => {
    loadLicense();
    loadModules();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(() => {
      loadLicense();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const value = {
    license: null, // Mantener para compatibilidad
    licenseInfo,
    loading,
    isValid,
    modules,
    enabledModules,
    loadingModules,
    checkAccess,
    refreshLicense,
    refreshModules
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

export default LicenseProvider;


