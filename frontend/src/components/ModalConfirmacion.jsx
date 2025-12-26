import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";

export default function ModalConfirmacion({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Confirmar eliminación",
  mensaje = "¿Estás seguro de que deseas eliminar este elemento?",
  requireText = false,
}) {
  const [texto, setTexto] = useState("");

  if (!isOpen) return null;

  const disabled = requireText && texto !== "ELIMINAR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black backdrop-blur-sm"></div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative z-10"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Trash2 className="text-red-600" />
          {titulo}
        </h2>

        <p className="text-gray-700 mt-3">{mensaje}</p>

        {requireText && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">
              Escribe <b>ELIMINAR</b> para confirmar:
            </p>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="ELIMINAR"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-400"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg text-white flex items-center gap-2
              ${disabled ? "bg-red-300" : "bg-red-600 hover:bg-red-400"}
            `}
          >
            <Trash2 size={18} />
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
