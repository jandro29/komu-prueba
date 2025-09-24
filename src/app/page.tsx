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

// Interfaz para items del carrito
interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  descripcion_breve?: string;
}

export default function Home() {
  // Estados con tipos específicos - manteniendo tu lógica original
  const [pizarras, setPizarras] = useState<PizarraFrontend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Estados para el carrito de compras
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Estados para paginación
  const itemsPorPagina: number = 4;
  const [pagina, setPagina] = useState<number>(1);

  // URL base de tu API - manteniendo tu configuración original
  const API_BASE_URL: string = "http://localhost:4000/api/productos";

  // Función para cargar pizarras con tipos - TU CÓDIGO ORIGINAL
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

  // Función para cargar estadísticas con tipos - TU CÓDIGO ORIGINAL
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

  // Cargar datos al montar el componente - TU LÓGICA ORIGINAL
  useEffect(() => {
    cargarPizarras();
    cargarEstadisticas();
  }, [cargarPizarras, cargarEstadisticas]);

  // Auto-actualización cada 30 segundos - TU LÓGICA ORIGINAL
  useEffect(() => {
    const interval = setInterval(() => {
      cargarPizarras();
      cargarEstadisticas();
    }, 30000);

    return () => clearInterval(interval);
  }, [cargarPizarras, cargarEstadisticas]);

  // Funciones del carrito - NUEVAS
  const agregarAlCarrito = (pizarra: PizarraFrontend) => {
    const existingItem = cartItems.find(item => item.id === pizarra.id);
    
    // Precio estimado basado en el tipo de pizarra (puedes ajustar esta lógica)
    const precioEstimado = 15; // Precio base para pizarras
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === pizarra.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: pizarra.id,
        nombre: pizarra.nombre,
        precio: precioEstimado,
        cantidad: 1,
        imagen: pizarra.img_url || undefined,
        descripcion_breve: pizarra.descripcion_breve
      };
      setCartItems([...cartItems, newItem]);
    }
    
    // Mostrar el carrito brevemente al agregar
    setIsCartOpen(true);
    setTimeout(() => setIsCartOpen(false), 2000);
  };

  const eliminarDelCarrito = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(id);
      return;
    }
    
    setCartItems(cartItems.map(item =>
      item.id === id ? { ...item, cantidad } : item
    ));
  };

  // Calcular total del carrito
  const totalCarrito = cartItems.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  const cantidadItems = cartItems.reduce((total, item) => total + item.cantidad, 0);

  // Función para refrescar manualmente - TU CÓDIGO ORIGINAL
  const refrescarDatos = async (): Promise<void> => {
    await cargarPizarras();
    await cargarEstadisticas();
  };

  // Cálculos de paginación - TU CÓDIGO ORIGINAL
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

  // Componente de loading - TU CÓDIGO ORIGINAL
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

  // Componente de error - TU CÓDIGO ORIGINAL
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* Theme Toggle */}
        <div className="absolute right-2 top-2 z-10">
          <ThemeToggle />
        </div>

        {/* Header principal con banner promocional - ACTUALIZADO PARA TEMA */}
        <div className="bg-gradient-to-r from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-white p-8 relative overflow-hidden border-b border-gray-200 dark:border-gray-700">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">
              🏪 Catálogo KOMU - <span className="text-gray-500 dark:text-gray-400">Pizarras Especiales</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
              Datos en tiempo real desde PostgreSQL. Descubre nuestra colección exclusiva de pizarras para todos tus proyectos.
            </p>
            
            {/* Estadísticas dinámicas en el banner */}
            {stats && (
              <div className="flex gap-4 text-sm mb-4">
                <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                  📊 <strong>{stats.total_pizarras}</strong> pizarras
                </div>
                <div className="bg-green-500/20 px-3 py-1 rounded-full">
                  🖼️ <strong>{stats.con_imagen}</strong> con imagen
                </div>
                <div className="bg-yellow-500/20 px-3 py-1 rounded-full">
                  📄 <strong>{stats.sin_imagen}</strong> sin imagen
                </div>
              </div>
            )}

          </div>
          
          {/* Info de actualización */}
          <div className="absolute bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400">
            {lastUpdate && (
              <span title="Última actualización">
                🕐 Actualizado: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Indicador de carga en vivo */}
        {loading && pizarras.length > 0 && (
          <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm animate-pulse">
            🔄 Actualizando catálogo de pizarras...
          </div>
        )}

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

          {/* Grid de pizarras - DISEÑO HORIZONTAL COMO LA IMAGEN */}
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
                        <Image
                          src={pizarra.img_url}
                          alt={pizarra.nombre}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-2xl mb-1">📝</div>
                            <p className="text-xs">Sin imagen</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lado derecho - Información */}
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

                      {/* Parte inferior - Precio y botón */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          $17
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Mensaje dinámico si no hay pizarras - TU CÓDIGO ORIGINAL */}
          {pizarras.length === 0 && !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">Catálogo vacío</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No hay pizarras en la base de datos.
              </p>
            </motion.div>
          )}

          {/* Paginación mejorada - TU CÓDIGO ORIGINAL */}
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

              {/* Controles de navegación - TU CÓDIGO ORIGINAL */}
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
            </>
          )}
        </div>
      </div>
      {/* Panel de control flotante - TU CÓDIGO ORIGINAL */}
      <div className="fixed bottom-4 left-4 flex flex-col gap-2">
        <div className="bg-green-500 text-white p-2 rounded-full shadow-lg text-xs text-center">
          <div title={`Conectado a PostgreSQL - ${stats?.total_pizarras || 0} pizarras`}>
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