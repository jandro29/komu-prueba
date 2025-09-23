import express from "express";
import cors from "cors";
import productosRoutes from "./routes/productos.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/productos", productosRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});