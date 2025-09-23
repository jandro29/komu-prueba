"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import ThemeToggle from "@/app/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";

// Definir tipos directamente en el componente
interface PizarraDB {
  nombre: string;
  descripcion_breve: string;
  descripcion: string;
  tiene_imagen: boolean;
}

interface PizarraFrontend {
  id: number;
  nombre: string;
  descripcion_breve: string;
  descripcion: string;
  tiene_imagen: boolean;
  img_url: string | null;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
}

interface Stats {
  total_pizarras: number;
  con_imagen: number;
  sin_imagen: number;
  tamaño_total_imagenes: number;
  tamaño_promedio_imagen: number;
}

export default function Home() {
  // Estados con tipos específicos
  const [pizarras, setPizarras] = useState<PizarraFrontend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Estados para paginación
  const itemsPorPagina: number = 4;
  const [pagina, setPagina] = useState<number>(1);

  // URL base de tu API
  const API_BASE_URL: string = "http://localhost:4000/api/productos";

  // Función para cargar pizarras con tipos
  const cargarPizarras = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(API_BASE_URL, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: APIResponse<PizarraDB[]> = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Mapear los datos con tipos explícitos
        const pizarrasFormateadas: PizarraFrontend[] = data.data.map((pizarra: PizarraDB, index: number) => ({
          id: index + 1,
          nombre: pizarra.nombre,
          descripcion_breve: pizarra.descripcion_breve,
          descripcion: pizarra.descripcion,
          tiene_imagen: pizarra.tiene_imagen,
          img_url: pizarra.tiene_imagen 
            ? `${API_BASE_URL}/imagen/${encodeURIComponent(pizarra.nombre)}?t=${Date.now()}`
            : null
        }));

        setPizarras(pizarrasFormateadas);
        setLastUpdate(new Date());
        
        // Resetear página si es necesario
        const totalPaginas = Math.ceil(pizarrasFormateadas.length / itemsPorPagina);
        if (pagina > totalPaginas && totalPaginas > 0) {
          setPagina(1);
        }
        
      } else {
        setError(data.message || "No se encontraron datos");
        setPizarras([]);
      }
    } catch (err) {
      console.error("Error al cargar pizarras:", err);
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error de conexión: ${errorMessage}`);
      setPizarras([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, pagina, itemsPorPagina]);

  // Función para cargar estadísticas con tipos
  const cargarEstadisticas = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/resumen`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (response.ok) {
        const data: APIResponse<Stats> = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    }
  }, [API_BASE_URL]);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarPizarras();
    cargarEstadisticas();
  }, [cargarPizarras, cargarEstadisticas]);

  // Auto-actualización cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      cargarPizarras();
      cargarEstadisticas();
    }, 30000);

    return () => clearInterval(interval);
  }, [cargarPizarras, cargarEstadisticas]);

  // Función para refrescar manualmente
  const refrescarDatos = async (): Promise<void> => {
    await cargarPizarras();
    await cargarEstadisticas();
  };

  // Cálculos de paginación
  const inicio: number = (pagina - 1) * itemsPorPagina;
  const fin: number = inicio + itemsPorPagina;
  const pizarrasPagina: PizarraFrontend[] = pizarras.slice(inicio, fin);
  const totalPaginas: number = Math.ceil(pizarras.length / itemsPorPagina);

  const siguiente = (): void => {
    if (fin < pizarras.length) setPagina(pagina + 1);
  };

  const anterior = (): void => {
    if (pagina > 1) setPagina(pagina - 1);
  };

  // Componente de loading
  if (loading && pizarras.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">
            Cargando pizarras desde PostgreSQL...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Base de datos: catalogo_komu
          </p>
        </div>
      </div>
    );
  }

  // Componente de error
  if (error && pizarras.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Error de Conexión
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            {error}
          </p>
          <div className="space-y-2 mb-4 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <p className="font-semibold">Verificar:</p>
            <p>• Backend: http://localhost:4000</p>
            <p>• PostgreSQL: catalogo_komu</p>
            <p>• Tabla: pizarras</p>
          </div>
          <button
            onClick={refrescarDatos}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-900 dark:text-white p-4 overflow-x-hidden">
      {/* Theme Toggle */}
      <div className="absolute right-2 top-2">
        <ThemeToggle />
      </div>

      {/* Header dinámico */}
      <div className="text-center mb-8 pt-16">
        <h1 className="text-4xl font-bold mb-2">🏪 Catálogo KOMU</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Datos en tiempo real desde PostgreSQL
        </p>
        
        {/* Estadísticas dinámicas */}
        {stats && (
          <div className="flex justify-center gap-4 text-sm mb-3">
            <div className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
              📊 <strong>{stats.total_pizarras}</strong> total
            </div>
            <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
              🖼️ <strong>{stats.con_imagen}</strong> con imagen
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded-full">
              📄 <strong>{stats.sin_imagen}</strong> sin imagen
            </div>
          </div>
        )}
        
        {/* Info de actualización */}
        <div className="flex justify-center items-center gap-4 text-xs text-gray-500">
          <span>Página {pagina} de {totalPaginas}</span>
          <span>•</span>
          <span>{pizarras.length} productos</span>
          {lastUpdate && (
            <>
              <span>•</span>
              <span title="Última actualización">
                🕐 {lastUpdate.toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Indicador de carga en vivo */}
      {loading && pizarras.length > 0 && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs animate-pulse">
          🔄 Actualizando...
        </div>
      )}

      {/* Grid dinámico de pizarras */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${pagina}-${pizarras.length}`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
        >
          {pizarrasPagina.map((pizarra: PizarraFrontend, index: number) => (
            <motion.div
              key={`${pizarra.nombre}-${pizarra.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="relative group overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              {/* Contenedor de imagen dinámico */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
                {pizarra.tiene_imagen && pizarra.img_url ? (
                  <Image
                    src={pizarra.img_url}
                    alt={pizarra.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      console.error(`Error cargando imagen: ${pizarra.nombre}`);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-xs font-medium">Sin imagen</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay informativo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                  <div className="transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white text-lg font-bold mb-2 line-clamp-2">
                      {pizarra.nombre}
                    </h3>
                    
                    <p className="text-white text-sm mb-2 line-clamp-3">
                      {pizarra.descripcion_breve}
                    </p>
                    
                    {pizarra.descripcion && pizarra.descripcion.trim() && (
                      <p className="text-white/80 text-xs line-clamp-3 border-t border-white/20 pt-2">
                        {pizarra.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                {/* Efecto brillante */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </div>

              {/* Info siempre visible */}
              <div className="p-4 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm line-clamp-1 flex-1">
                    {pizarra.nombre}
                  </h4>
                  <span className="text-gray-400 text-xs ml-2 shrink-0">
                    #{pizarra.id}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 mb-3">
                  {pizarra.descripcion_breve}
                </p>
                
                {/* Estado visual */}
                <div className="flex justify-between items-center">
                  {pizarra.tiene_imagen ? (
                    <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                      ✅ Con imagen
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 text-xs flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded-full">
                      📄 Solo texto
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Mensaje dinámico si no hay pizarras */}
      {pizarras.length === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-gray-400 text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-semibold mb-2">Catálogo vacío</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No hay pizarras en la base de datos.
          </p>
        </motion.div>
      )}

      {/* Paginación mejorada */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setPagina(i + 1)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                pagina === i + 1
                  ? 'bg-blue-500 scale-125 shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              title={`Página ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Controles de navegación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={anterior}
            disabled={pagina === 1}
            className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200"
          >
            ⬅️ Anterior
          </motion.button>
          
          <div className="flex items-center px-4 py-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="font-bold">{pagina}</span>
            <span className="mx-2 text-gray-400">/</span>
            <span>{totalPaginas}</span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={siguiente}
            disabled={fin >= pizarras.length}
            className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200"
          >
            Siguiente ➡️
          </motion.button>
        </div>
      )}

      {/* Panel de control flotante */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={refrescarDatos}
          className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="Actualizar catálogo"
          disabled={loading}
        >
          {loading ? "⏳" : "🔄"}
        </motion.button>
        
        <div className="bg-green-500 text-white p-2 rounded-full shadow-lg text-xs text-center">
          <div title={`Conectado a PostgreSQL - ${stats?.total_pizarras || 0} productos`}>
            🟢
          </div>
        </div>
        
        <div className="bg-gray-500 text-white p-2 rounded-full shadow-lg text-xs text-center">
          <div title="Actualización automática cada 30 segundos">
            ⚡
          </div>
        </div>
      </div>
    </div>
  );
}