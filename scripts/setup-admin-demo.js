/**
 * Script de Utilidad para Superadmin
 * Configura rápida de licencia y módulos desde la línea de comandos
 * 
 * REQUISITO: Instalar firebase-admin: npm install firebase-admin
 * 
 * USO:
 * node scripts/setup-admin-demo.js --days 90
 * node scripts/setup-admin-demo.js --extend 30
 * node scripts/setup-admin-demo.js --disable obras,auditoria
 * node scripts/setup-admin-demo.js --status
 */

// Requiere firebase-admin para usar desde Node.js
const admin = require('firebase-admin');
const { initializeApp: initClientApp } = require('firebase/app');
const { getFirestore: getClientFirestore, doc: clientDoc, setDoc: clientSetDoc, getDoc: clientGetDoc, updateDoc: clientUpdateDoc, Timestamp, collection, getDocs, query, orderBy } = require('firebase/firestore');
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Configuración - Ajusta estos valores
const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCo4ibWtVXjR-diTFph0oEkbOayQy2J58k",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "fir-a2d21.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "fir-a2d21",
};

// IMPORTANTE: Usar variables de entorno en producción. Estos valores son solo para desarrollo local.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mazalautaro.dev@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // ⚠️ CAMBIAR EN PRODUCCIÓN

// Inicializar Firebase Client SDK
let app, db, auth;
try {
  app = initClientApp(FIREBASE_CONFIG);
  db = getClientFirestore(app);
  auth = getClientAuth(app);
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  console.error('💡 Asegúrate de tener las credenciales correctas en .env.local');
  process.exit(1);
}

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Inicia sesión como admin
 */
