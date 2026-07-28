import cors from "cors";
import express from "express";

import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";

import errorHandler from "./middlewares/error.middleware";
import notFoundHandler from "./middlewares/notFound.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
