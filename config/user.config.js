import { api } from "@/config/axios.config";

/**
 * Registra un usuario usando el endpoint que crea en Firebase Auth y system/users
 * @param {Object} data - { email, password, name, validityDays? }
 */
export const registerUser = async (data) => {
  try {
    // Usar el nuevo endpoint que crea en Firebase Auth y guarda en system/users
    const response = await api.post("/user/create-system-user", {
      email: data.email,
      password: data.password,
      name: data.name,
      validityDays: data.validityDays || 1, // Por defecto 1 día
    });

    return response.data;
  } catch (error) {
    return error.response?.data || {
      status: "fail",
      message: error.message || "Error al registrar usuario",
    };
  }
};
