import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

/**
 * Obtiene la licencia activa del sistema
 * @returns {Promise<Object|null>} Licencia o null si no existe
 */
export async function getLicense() {
  try {
    const licenseRef = doc(db, "system", "license");
    const licenseSnap = await getDoc(licenseRef);
    
    if (!licenseSnap.exists()) {
      // Si no existe, crear una licencia demo por defecto (30 días)
      const defaultLicense = {
        isActive: true,
        demoMode: true,
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días desde ahora
        ),
        createdAt: serverTimestamp(),
        features: [],
        notes: "Licencia demo inicial - 30 días"
      };
      
      await setDoc(licenseRef, defaultLicense);
      return defaultLicense;
    }
    
    const licenseData = licenseSnap.data();
    return {
      id: licenseSnap.id,
      ...licenseData,
      // Convertir Timestamp a Date si es necesario
      expiresAt: licenseData.expiresAt?.toDate ? licenseData.expiresAt.toDate() : licenseData.expiresAt
    };
  } catch (error) {
    console.error("Error obteniendo licencia:", error);
    return null;
  }
}

/**
 * Verifica si la licencia está expirada
 * @param {Object} license - Objeto de licencia
 * @returns {boolean} true si está expirada
 */
export function isLicenseExpired(license) {
  if (!license || !license.isActive) return true;
  if (!license.expiresAt) return false; // Sin fecha de expiración = válida indefinidamente
  
  const expiresAt = license.expiresAt instanceof Date 
    ? license.expiresAt 
    : license.expiresAt.toDate();
    
  return new Date() > expiresAt;
}

/**
 * Verifica si la licencia es válida (activa y no expirada)
 * @returns {Promise<boolean>} true si es válida
 */
export async function isLicenseValid() {
  const license = await getLicense();
  if (!license) return false;
  if (!license.isActive) return false;
  return !isLicenseExpired(license);
}

/**
 * Actualiza la licencia
 * @param {Object} updates - Datos a actualizar
 */
export async function updateLicense(updates) {
  try {
    const licenseRef = doc(db, "system", "license");
    await updateDoc(licenseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error actualizando licencia:", error);
    return false;
  }
}

/**
 * Extiende la fecha de expiración
 * @param {number} days - Número de días a extender
 */
export async function extendLicense(days) {
  const license = await getLicense();
  if (!license) return false;
  
  const currentExpiry = license.expiresAt instanceof Date 
    ? license.expiresAt 
    : license.expiresAt.toDate();
  
  const newExpiry = new Date(currentExpiry);
  newExpiry.setDate(newExpiry.getDate() + days);
  
  return await updateLicense({
    expiresAt: Timestamp.fromDate(newExpiry)
  });
}

/**
 * Activa o desactiva la licencia
 * @param {boolean} isActive 
 */
export async function setLicenseActive(isActive) {
  return await updateLicense({ isActive });
}

/**
 * Obtiene información de la licencia para mostrar al usuario
 * @returns {Promise<Object>}
 */
export async function getLicenseInfo() {
  const license = await getLicense();
  if (!license) {
    return {
      valid: false,
      expired: true,
      daysRemaining: 0,
      demoMode: false,
      message: "No hay licencia activa"
    };
  }
  
  const expired = isLicenseExpired(license);
  let daysRemaining = 0;
  
  if (license.expiresAt && !expired) {
    const expiresAt = license.expiresAt instanceof Date 
      ? license.expiresAt 
      : license.expiresAt.toDate();
    const diff = expiresAt.getTime() - new Date().getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  return {
    valid: license.isActive && !expired,
    expired,
    daysRemaining: Math.max(0, daysRemaining),
    demoMode: license.demoMode || false,
    expiresAt: license.expiresAt,
    message: expired 
      ? "La licencia ha expirado" 
      : `Licencia válida (${daysRemaining} días restantes)`
  };
}


