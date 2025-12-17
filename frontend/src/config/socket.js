import { io } from "socket.io-client";  // ✅ correct

let socketInstance = null;

export const initializeSocket = (projectId) => {
    socketInstance = io(import.meta.env.VITE_API_BASE_URL, {
        transports: ["websocket"],  // ✅ force websocket (prevents 400 / polling issues)
        auth: {
            token: localStorage.getItem("token")
        },
        query: {
            projectId
        }
    });

    return socketInstance;
};

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) return console.warn("Socket not initialized!");
    socketInstance.on(eventName, cb);
};

export const sendMessage = (eventName, data) => {
    if (!socketInstance) return console.warn("Socket not initialized!");
    socketInstance.emit(eventName, data);
};
