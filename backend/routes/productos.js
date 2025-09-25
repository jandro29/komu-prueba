import express from "express";
import { db } from "../db.js";

const router = express.Router();

// Obtener todas las pizarras (sin imágenes para mejor rendimiento)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        nombre,
        descripcion_breve,
        descripcion,
        precio,
        CASE WHEN img IS NOT NULL THEN true ELSE false END as tiene_imagen
      FROM pizarras 
      ORDER BY nombre
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("Error al obtener pizarras:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener imagen específica por nombre
router.get("/imagen/:nombre", async (req, res) => {
  try {
    const { nombre } = req.params;
    const query = "SELECT img FROM pizarras WHERE nombre = $1";
    const result = await db.query(query, [nombre]);
    
    if (result.rows.length === 0 || !result.rows[0].img) {
      return res.status(404).json({
        success: false,
        message: "Imagen no encontrada"
      });
    }
    
    const imagen = result.rows[0].img;
    
    // Detectar el tipo de imagen básico
    let contentType = 'image/jpeg'; // Por defecto
    if (imagen.length >= 2) {
      const firstByte = imagen[0];
      const secondByte = imagen[1];
      
      if (firstByte === 0x89 && secondByte === 0x50) {
        contentType = 'image/png';
      } else if (firstByte === 0xFF && secondByte === 0xD8) {
        contentType = 'image/jpeg';
      } else if (firstByte === 0x47 && secondByte === 0x49) {
        contentType = 'image/gif';
      }
    }
    
    // Configurar headers de caché para optimizar rendimiento
    res.set({
      'Content-Type': contentType,
      'Content-Length': imagen.length,
      'Cache-Control': 'public, max-age=86400', // Cachear por 24 horas
      'ETag': `"${Buffer.from(nombre).toString('base64')}"` // ETag simple
    });
    
    res.send(imagen);
  } catch (error) {
    console.error("Error al obtener imagen:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Obtener pizarra específica con toda la información
router.get("/:nombre", async (req, res) => {
  try {
    const { nombre } = req.params;
    const query = `
      SELECT 
        nombre,
        descripcion_breve,
        descripcion,
        precio,
        CASE WHEN img IS NOT NULL THEN true ELSE false END as tiene_imagen,
        CASE WHEN img IS NOT NULL THEN octet_length(img) ELSE 0 END as tamaño_imagen
      FROM pizarras 
      WHERE nombre = $1
    `;
    
    const result = await db.query(query, [nombre]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pizarra no encontrada"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al obtener pizarra:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Búsqueda de pizarras
router.get("/buscar/:termino", async (req, res) => {
  try {
    const { termino } = req.params;
    const query = `
      SELECT 
        nombre,
        descripcion_breve,
        descripcion,
        precio,
        CASE WHEN img IS NOT NULL THEN true ELSE false END as tiene_imagen
      FROM pizarras 
      WHERE 
        LOWER(nombre) LIKE LOWER($1) OR 
        LOWER(descripcion_breve) LIKE LOWER($1) OR
        LOWER(descripcion) LIKE LOWER($1)
      ORDER BY nombre
    `;
    
    const result = await db.query(query, [`%${termino}%`]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      termino_busqueda: termino
    });
  } catch (error) {
    console.error("Error en búsqueda:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Obtener estadísticas de la base de datos
router.get("/stats/resumen", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_pizarras,
        COUNT(img) as con_imagen,
        COUNT(*) - COUNT(img) as sin_imagen,
        COALESCE(SUM(octet_length(img)), 0) as tamaño_total_imagenes,
        COALESCE(AVG(octet_length(img)), 0) as tamaño_promedio_imagen,
        COALESCE(AVG(precio), 0) as precio_promedio,
        MIN(precio) as precio_minimo,
        MAX(precio) as precio_maximo
      FROM pizarras
    `;
    
    const result = await db.query(query);
    const stats = result.rows[0];
    
    // Convertir números a enteros para mejor presentación
    const estadisticas = {
      total_pizarras: parseInt(stats.total_pizarras),
      con_imagen: parseInt(stats.con_imagen),
      sin_imagen: parseInt(stats.sin_imagen),
      tamaño_total_imagenes: parseInt(stats.tamaño_total_imagenes),
      tamaño_promedio_imagen: Math.round(parseFloat(stats.tamaño_promedio_imagen)),
      precio_promedio: parseFloat(stats.precio_promedio),
      precio_minimo: parseFloat(stats.precio_minimo),
      precio_maximo: parseFloat(stats.precio_maximo)
    };
    
    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Crear nueva pizarra (si necesitas esta funcionalidad desde el frontend)
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion_breve, descripcion, precio } = req.body;
    
    if (!nombre || !descripcion_breve || precio === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nombre, descripción breve y precio son obligatorios"
      });
    }
    
    const query = `
      INSERT INTO pizarras (nombre, descripcion_breve, descripcion, precio)
      VALUES ($1, $2, $3, $4)
      RETURNING nombre, descripcion_breve, descripcion, precio
    `;
    
    const result = await db.query(query, [nombre, descripcion_breve, descripcion, precio]);
    
    res.status(201).json({
      success: true,
      message: "Pizarra creada exitosamente",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al crear pizarra:", error);
    
    // Manejar error de duplicado (si nombre es único)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "Ya existe una pizarra con ese nombre"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Middleware para manejar rutas no encontradas
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

// IMPORTANTE: Esta línea debe estar al final
export default router;