async function login() {
  try {
    log('🔐 Iniciando sesión como admin...', 'cyan');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    log('✅ Sesión iniciada correctamente', 'green');
    return true;
  } catch (error) {
    log(`❌ Error al iniciar sesión: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Obtiene información de la licencia
 */
async function getLicenseStatus() {
  try {
    const licenseRef = clientDoc(db, 'system', 'license');
    const licenseSnap = await clientGetDoc(licenseRef);
    
    if (!licenseSnap.exists()) {
      log('⚠️  No existe licencia. Usa --create para crear una.', 'yellow');
      return null;
    }
    
    const data = licenseSnap.data();
    const expiresAt = data.expiresAt?.toDate();
    const now = new Date();
    const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : '∞';
    const expired = expiresAt ? now > expiresAt : false;
    
    log('\n📋 ESTADO DE LICENCIA:', 'blue');
    log(`   Activa: ${data.isActive ? '✅ Sí' : '❌ No'}`, data.isActive ? 'green' : 'red');
    log(`   Modo Demo: ${data.demoMode ? '✅ Sí' : '❌ No'}`);
    if (expiresAt) {
      log(`   Expira: ${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString()}`);
      log(`   Días restantes: ${daysRemaining}`, expired ? 'red' : daysRemaining < 7 ? 'yellow' : 'green');
      log(`   Estado: ${expired ? '❌ EXPIRADA' : '✅ VÁLIDA'}`, expired ? 'red' : 'green');
    } else {
      log(`   Expiración: ${'∞ INFINITA'}`, 'green');
    }
    if (data.notes) {
      log(`   Notas: ${data.notes}`);
    }
    
    return data;
  } catch (error) {
    log(`❌ Error obteniendo licencia: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Crea o actualiza la licencia
 */
async function createLicense(days = 30) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    log(`\n📝 Configurando licencia por ${days} días...`, 'cyan');
    
    const licenseRef = clientDoc(db, 'system', 'license');
    const licenseSnap = await clientGetDoc(licenseRef);
    
    const licenseData = {
      isActive: true,
      demoMode: true,
      expiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: Timestamp.now(),
      features: [],
      notes: `Licencia demo configurada - ${days} días`
    };
    
    if (licenseSnap.exists()) {
      await clientUpdateDoc(licenseRef, licenseData);
      log(`✅ Licencia actualizada`, 'green');
    } else {
      await clientSetDoc(licenseRef, {
        ...licenseData,
        createdAt: Timestamp.now()
      });
      log(`✅ Licencia creada`, 'green');
    }
    
    log(`   Expira: ${expiresAt.toLocaleDateString()}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error configurando licencia: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Extiende la licencia existente
 */
async function extendLicense(days) {
  try {
    log(`\n⏰ Extendiendo licencia ${days} días...`, 'cyan');
    
    const licenseRef = clientDoc(db, 'system', 'license');
    const licenseSnap = await clientGetDoc(licenseRef);
    
    if (!licenseSnap.exists()) {
      log('⚠️  No existe licencia. Creando nueva...', 'yellow');
      return await createLicense(days);
    }
    
    const data = licenseSnap.data();
    const currentExpiresAt = data.expiresAt?.toDate() || new Date();
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);
    
    await clientUpdateDoc(licenseRef, {
      expiresAt: Timestamp.fromDate(newExpiresAt),
      updatedAt: Timestamp.now(),
      notes: `Licencia extendida ${days} días - ${newExpiresAt.toLocaleDateString()}`
    });
    
    log(`✅ Licencia extendida hasta: ${newExpiresAt.toLocaleDateString()}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error extendiendo licencia: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Configura licencia sin expiración
 */
async function setUnlimitedLicense() {
  try {
    log(`\n♾️  Configurando licencia sin expiración...`, 'cyan');
    
    const licenseRef = clientDoc(db, 'system', 'license');
    
    await clientSetDoc(licenseRef, {
      isActive: true,
      demoMode: true,
      expiresAt: null,
      updatedAt: Timestamp.now(),
      features: [],
      notes: 'Licencia sin expiración'
    }, { merge: true });
    
    log(`✅ Licencia configurada sin expiración`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Obtiene estado de módulos
 */
async function getModulesStatus() {
  try {
    const modulesRef = collection(db, 'modules');
    const modulesSnapshot = await getDocs(query(modulesRef, orderBy('order', 'asc')));
    
    if (modulesSnapshot.empty) {
      log('⚠️  No hay módulos configurados', 'yellow');
      return [];
    }
    
    log('\n📦 MÓDULOS CONFIGURADOS:', 'blue');
    const modules = [];
    modulesSnapshot.forEach(doc => {
      const data = doc.data();
      modules.push({ id: doc.id, ...data });
      const status = data.enabled ? '✅' : '❌';
      log(`   ${status} ${data.name} (${doc.id}) - Orden: ${data.order}`);
    });
    
    return modules;
  } catch (error) {
    log(`❌ Error obteniendo módulos: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Habilita/deshabilita módulos
 */
async function toggleModules(moduleIds, enable) {
  try {
    log(`\n🔧 ${enable ? 'Habilitando' : 'Deshabilitando'} módulos...`, 'cyan');
    
    for (const moduleId of moduleIds) {
      const moduleRef = clientDoc(db, 'modules', moduleId);
      const moduleSnap = await clientGetDoc(moduleRef);
      
      if (!moduleSnap.exists()) {
        log(`   ⚠️  Módulo "${moduleId}" no existe`, 'yellow');
        continue;
      }
      
      await clientUpdateDoc(moduleRef, {
        enabled: enable,
        updatedAt: Timestamp.now()
      });
      
      const status = enable ? '✅ Habilitado' : '❌ Deshabilitado';
      log(`   ${status}: ${moduleId}`, enable ? 'green' : 'red');
    }
    
    return true;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Mostrar ayuda
  if (args.includes('--help') || args.includes('-h')) {
    log('\n📚 USO DEL SCRIPT:', 'blue');
    log('   node scripts/setup-admin-demo.js [opciones]\n');
    log('   Opciones:');
    log('     --days N          Crear/actualizar licencia para N días');
    log('     --extend N        Extender licencia N días');
    log('     --unlimited       Licencia sin expiración');
    log('     --status          Ver estado actual');
    log('     --enable ID       Habilitar módulo(s) (separados por coma)');
    log('     --disable ID      Deshabilitar módulo(s) (separados por coma)');
    log('     --modules-status  Ver estado de módulos');
    log('     --help            Mostrar esta ayuda\n');
    return;
  }
  
  // Iniciar sesión
  const loggedIn = await login();
  if (!loggedIn) {
    log('\n❌ No se pudo iniciar sesión. Verifica ADMIN_EMAIL y ADMIN_PASSWORD', 'red');
    process.exit(1);
  }
  
  // Procesar comandos
  if (args.includes('--status')) {
    await getLicenseStatus();
    await getModulesStatus();
  } else if (args.includes('--days')) {
    const daysIndex = args.indexOf('--days');
    const days = parseInt(args[daysIndex + 1]) || 30;
    await createLicense(days);
  } else if (args.includes('--extend')) {
    const extendIndex = args.indexOf('--extend');
    const days = parseInt(args[extendIndex + 1]) || 30;
    await extendLicense(days);
  } else if (args.includes('--unlimited')) {
    await setUnlimitedLicense();
  } else if (args.includes('--enable')) {
    const enableIndex = args.indexOf('--enable');
    const modules = args[enableIndex + 1]?.split(',') || [];
    await toggleModules(modules.map(m => m.trim()), true);
  } else if (args.includes('--disable')) {
    const disableIndex = args.indexOf('--disable');
    const modules = args[disableIndex + 1]?.split(',') || [];
    await toggleModules(modules.map(m => m.trim()), false);
  } else if (args.includes('--modules-status')) {
    await getModulesStatus();
  } else {
    log('\n⚠️  No se especificó ninguna acción. Usa --help para ver opciones.', 'yellow');
  }
  
  log('\n✅ Completado\n', 'green');
}

// Ejecutar
main().catch(console.error);

