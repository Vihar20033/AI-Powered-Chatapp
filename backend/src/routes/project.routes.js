import Router from 'express';
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import { authUser } from '../middlewares/auth.middleware.js';

const router = Router();

// Create Project
router.post(
    "/create",
    authUser,
    body("name").isString().notEmpty().withMessage("Project name is required"),
    projectController.createProjectController
);

// Get All Projects for Logged-in User
router.get(
    "/all",
    authUser,
    projectController.getAllProjectsController
);

// Add Users to Project
router.put(
    "/add-user",
    authUser,
    body("projectId").isString().withMessage("Project ID is required"),
    body("users")
        .isArray({ min: 1 })
        .withMessage("Users must be an array with at least one user")
        .bail()
        .custom((users) => users.every((user) => typeof user === "string"))
        .withMessage("Each user ID must be a string"),
    projectController.addUserProjectController
);

// Get Project by ID with Users
router.get(
    "/get-project/:projectId",
    authUser,
    projectController.getProjectByIdController
);

export default router;
