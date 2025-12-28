import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();


// Adds logging — example log: GET /api/v1/user 200 12ms
app.use(morgan('dev'));

// Allows Express to accept JSON body (e.g., from frontend POST request).
app.use(express.json());

// Parses form-data / URL-encoded request payloads.
app.use(express.urlencoded({ extended: true }));

// Makes req.cookies available → required for authentication tokens.
app.use(cookieParser());

// Allows frontend (like React at http://localhost:3000) to access backend (like http://localhost:5000)
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);



import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import aiRoutes from './routes/gemini.routes.js'

// Routes
app.use('/api/v1', userRoutes);
app.use('/api/v1/projects', projectRoutes);

//app.use('/api/v1/ai', aiRoutes)


export { app };