import { Router } from "express";
import { body, param } from "express-validator";
import * as projectController from "../controllers/project.controller.js";
import { authUser } from "../middlewares/auth.middleware.js";



const router = Router();

/* ============================
   CREATE PROJECT
   POST /api/v1/projects/create
============================ */
router.post(
  "/create",
  authUser,
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required"),
  projectController.createProjectController
);

/* ============================
   GET ALL PROJECTS (User)
   GET /api/v1/projects/all
============================ */
router.get(
  "/all",
  authUser,
  projectController.getAllProjectsController
);

/* ============================
   ADD USERS TO PROJECT
   PUT /api/v1/projects/add-user
============================ */
router.put(
  "/add-user",
  authUser,
  body("projectId")
    .notEmpty()
    .withMessage("Project ID is required"),

  body("users")
    .isArray({ min: 1 })
    .withMessage("Users must be a non-empty array")
    .custom((users) => users.every((id) => typeof id === "string"))
    .withMessage("Each user ID must be a string"),

  projectController.addUserProjectController
);

/* ============================
   GET PROJECT BY ID
   GET /api/v1/projects/get-project/:projectId
============================ */
router.get(
  "/get-project/:projectId",
  authUser,
  param("projectId")
    .notEmpty()
    .withMessage("Project ID is required"),
  projectController.getProjectByIdController
);




export default router;
