import { getFirestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth } from "./firebase-admin";

/**
 * Obtiene la instancia de Firestore Admin
 */
function getAdminFirestore() {
  const admin = require("firebase-admin");
  if (admin.apps.length === 0) {
    // Si no está inicializado, usar getAdminAuth para inicializar
    getAdminAuth();
  }
  return getFirestore();
}

/**
 * Crea o actualiza un usuario en la colección system/users
 * @param {string} uid - ID del usuario en Firebase Auth
 * @param {Object} userData - Datos del usuario (email, name, etc.)
 * @param {number} validityDays - Días de validez (por defecto 1)
 * @returns {Promise<Object>} Datos del usuario guardado
 */
export async function createSystemUser(uid, userData = {}, validityDays = 1) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("system").doc("users");
    
    // Obtener el documento existente o crear uno nuevo
    const userDoc = await userRef.get();
    const existingUsers = userDoc.exists ? (userDoc.data().users || []) : [];
    
    // Verificar si el usuario ya existe
    const existingUserIndex = existingUsers.findIndex(u => u.uid === uid);
    
    // Calcular fecha de expiración (1 día desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);
    
    const now = Timestamp.now();
    const expiresAtTimestamp = Timestamp.fromDate(expiresAt);
    
    const userRecord = {
      uid,
      email: userData.email || "",
      name: userData.name || "",
      isActive: true,
      createdAt: now,
      expiresAt: expiresAtTimestamp,
      lastLogin: null,
      loginCount: 0,
      metadata: {
        ...userData.metadata,
        registeredAt: new Date().toISOString(),
      }
    };
    
    if (existingUserIndex >= 0) {
      // Actualizar usuario existente, pero mantener fecha de creación original
      const originalCreatedAt = existingUsers[existingUserIndex].createdAt || now;
      existingUsers[existingUserIndex] = {
        ...existingUsers[existingUserIndex],
        ...userRecord,
        createdAt: originalCreatedAt, // Mantener fecha original
      };
    } else {
      // Agregar nuevo usuario
      existingUsers.push(userRecord);
    }
    
    // Guardar en Firestore
    await userRef.set({
      users: existingUsers,
      updatedAt: Timestamp.now(),
      totalUsers: existingUsers.length
    }, { merge: true });
    
    return userRecord;
  } catch (error) {
    // console.error("Error creando usuario en system:", error);
    throw error;
  }
}

/**
 * Obtiene un usuario de la colección system/users
 * @param {string} uid - ID del usuario
 * @returns {Promise<Object|null>} Datos del usuario o null si no existe
 */
export async function getSystemUser(uid) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("system").doc("users");
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const users = userDoc.data().users || [];
    const user = users.find(u => u.uid === uid);
    
    return user || null;
  } catch (error) {
    // console.error("Error obteniendo usuario de system:", error);
    return null;
  }
}

/**
 * Verifica si un usuario tiene acceso válido
 * @param {string} uid - ID del usuario
 * @returns {Promise<Object>} { valid: boolean, expired: boolean, daysRemaining: number }
 */
export async function checkUserAccess(uid) {
  try {
    const user = await getSystemUser(uid);
    
    if (!user) {
      return {
        valid: false,
        expired: true,
        daysRemaining: 0,
        message: "Usuario no encontrado en el sistema"
      };
    }
    
    if (!user.isActive) {
      return {
        valid: false,
        expired: false,
        daysRemaining: 0,
        message: "Usuario inactivo"
      };
    }
    
    // Verificar expiración
    const expiresAt = user.expiresAt instanceof Date 
      ? user.expiresAt 
      : user.expiresAt?.toDate 
        ? user.expiresAt.toDate() 
        : new Date(user.expiresAt);
    const now = new Date();
    const expired = now > expiresAt;
    
    const diff = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return {
      valid: !expired && user.isActive,
      expired,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: expiresAt.toISOString(),
      message: expired 
        ? "El acceso del usuario ha expirado" 
        : `Acceso válido (${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''})`
    };
  } catch (error) {
    // console.error("Error verificando acceso de usuario:", error);
    return {
      valid: false,
      expired: true,
      daysRemaining: 0,
      message: "Error verificando acceso"
    };
  }
}

/**
 * Actualiza la última sesión del usuario
 * @param {string} uid - ID del usuario
 */
export async function updateUserLastLogin(uid) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("system").doc("users");
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const users = userDoc.data().users || [];
    const userIndex = users.findIndex(u => u.uid === uid);
    
    if (userIndex < 0) {
      return false;
    }
    
    users[userIndex] = {
      ...users[userIndex],
      lastLogin: Timestamp.now(),
      loginCount: (users[userIndex].loginCount || 0) + 1
    };
    
    await userRef.set({
      users,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    return true;
  } catch (error) {
    // console.error("Error actualizando último login:", error);
    return false;
  }
}

/**
 * Extiende la validez de un usuario
 * @param {string} uid - ID del usuario
 * @param {number} days - Días adicionales
 */
export async function extendUserValidity(uid, days) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("system").doc("users");
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const users = userDoc.data().users || [];
    const userIndex = users.findIndex(u => u.uid === uid);
    
    if (userIndex < 0) {
      return false;
    }
    
    const currentExpiresAt = users[userIndex].expiresAt instanceof Date
      ? users[userIndex].expiresAt
      : users[userIndex].expiresAt?.toDate 
        ? users[userIndex].expiresAt.toDate() 
        : new Date(users[userIndex].expiresAt);
    
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);
    
    users[userIndex] = {
      ...users[userIndex],
      expiresAt: newExpiresAt
    };
    
    await userRef.set({
      users,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    return true;
  } catch (error) {
    // console.error("Error extendiendo validez:", error);
    return false;
  }
}

/**
 * Obtiene todos los usuarios del sistema
 * @returns {Promise<Array>} Lista de usuarios
 */
export async function getAllSystemUsers() {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("system").doc("users");
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return [];
    }
    
    return userDoc.data().users || [];
  } catch (error) {
    // console.error("Error obteniendo usuarios:", error);
    return [];
  }
}

