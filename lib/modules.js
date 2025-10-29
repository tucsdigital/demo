import { db } from "@/lib/firebase";
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

/**
 * Obtiene todos los módulos del sistema
 * @returns {Promise<Array>} Lista de módulos
 */
export async function getAllModules() {
  try {
    const modulesRef = collection(db, "modules");
    const modulesSnapshot = await getDocs(
      query(modulesRef, orderBy("order", "asc"))
    );
    
    if (modulesSnapshot.empty) {
      // Si no hay módulos, inicializar con los módulos por defecto
      await initializeDefaultModules();
      return await getAllModules(); // Recursión para obtener los módulos creados
    }
    
    return modulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error obteniendo módulos:", error);
    return [];
  }
}

/**
 * Obtiene solo los módulos habilitados
 * @returns {Promise<Array>} Lista de módulos habilitados
 */
export async function getEnabledModules() {
  const allModules = await getAllModules();
  return allModules.filter(module => module.enabled !== false);
}

/**
 * Obtiene un módulo específico por ID
 * @param {string} moduleId 
 * @returns {Promise<Object|null>}
 */
export async function getModule(moduleId) {
  try {
    const moduleRef = doc(db, "modules", moduleId);
    const moduleSnap = await getDoc(moduleRef);
    
    if (!moduleSnap.exists()) {
      return null;
    }
    
    return {
      id: moduleSnap.id,
      ...moduleSnap.data()
    };
  } catch (error) {
    console.error(`Error obteniendo módulo ${moduleId}:`, error);
    return null;
  }
}

/**
 * Verifica si un módulo está habilitado
 * @param {string} moduleId 
 * @returns {Promise<boolean>}
 */
export async function isModuleEnabled(moduleId) {
  const module = await getModule(moduleId);
  return module !== null && module.enabled !== false;
}

/**
 * Habilita o deshabilita un módulo
 * @param {string} moduleId 
 * @param {boolean} enabled 
 */
export async function setModuleEnabled(moduleId, enabled) {
  try {
    const moduleRef = doc(db, "modules", moduleId);
    await updateDoc(moduleRef, {
      enabled,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error(`Error actualizando módulo ${moduleId}:`, error);
    return false;
  }
}

/**
 * Actualiza un módulo
 * @param {string} moduleId 
 * @param {Object} updates 
 */
export async function updateModule(moduleId, updates) {
  try {
    const moduleRef = doc(db, "modules", moduleId);
    await updateDoc(moduleRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error(`Error actualizando módulo ${moduleId}:`, error);
    return false;
  }
}

/**
 * Crea un nuevo módulo
 * @param {Object} moduleData 
 */
export async function createModule(moduleData) {
  try {
    const moduleRef = doc(db, "modules", moduleData.id);
    await setDoc(moduleRef, {
      ...moduleData,
      enabled: moduleData.enabled !== undefined ? moduleData.enabled : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error creando módulo:", error);
    return false;
  }
}

/**
 * Inicializa los módulos por defecto del sistema
 */
async function initializeDefaultModules() {
  const defaultModules = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: "DashBoard",
      route: "/dashboard",
      enabled: true,
      order: 1,
      category: "main"
    },
    {
      id: "ventas",
      name: "Ventas / Presupuestos",
      icon: "Receipt",
      route: "/ventas",
      enabled: true,
      order: 2,
      category: "main"
    },
    {
      id: "envios",
      name: "Envíos",
      icon: "Truck",
      route: "/envios",
      enabled: true,
      order: 3,
      category: "main"
    },
    {
      id: "productos",
      name: "Productos",
      icon: "Building",
      route: "/productos",
      enabled: true,
      order: 4,
      category: "main"
    },
    {
      id: "stock",
      name: "Stock",
      icon: "Boxes",
      route: "/stock-compras",
      enabled: true,
      order: 5,
      category: "main"
    },
    {
      id: "gastos",
      name: "Gastos",
      icon: "PiggyBank",
      route: "/gastos",
      enabled: true,
      order: 6,
      category: "main"
    },
    {
      id: "obras",
      name: "Obras",
      icon: "Briefcase",
      route: "/obras",
      enabled: true,
      order: 7,
      category: "main"
    },
    {
      id: "clientes",
      name: "Clientes",
      icon: "Users2",
      route: "/clientes",
      enabled: true,
      order: 8,
      category: "main"
    },
    {
      id: "precios",
      name: "Precios",
      icon: "DollarSign",
      route: "/precios",
      enabled: true,
      order: 9,
      category: "main"
    },
    {
      id: "auditoria",
      name: "Auditoría",
      icon: "ClipboardList",
      route: "/auditoria",
      enabled: true,
      order: 10,
      category: "main"
    }
  ];
  
  try {
    for (const module of defaultModules) {
      const moduleRef = doc(db, "modules", module.id);
      const moduleSnap = await getDoc(moduleRef);
      
      // Solo crear si no existe
      if (!moduleSnap.exists()) {
        await setDoc(moduleRef, {
          ...module,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Error inicializando módulos por defecto:", error);
  }
}

/**
 * Verifica si el usuario tiene acceso a un módulo específico
 * También verifica que la licencia sea válida
 * @param {string} moduleId 
 * @returns {Promise<{access: boolean, reason?: string}>}
 */
export async function checkModuleAccess(moduleId) {
  // Primero verificar licencia
  const { isLicenseValid } = await import("./license");
  const licenseValid = await isLicenseValid();
  
  if (!licenseValid) {
    return {
      access: false,
      reason: "license_expired"
    };
  }
  
  // Luego verificar módulo
  const module = await getModule(moduleId);
  
  if (!module) {
    return {
      access: false,
      reason: "module_not_found"
    };
  }
  
  if (module.enabled === false) {
    return {
      access: false,
      reason: "module_disabled"
    };
  }
  
  return {
    access: true
  };
}


