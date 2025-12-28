// src/pages/Home.jsx
import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { user } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  /* ================= CREATE PROJECT ================= */

  const createProject = async (name) => {

    if (creating) return;

    try {
      setCreating(true);
      const response = await axios.post("/api/v1/projects/create", { name });

      setProjects((prev) => [
        response.data.project,
        ...prev,
      ]);

      setIsModalOpen(false);
      setProjectName("");

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  /* ================= FETCH PROJECTS ================= */

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/v1/projects/all");

        const sortedProjects = (response.data.projects || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setProjects(sortedProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  /* ================= ESC TO CLOSE MODAL ================= */

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };

    if (isModalOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isModalOpen]);

  /* ================= HELPERS ================= */

  const getCollaboratorsCount = (project) => {
  const ids = [];

  if (project.owner?._id || project.owner?.id)
    ids.push(project.owner?._id ?? project.owner?.id);

  (project.users || []).forEach((u) =>
    ids.push(u?._id ?? u?.id)
  );

  return new Set(ids).size;
};
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const diffDays = Math.floor(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <i className="ri-folder-line text-blue-500" />
              My Projects
            </h1>
            <p className="text-gray-400 text-sm">
              {loading
                ? "Loading..."
                : `${projects.length} project${
                    projects.length !== 1 ? "s" : ""
                  }`}
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-semibold shadow-lg transition flex items-center gap-2"
          >
            <i className="ri-add-line text-xl" />
            New Project
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-2xl p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <i className="ri-folder-open-line text-6xl mb-4" />
            <p className="text-lg mb-4">No projects yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => {
              const collaboratorsCount = getCollaboratorsCount(project);

              return (
                <div
                  key={project._id}
                  role="button"
                  tabIndex={0}
                  title="Open project"
                  onClick={() =>
                    navigate("/project", {
                      state: { projectId: project._id },
                    })
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    navigate("/project", {
                      state: { projectId: project._id },
                    })
                  }
                  className="group bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-6 shadow-lg hover:shadow-blue-500/10 transition cursor-pointer border border-gray-700 hover:border-blue-500/50 transform hover:-translate-y-1 hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <i className="ri-code-box-line text-white text-2xl" />
                    </div>
                    <i className="ri-arrow-right-up-line text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2 capitalize truncate group-hover:text-blue-400 transition">
                    {project.name}
                  </h2>

                  <div className="text-sm text-gray-400 mb-3">
                    {collaboratorsCount} collaborator
                    {collaboratorsCount !== 1 ? "s" : ""}
                  </div>

                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <i className="ri-time-line" />
                    {formatDate(project.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              Create New Project
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!projectName.trim()) return;
                createProject(projectName.trim());
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                autoFocus
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setProjectName("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectName.trim() || creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
