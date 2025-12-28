import { Project } from "../models/project.models.js";
import mongoose from "mongoose";


/**
 * Create a new project with a single user
 */
export const createProject = async ({ name, userId }) => {
    try {
        
        console.log("createProject called with:", { name, userId });

        if (!userId) throw new Error("User ID is required");
        if (!name) throw new Error("Project name is required");

        const projectName = name.trim().toLowerCase();
        console.log("Normalized project name:", projectName);

        // Check if a project with this name already exists
        const existingProject = await Project.findOne({ name: projectName });
        console.log("Existing project found:", existingProject);

        if (existingProject) {
            throw new Error("Project with this name already exists");
        }

        // Create project
        const project = await Project.create({
            name: projectName,
            users: [userId]
        });

        console.log("Project created successfully:", project);
        return project;
    } catch (error) {
        console.error("Error in createProject:", error.message);
        throw error;
    }
};

/**
 * Get all projects of a user
 */
export const getAllProjects = async (userId) => {
    try {
        console.log("getAllProjects called with userId:", userId);
        if (!userId) throw new Error("User ID is required");

        const projects = await Project.find({ users: userId });
        console.log(`Found ${projects.length} projects for user ${userId}`);
        return projects;
    } catch (error) {
        console.error("Error in getAllProjects:", error.message);
        throw error;
    }
};

/**
 * Add users to a project
 */
export const addUsersToProject = async (projectId, users) => {
    try {
        console.log("addUsersToProject called with:", { projectId, users });

        if (!projectId) throw new Error("Project ID is required");
        if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Invalid Project ID");

        if (!users || !Array.isArray(users) || users.length === 0) {
            throw new Error("Users array is required and cannot be empty");
        }

        if (users.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            throw new Error("All user IDs must be valid");
        }

        // Add users to project without duplicates
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { users: { $each: users } } },
            { new: true }
        ).populate("users", "name email");

        if (!updatedProject) throw new Error("Project does not exist");

        console.log("Users added successfully:", updatedProject.users);
        return updatedProject;

    } catch (error) {
        console.error("Error in addUsersToProject:", error.message);
        throw error;
    }
};

/**
 * Get project by ID with populated users
 */
export const getProjectById = async (projectId) => {
    try {
        console.log("getProjectById called with projectId:", projectId);

        if (!projectId) throw new Error("Project ID is required");

        const project = await Project.findById(projectId).populate("users", "name email");

        if (!project) throw new Error("Project does not exist");

        console.log("Project found:", project);
        return project;
    } catch (error) {
        console.error("Error in getProjectById:", error.message);
        throw error;
    }
};

