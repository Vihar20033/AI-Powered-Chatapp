import { createProject, getAllProjects, addUsersToProject, getProjectById } from "../services/project.services.js";
import { validationResult } from "express-validator";
import { User } from "../models/user.models.js";


export const createProjectController = async (req, res) => {

    console.log("createProjectController called with body:", req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { name } = req.body;
        const loggedInUser = await User.findOne({ email: req.user.email });
        if (!loggedInUser) {
            console.log("Logged-in user not found:", req.user.email);
            return res.status(404).json({ message: "User not found" });
        }

        const newProject = await createProject({ name, userId: loggedInUser._id });
        console.log("Project created:", newProject);

        return res.status(201).json({
            message: "Project created successfully",
            project: newProject
        });

    } catch (error) {
        console.error("Error in createProjectController:", error.message);
        return res.status(400).json({ message: error.message });
    }
};

/**
 * Get All Projects Controller
 */
export const getAllProjectsController = async (req, res) => {
    console.log("getAllProjectsController called for user:", req.user.email);

    try {
        const loggedInUser = await User.findOne({ email: req.user.email });
        if (!loggedInUser) {
            console.log("Logged-in user not found:", req.user.email);
            return res.status(404).json({ message: "User not found" });
        }

        const allUserProjects = await getAllProjects(loggedInUser._id);
        console.log("Found projects:", allUserProjects.length);

        return res.status(200).json({ projects: allUserProjects });

    } catch (error) {
        console.error("Error in getAllProjectsController:", error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Add Users to Project Controller
 */
export const addUserProjectController = async (req, res) => {
    
    console.log("addUserProjectController called with body:", req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { users, projectId } = req.body;

        // Validate logged-in user
        const loggedInUser = await User.findOne({ email: req.user.email });
        if (!loggedInUser) {
            console.log("Logged-in user not found:", req.user.email);
            return res.status(404).json({ message: "User not found" });
        }

        // Call updated addUsersToProject WITHOUT checking if requesting user belongs
        const projectUpdated = await addUsersToProject(projectId, users);
        console.log("Users added to project:", projectUpdated.users);

        return res.status(200).json({
            message: "Users added to project successfully",
            project: projectUpdated
        });

    } catch (error) {
        console.error("Error in addUserProjectController:", error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Get Project By ID Controller
 */
export const getProjectByIdController = async (req, res) => {
    const { projectId } = req.params;
    console.log("getProjectByIdController called with projectId:", projectId);

    try {
        const project = await getProjectById(projectId);
        console.log("Project found:", project);

        return res.status(200).json({ project });

    } catch (error) {
        console.error("Error in getProjectByIdController:", error.message);
        return res.status(400).json({ error: error.message });
    }
};
