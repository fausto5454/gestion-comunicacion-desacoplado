import React, { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { UserPlus, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

// 🔗 Configuración real de Supabase
const SUPABASE_URL = "https://obbzgmvrykhlfcziqttj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYnpnbXZyeWtobGZjemlxdHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTEwMDUsImV4cCI6MjA3NzY4NzAwNX0.O-8TJ0BPn_3A-WIaOFNf4ekQxUrDkxItuWoz0pXl7rM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Roles disponibles
const roles = ["Alumno", "Profesor", "Directivo"];

const RegisterPage = ({ onSwitchToLogin }) => {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("Alumno");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1️⃣ Crear usuario en Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      const user = data.user;

      if (!user) {
        setSuccess(
          "Registro exitoso. Por favor, revisa tu correo para confirmar la cuenta."
        );
        setLoading(false);
        return;
      }

      // 2️⃣ Guardar información adicional en la tabla 'usuarios'
      const { error: insertError } = await supabase.from("usuarios").insert([
        {
          id_usuario: user.id,
          nombre_completo: nombreCompleto,
          correo_electronico: email,
          rol: rol,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("¡Registro exitoso! Ya puedes iniciar sesión.");
      setNombreCompleto("");
      setEmail("");
      setPassword("");
      setRol("Alumno");
    } catch (err) {
      console.error("Error al registrar:", err.message);
      if (err.message.includes("User already registered"))
        setError("Ya existe un usuario con este correo.");
      else if (err.message.includes("Password"))
        setError("La contraseña debe tener al menos 6 caracteres.");
      else setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-300 via-white to-green-400 p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 mx-auto bg-gradient-to-r from-ie-yellow to-ie-green rounded-full flex items-center justify-center mb-3 shadow-lg"
          >
            <UserPlus className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-gray-800">
            Crear Cuenta
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Regístrate para acceder al sistema institucional
          </p>
        </div>

        {/* 🔴 Mensajes de error */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 mb-4 rounded-lg border border-red-300 flex items-start">
            <AlertTriangle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* 🟢 Mensaje de éxito */}
        {success && (
          <div className="bg-green-100 text-green-700 px-4 py-3 mb-4 rounded-lg border border-green-300 flex items-start">
            <CheckCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm font-medium">
              <p className="font-semibold">¡Registro Exitoso!</p>
              <p>{success}</p>
            </div>
          </div>
        )}

        {/* 🧾 Formulario */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre Completo
            </label>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:ring-ie-green focus:border-ie-green transition"
              placeholder="Ej: Ana Torres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:ring-ie-green focus:border-ie-green transition"
              placeholder="ejemplo@escuela.edu.pe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:ring-ie-green focus:border-ie-green transition"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:ring-ie-green focus:border-ie-green transition"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 font-semibold text-white rounded-xl shadow-md transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-ie-yellow to-ie-green hover:opacity-90"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Registrar
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-sm font-medium text-ie-green hover:underline"
            disabled={loading}
          >
            ¿Ya tienes una cuenta? Inicia sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
