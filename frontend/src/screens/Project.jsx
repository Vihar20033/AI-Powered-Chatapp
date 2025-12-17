import { useState, useEffect, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios";
import { io } from "socket.io-client";
import { UserContext } from "../context/UserContext";
import Markdown from "markdown-to-jsx";

const SOCKET_URL = import.meta.env.REACT_APP_SOCKET_URL || "http://localhost:8000";

const Project = () => {
  const location = useLocation();
  const projectId = location?.state?.projectId;
  const { user } = useContext(UserContext);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [project, setProject] = useState(location.state?.project ?? null);
  const [isAITyping, setIsAITyping] = useState(false);

  // File tree and code editor states
  const [fileTree, setFileTree] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentCode, setCurrentCode] = useState("");
  const [isParsingCode, setIsParsingCode] = useState(false);

  const socketRef = useRef(null);
  const messageBoxRef = useRef(null);

  // Enhanced AI response parser - extracts code blocks automatically
  const parseAIResponse = (aiMessage) => {
    console.log("🔍 PARSING AI RESPONSE");
    console.log("📄 Message length:", aiMessage.length);
    setIsParsingCode(true);

    try {
      const patterns = [
        /```([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)\n([\s\S]*?)```/g,
        /```(\w+)\s+([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)\n([\s\S]*?)```/g,
        /```(\w+)\n([\s\S]*?)```/g,
      ];

      const newFileTree = { ...fileTree };
      let filesFound = 0;
      let autoFileCounter = Object.keys(fileTree).length + 1;

      for (const pattern of patterns) {
        const matches = [...aiMessage.matchAll(pattern)];
        
        matches.forEach((match) => {
          let filename, code, language;

          if (match.length === 3) {
            if (match[1].includes('.')) {
              filename = match[1];
              code = match[2];
              language = filename.split('.').pop();
            } else {
              language = match[1];
              code = match[2];
              filename = `file${autoFileCounter}.${getExtensionFromLanguage(language)}`;
              autoFileCounter++;
            }
          } else if (match.length === 4) {
            language = match[1];
            filename = match[2];
            code = match[3];
          }

          if (filename && code) {
            console.log(`✅ EXTRACTED FILE: ${filename} (${language})`);
            
            newFileTree[filename] = {
              content: code.trim(),
              language: language || filename.split('.').pop(),
              createdAt: new Date().toISOString(),
            };
            
            filesFound++;
          }
        });
      }

      if (filesFound === 0) {
        console.log("⚠️ NO CODE BLOCKS FOUND");
        setIsParsingCode(false);
        return;
      }

      console.log(`🎉 SUCCESSFULLY PARSED ${filesFound} FILES`);
      setFileTree(newFileTree);
      
      const newFiles = Object.keys(newFileTree).filter(f => !fileTree[f]);
      if (newFiles.length > 0 && !selectedFile) {
        const firstNewFile = newFiles[0];
        setSelectedFile(firstNewFile);
        setCurrentCode(newFileTree[firstNewFile].content);
        console.log(`📂 AUTO-SELECTED: ${firstNewFile}`);
      }

    } catch (error) {
      console.error("❌ PARSING ERROR:", error);
    } finally {
      setIsParsingCode(false);
    }
  };

  const getExtensionFromLanguage = (lang) => {
    const extensionMap = {
      javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts',
      python: 'py', py: 'py', java: 'java', c: 'c', cpp: 'cpp',
      'c++': 'cpp', csharp: 'cs', 'c#': 'cs', go: 'go', rust: 'rs',
      ruby: 'rb', php: 'php', html: 'html', css: 'css', scss: 'scss',
      sass: 'sass', json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yml',
      markdown: 'md', md: 'md', sql: 'sql', bash: 'sh', sh: 'sh',
      shell: 'sh', dockerfile: 'dockerfile', docker: 'dockerfile',
      jsx: 'jsx', tsx: 'tsx', vue: 'vue', svelte: 'svelte',
    };
    
    return extensionMap[lang.toLowerCase()] || 'txt';
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && (lastMessage.senderId === 'ai' || lastMessage.senderEmail === 'AI Assistant')) {
      console.log("🤖 NEW AI MESSAGE DETECTED - PARSING...");
      parseAIResponse(lastMessage.message);
    }
  }, [messages]);

  const handleFileSelect = (filename) => {
    setSelectedFile(filename);
    setCurrentCode(fileTree[filename]?.content || "");
    console.log("📂 Selected file:", filename);
  };

  const handleCodeChange = (newCode) => {
    setCurrentCode(newCode);
    if (selectedFile) {
      setFileTree(prev => ({
        ...prev,
        [selectedFile]: {
          ...prev[selectedFile],
          content: newCode,
          updatedAt: new Date().toISOString(),
        }
      }));
    }
  };

  const downloadFile = (filename) => {
    if (!fileTree[filename]) return;
    
    const content = fileTree[filename].content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log("⬇️ Downloaded:", filename);
  };

  const downloadAllFiles = () => {
    Object.keys(fileTree).forEach((filename, index) => {
      setTimeout(() => downloadFile(filename), index * 100);
    });
  };

  const deleteFile = (filename) => {
    const newFileTree = { ...fileTree };
    delete newFileTree[filename];
    setFileTree(newFileTree);
    
    if (selectedFile === filename) {
      const remainingFiles = Object.keys(newFileTree);
      if (remainingFiles.length > 0) {
        handleFileSelect(remainingFiles[0]);
      } else {
        setSelectedFile(null);
        setCurrentCode("");
      }
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      console.log("📋 Copied to clipboard");
    });
  };

  const clearAllFiles = () => {
    if (confirm('Are you sure you want to delete all files?')) {
      setFileTree({});
      setSelectedFile(null);
      setCurrentCode("");
    }
  };

  const addCollaborators = () => {
    if (!projectId || selectedUserIds.length === 0) return;
    axios.put("/projects/add-user", { projectId, users: selectedUserIds })
      .then((res) => {
        setProjectUsers(res.data.project.users || []);
        setSelectedUserIds([]);
        closeUserModal();
      })
      .catch((err) => console.error("❌ ERROR:", err));
  };

  function send() {
    if (!user || (!user._id && !user.id)) {
      alert("Please log in again.");
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) return;

    if (!socketRef.current) {
      alert("Socket not connected. Please refresh.");
      return;
    }

    const senderId = user._id ?? user.id;
    const payload = {
      id: `${Date.now()}-${Math.random()}`,
      projectId,
      message: trimmed,
      senderId,
      senderEmail: user.email,
      senderName: user.name ?? user.email,
      timestamp: new Date().toISOString(),
      isPrivate: !!(activeUserId && activeUserId !== senderId),
      receiverId: activeUserId && activeUserId !== senderId ? String(activeUserId) : null,
    };

    if (payload.isPrivate) {
      socketRef.current.emit("private-message", payload);
    } else {
      socketRef.current.emit("project-message", payload);
      
      if (trimmed.toLowerCase().includes("@ai")) {
        setIsAITyping(true);
      }
    }

    setMessages((prev) => [...prev, { ...payload, outgoing: true }]);
    setMessage("");
  }

  const openUserModal = () => setUserModalOpen(true);
  const closeUserModal = () => setUserModalOpen(false);

  const toggleSelectUser = (userId) => {
    const id = String(userId);
    setSelectedUserIds((prev = []) => {
      const next = prev.map(String);
      const idx = next.indexOf(id);
      if (idx === -1) next.push(id);
      else next.splice(idx, 1);
      return next;
    });
  };

  const handleSelectActiveUser = (userId) => {
    setActiveUserId((prev) => (prev === userId ? null : userId));
  };

  useEffect(() => {
    if (!projectId || !user) return;

    const uid = user._id ?? user.id;
    const token = user.token || localStorage.getItem("token");

    if (!token) {
      alert("Authentication token missing.");
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: token },
      query: { userId: uid, projectId: projectId },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-project", { projectId, userId: uid });
    });

    socket.on("project-message", (data) => {
      if (data.senderId === "ai" || data.senderEmail === "AI Assistant") {
        setIsAITyping(false);
      }

      if (data?.projectId !== projectId) return;

      setMessages((prev) => {
        const isDuplicate = prev.some((m) => m.id === data.id);
        if (isDuplicate) return prev;
        return [...prev, { ...data, outgoing: data.senderId === uid }];
      });
    });

    axios.get("/get-all-users")
      .then((res) => setUsers(res.data.users || []))
      .catch((err) => console.error(err));

    axios.get(`projects/get-project/${projectId}`)
      .then((res) => {
        setProject(res.data.project);
        setProjectUsers(res.data.project?.users ?? []);
      })
      .catch((err) => console.error(err));

    return () => {
      try {
        socket.emit("leave-project", { projectId, userId: uid });
        socket.disconnect();
      } catch (e) {
        console.error(e);
      }
    };
  }, [projectId, user]);

  useEffect(() => {
    const box = messageBoxRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [messages]);

  const renderMessage = (m) => {
    const currentId = String(user?._id ?? user?.id ?? "");
    const isOutgoing = String(m.senderId) === currentId;
    const isAI = String(m.senderId) === "ai" || m.senderEmail === "AI Assistant";

    return (
      <div
        key={m.id ?? `${m.timestamp}-${Math.random()}`}
        className={`message flex flex-col ${
          isAI ? "self-center w-full max-w-[85%]" :
          isOutgoing ? "self-end items-end max-w-[75%]" :
          "self-start items-start max-w-[75%]"
        }`}
      >
        <div className={`flex items-center gap-2 mb-1 ${isOutgoing ? "flex-row-reverse" : "flex-row"}`}>
          {isAI ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <i className="ri-robot-line text-white text-xs" />
              </div>
              <small className="text-xs font-medium text-purple-400">AI Assistant</small>
            </div>
          ) : (
            <>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                isOutgoing ? "bg-blue-600" : "bg-gray-600"
              }`}>
                {(m.senderName?.[0] || m.senderEmail?.[0] || "?").toUpperCase()}
              </div>
              <small className="text-xs text-gray-400">
                {m.senderName ?? m.senderEmail ?? "Unknown"}
              </small>
            </>
          )}
        </div>

        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
          isAI ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-gray-100 overflow-auto" :
          isOutgoing ? "bg-blue-600 text-white rounded-br-sm" :
          "bg-gray-700 text-gray-100 rounded-bl-sm"
        }`}>
          <Markdown className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {m.message}
          </Markdown>
        </div>

        <small className={`text-[10px] text-gray-500 mt-1 ${isOutgoing ? "text-right" : "text-left"}`}>
          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </small>
      </div>
    );
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      js: 'ri-javascript-line text-yellow-400',
      jsx: 'ri-reactjs-line text-blue-400',
      ts: 'ri-file-code-line text-blue-500',
      tsx: 'ri-reactjs-line text-blue-500',
      py: 'ri-file-code-line text-blue-400',
      java: 'ri-file-code-line text-red-400',
      c: 'ri-file-code-line text-blue-600',
      cpp: 'ri-file-code-line text-blue-600',
      cs: 'ri-file-code-line text-purple-500',
      go: 'ri-file-code-line text-cyan-400',
      rs: 'ri-file-code-line text-orange-600',
      html: 'ri-html5-line text-orange-500',
      css: 'ri-css3-line text-blue-400',
      scss: 'ri-css3-line text-pink-400',
      json: 'ri-braces-line text-green-400',
      md: 'ri-markdown-line text-gray-400',
      txt: 'ri-file-text-line text-gray-400',
      sh: 'ri-terminal-line text-green-500',
      sql: 'ri-database-2-line text-blue-500',
      xml: 'ri-file-code-line text-orange-400',
      yaml: 'ri-file-code-line text-purple-400',
      yml: 'ri-file-code-line text-purple-400',
    };
    
    return iconMap[ext] || 'ri-file-code-line text-gray-400';
  };

  return (
    <main className="h-screen w-screen flex bg-gray-900 p-4 gap-4">
      {/* LEFT: CHAT SECTION */}
      <section className="flex flex-col relative w-full md:w-96 bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <header className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
          <button onClick={openUserModal} className="flex items-center gap-3 p-1 rounded-md hover:bg-gray-600 transition">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-700">
              <i className="ri-user-3-fill text-white text-lg" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-white">Chat Room</span>
              <small className="text-xs text-gray-300">{projectUsers.length} members</small>
            </div>
          </button>
          <button className="text-white text-2xl hover:text-gray-300" onClick={() => setIsSidePanelOpen(true)}>
            <i className="ri-group-fill" />
          </button>
        </header>

        <div ref={messageBoxRef} className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <i className="ri-chat-3-line text-5xl opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs opacity-70">Type @ai to generate code</p>
            </div>
          ) : (
            <>
              {messages.filter((m) => {
                if (!m) return false;
                if (!m.isPrivate) return String(m.projectId) === String(projectId);
                const currentId = String(user?._id ?? user?.id ?? "");
                const senderId = String(m.senderId ?? "");
                const receiverId = String(m.receiverId ?? "");
                return senderId === currentId || receiverId === currentId;
              }).map((m) => renderMessage(m))}

              {isAITyping && (
                <div className="flex items-center gap-2 self-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <i className="ri-robot-line text-white text-xs animate-pulse" />
                  </div>
                  <div className="flex gap-1 bg-gray-700 px-4 py-3 rounded-2xl">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center p-3 border-t border-gray-600 bg-gray-900">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            type="text"
            placeholder="Type @ai to generate code..."
            className="flex-1 px-4 py-2 rounded-full bg-gray-800 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={!message.trim()}
            className="ml-2 p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
          >
            <i className="ri-send-plane-fill text-white text-xl" />
          </button>
        </div>

        {/* Collaborators Panel */}
        <div className={`absolute top-0 left-0 h-full w-72 bg-gray-700 shadow-xl transition-transform duration-300 z-10 ${
          isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          <header className="flex justify-between items-center px-4 py-3 bg-gray-600 border-b border-gray-500">
            <h1 className="font-semibold text-lg text-white">Collaborators</h1>
            <button onClick={() => setIsSidePanelOpen(false)} className="p-2 text-gray-200 hover:text-white">
              <i className="ri-close-fill text-xl" />
            </button>
          </header>
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {projectUsers.map((u) => {
              const uid = String(u?._id ?? u?.id ?? "");
              return (
                <div key={uid} className="flex items-center gap-3 p-3 rounded-xl bg-gray-600 hover:bg-gray-500 transition">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600">
                    <i className="ri-user-3-fill text-white text-lg" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-white font-medium text-sm">{u.name}</h1>
                    <p className="text-xs text-gray-300">{u.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RIGHT: CODE EDITOR SECTION */}
      <section className="flex-1 flex flex-col bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <header className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <i className="ri-code-s-slash-line text-purple-400 text-xl" />
            <h2 className="text-white font-semibold">AI Code Generator</h2>
            {Object.keys(fileTree).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                {Object.keys(fileTree).length} files
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {Object.keys(fileTree).length > 0 && (
              <>
                <button
                  onClick={downloadAllFiles}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center gap-1 transition"
                >
                  <i className="ri-download-2-line" />
                  Download All
                </button>
                <button
                  onClick={clearAllFiles}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center gap-1 transition"
                >
                  <i className="ri-delete-bin-line" />
                  Clear All
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* File Tree Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-400 uppercase">Files</h3>
              {Object.keys(fileTree).length > 0 && (
                <span className="text-xs text-purple-400">{Object.keys(fileTree).length}</span>
              )}
            </div>
            {Object.keys(fileTree).length === 0 ? (
              <div className="p-6 text-center">
                <i className="ri-folder-open-line text-5xl text-gray-600 mb-3 block" />
                <p className="text-sm text-gray-500 font-medium mb-1">No files yet</p>
                <p className="text-xs text-gray-600">Ask AI to generate code</p>
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-left">
                  <p className="text-xs text-gray-400 mb-2">Try:</p>
                  <p className="text-xs text-purple-400 font-mono">@ai create hello.js</p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {Object.keys(fileTree).sort().map((filename) => (
                  <div
                    key={filename}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                      selectedFile === filename ? "bg-blue-600" : "hover:bg-gray-800"
                    }`}
                    onClick={() => handleFileSelect(filename)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <i className={`text-sm ${getFileIcon(filename)}`} />
                      <span className="text-sm text-white truncate">{filename}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(filename);
                        }}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Download"
                      >
                        <i className="ri-download-line text-xs text-gray-300" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(filename);
                        }}
                        className="p-1 hover:bg-red-600 rounded"
                        title="Delete"
                      >
                        <i className="ri-delete-bin-line text-xs text-gray-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Editor Area */}
          <div className="flex-1 flex flex-col bg-gray-950">
            {selectedFile ? (
              <>
                <div className="flex justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <i className={`text-sm ${getFileIcon(selectedFile)}`} />
                    <span className="text-sm text-gray-300 font-medium">{selectedFile}</span>
                    <span className="text-xs text-gray-500">
                      {currentCode.split('\n').length} lines
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(currentCode)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs flex items-center gap-1"
                    >
                      <i className="ri-file-copy-line" />
                      Copy
                    </button>
                    <button
                      onClick={() => downloadFile(selectedFile)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                    >
                      <i className="ri-download-line" />
                      Download
                    </button>
                  </div>
                </div>
                <textarea
                  value={currentCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="flex-1 p-4 bg-gray-950 text-gray-100 font-mono text-sm resize-none outline-none overflow-auto"
                  placeholder="Your code will appear here..."
                  spellCheck={false}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 p-8">
                <i className="ri-code-box-line text-6xl opacity-20" />
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No file selected</p>
                  <p className="text-sm opacity-70 mb-4">
                    {Object.keys(fileTree).length > 0 
                      ? "Select a file from the sidebar to view and edit" 
                      : "Ask AI to generate code to get started"}
                  </p>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Example:</p>
                      <p className="text-xs text-purple-400 font-mono">@ai create a React todo app</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <header className="flex justify-between items-center px-6 py-4 bg-gray-700 border-b border-gray-600 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-white">Add Collaborators</h2>
              <button onClick={closeUserModal} className="text-gray-300 hover:text-white transition">
                <i className="ri-close-fill text-2xl" />
              </button>
            </header>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="ri-user-search-line text-5xl opacity-30 mb-3 block" />
                  <p className="text-sm">No users available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.filter(u => {
                    const uid = String(u?._id ?? u?.id ?? "");
                    return !projectUsers.some(pu => String(pu?._id ?? pu?.id ?? "") === uid);
                  }).map((u) => {
                    const uid = String(u?._id ?? u?.id ?? "");
                    const isSelected = selectedUserIds.map(String).includes(uid);
                    
                    return (
                      <div
                        key={uid}
                        onClick={() => toggleSelectUser(uid)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                          isSelected ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-blue-700" : "bg-gray-600"
                        }`}>
                          <i className="ri-user-3-fill text-white text-lg" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium text-sm">{u.name}</h3>
                          <p className="text-xs text-gray-300">{u.email}</p>
                        </div>
                        {isSelected && (
                          <i className="ri-check-line text-white text-xl" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-700 border-t border-gray-600 rounded-b-2xl flex justify-between items-center">
              <p className="text-sm text-gray-300">
                {selectedUserIds.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeUserModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addCollaborators}
                  disabled={selectedUserIds.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;