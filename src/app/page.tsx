"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Definir tipos directamente en el componente
interface PizarraDB {
  nombre: string;
  descripcion_breve: string;
  descripcion: string;
  tiene_imagen: boolean;
  precio: Float32Array;
}

interface PizarraFrontend {
  id: number;
  nombre: string;
  descripcion_breve: string;
  descripcion: string;
  precio: Float32Array;
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

  // Estados para el popup
  const [selectedPizarra, setSelectedPizarra] = useState<PizarraFrontend | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

  // URL base de API
  const API_BASE_URL: string = "http://localhost:4000/api/productos";

  // Cargar pizarras con tipos
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
          precio: pizarra.precio,
          tiene_imagen: pizarra.tiene_imagen,
          img_url: pizarra.tiene_imagen 
            ? `${API_BASE_URL}/imagen/${encodeURIComponent(pizarra.nombre)}?t=${Date.now()}`
            : null
        }));

        setPizarras(pizarrasFormateadas);
        setLastUpdate(new Date());
        
        // Resetear página
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

  // Función para cargar estadísticas
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

  // Funciones para el popup
  const abrirPopup = (pizarra: PizarraFrontend) => {
    setSelectedPizarra(pizarra);
    setIsPopupOpen(true);
  };

  const cerrarPopup = () => {
    setIsPopupOpen(false);
    setTimeout(() => setSelectedPizarra(null), 300);
  };

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
            Cargando pizarras...
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex ">
      {/* Theme Toggle */}
      <div className="absolute right-4 top-4 z-10 z-40">
        <button
          className="z-40 cursor-pointer p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          onClick={() => {
            if (document.documentElement.classList.contains('dark')) {
              document.documentElement.classList.remove('dark');
            } else {
              document.documentElement.classList.add('dark');
            }
          }}
          title="Alternar tema claro/oscuro"
        >
          <span className="block dark:hidden">🌙</span>
          <span className="hidden dark:block">☀️</span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* Header principal con banner promocional */}
        <div className="bg-gradient-to-r from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8 relative overflow-hidden border-b border-gray-200 dark:border-gray-700">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 flex">
              <img className="w-[40px] mr-4" src="/tienda.png" alt="" /> Catálogo KOMU - <span className="text-gray-500 dark:text-gray-400">Pizarras Especiales</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
              Datos en tiempo real desde PostgreSQL. Descubre nuestra colección exclusiva de pizarras para todos tus proyectos.
            </p>
            
            {/* Estadísticas dinámicas en el banner */}
            {stats && (
              <div className="flex gap-4 text-sm mb-4">
                <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                  <strong>{stats.total_pizarras}</strong> pizarras
                </div>
                <div className="bg-green-500/20 px-3 py-1 rounded-full">
                  <strong>{stats.con_imagen}</strong> con imagen
                </div>
                <div className="bg-yellow-500/20 px-3 py-1 rounded-full">
                  <strong>{stats.sin_imagen}</strong> sin imagen
                </div>
              </div>
            )}

          </div>
        
        </div>
        
        {/* Contenido de las pizarras */}
        <div className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Nuestras Pizarras
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Página {pagina} de {totalPaginas} • {pizarras.length} productos disponibles
              </p>
            </div>
          </div>

          {/* Grid de pizarras */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${pagina}-${pizarras.length}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto"
            >
              {pizarrasPagina.map((pizarra: PizarraFrontend, index: number) => (
                <motion.div
                  key={`${pizarra.nombre}-${pizarra.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="flex h-48">
                    {/* Lado izquierdo - Imagen pequeña */}
                    <div className="w-50 h-full relative overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      {pizarra.tiene_imagen && pizarra.img_url ? (
                        <img
                          src={pizarra.img_url}
                          alt={pizarra.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <p className="text-xs">Sin imagen</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lado derecho */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 line-clamp-2">
                          {pizarra.nombre}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                          {pizarra.descripcion_breve}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                          Disponible • ID #{pizarra.id}
                        </p>
                      </div>

                      {/* Parte inferior */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          S/{pizarra.precio}
                        </span>
                        <button
                          onClick={() => abrirPopup(pizarra)}
                          className=" text-white text-sm rounded-lg transition-colors duration-200 flex items-center gap-2"
                        >
                          <img className="w-[25px] cursor-pointer" src="/ojo.svg" alt="" />
                        </button>
                      </div>
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
              <h3 className="text-xl font-semibold mb-2">Catálogo vacío</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No hay pizarras en la base de datos.
              </p>
            </motion.div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <>
              <div className="flex justify-center items-center gap-2 mt-8">
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPagina(i + 1)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      pagina === i + 1
                        ? 'bg-gray-500 scale-125 shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                    title={`Página ${i + 1}`}
                  />
                ))}
              </div>

              {/* Controles de navegación */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={anterior}
                  disabled={pagina === 1}
                  className="cursor-pointer px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200"
                >
                  <img className="w-[25px]" src="/flecha-circulo-izquierda.svg" alt="" />
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
                  className="cursor-pointer px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200"
                >
                  <img className="w-[25px]" src="/flecha-circulo-derecha.svg" alt="" />
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* POPUP DE INFORMACIÓN*/}
      <AnimatePresence>
        {isPopupOpen && selectedPizarra && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={cerrarPopup}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del popup */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Información Detallada
                </h2>
                <button
                  onClick={cerrarPopup}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Contenido del popup */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Imagen */}
                  <div className="md:w-1/3 flex-shrink-0">
                    <div className="w-full h-48 md:h-64 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      {selectedPizarra.tiene_imagen && selectedPizarra.img_url ? (
                        <img
                          src={selectedPizarra.img_url}
                          alt={selectedPizarra.nombre}
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📝</div>
                            <p className="text-sm">Sin imagen disponible</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información completa del producto */}
                  <div className="md:w-2/3">
                    {/* Título */}
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                      {selectedPizarra.nombre}
                    </h3>

                    {/* Descripción breve */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Descripción Breve
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                        {selectedPizarra.descripcion_breve}
                      </p>
                    </div>

                    {/* Descripción*/}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Descripción Completa
                      </h4>
                      <div className="text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                        {selectedPizarra.descripcion}
                      </div>
                    </div>

                    {/* Información extra */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        ID: #{selectedPizarra.id}
                      </span>
                      {selectedPizarra.tiene_imagen ? (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                          Con imagen
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
                          Sin imagen
                        </span>
                      )}
                    </div>

                    {/* Precio y cerrar popup */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                        S/{selectedPizarra.precio}
                      </span>
                      <div className="flex gap-3">
                        <button
                          onClick={cerrarPopup}
                          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}