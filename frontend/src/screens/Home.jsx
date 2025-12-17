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
  const navigate = useNavigate();

  const createProject = async (name) => {
    try {
      const response = await axios.post("/projects/create", { name });
      setProjects((prev) => [...prev, response.data.project]);
      setIsModalOpen(false);
      setProjectName("");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/projects/all");
        setProjects(response.data.projects || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Get unique collaborators count (excluding duplicates)
  const getCollaboratorsCount = (project) => {
    if (!project.users || !Array.isArray(project.users)) return 0;
    
    // Create a Set of unique user IDs to remove duplicates
    const uniqueUsers = new Set(
      project.users.map(u => u._id || u.id || u).filter(Boolean)
    );
    
    return uniqueUsers.size;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                <i className="ri-folder-line text-blue-500"></i>
                My Projects
              </h1>
              <p className="text-gray-400 text-sm">
                {loading ? "Loading..." : `${projects.length} project${projects.length !== 1 ? 's' : ''} total`}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <i className="ri-add-line text-xl group-hover:rotate-90 transition-transform duration-200"></i>
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <i className="ri-folder-open-line text-5xl text-gray-600"></i>
            </div>
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Create your first project to start collaborating with your team and generating code with AI
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold transition-all duration-200 flex items-center gap-2"
            >
              <i className="ri-add-line text-xl"></i>
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => {
              const collaboratorsCount = getCollaboratorsCount(project);
              
              return (
                <div
                  onClick={() =>
                    navigate("/project", { state: { projectId: project._id } })
                  }
                  key={project._id}
                  className="group bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer border border-gray-700 hover:border-blue-500/50 transform hover:-translate-y-1"
                >
                  {/* Project Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <i className="ri-code-box-line text-2xl text-white"></i>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <i className="ri-arrow-right-up-line text-gray-400 text-xl"></i>
                    </div>
                  </div>

                  {/* Project Name */}
                  <h2 className="text-xl font-bold text-white mb-2 capitalize truncate group-hover:text-blue-400 transition-colors duration-200">
                    {project.name}
                  </h2>

                  {/* Project Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1 text-gray-400">
                        <i className="ri-user-line text-base"></i>
                        <span>{collaboratorsCount}</span>
                      </div>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">
                        {collaboratorsCount === 0 ? "No" : collaboratorsCount} 
                        {" "}collaborator{collaboratorsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <i className="ri-time-line text-base"></i>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  {/* Collaborators Avatars */}
                  {collaboratorsCount > 0 && (
                    <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-700">
                      <div className="flex -space-x-2">
                        {project.users?.slice(0, 3).map((u, idx) => {
                          const userName = u?.name || u?.email || "?";
                          return (
                            <div
                              key={u?._id || u?.id || idx}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-gray-800"
                              title={userName}
                            >
                              {userName.charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                      {collaboratorsCount > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-semibold border-2 border-gray-800">
                          +{collaboratorsCount - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all animate-scaleIn border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <i className="ri-folder-add-line text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                <p className="text-sm text-gray-400">Start collaborating with AI</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.elements.projectName.value.trim();
                if (!name) return;
                createProject(name);
              }}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-semibold text-gray-200 mb-2"
                >
                  Project Name
                </label>
                <input
                  id="projectName"
                  name="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g., My Awesome App"
                  className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setProjectName("");
                  }}
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-200 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30"
                >
                  Create Project
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