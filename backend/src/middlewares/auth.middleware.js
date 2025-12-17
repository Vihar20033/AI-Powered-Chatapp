import jwt from "jsonwebtoken";
import redisClient from "../services/redis.services.js";

export const authUser = async (req, res, next) => {

    try {
        const token = req.cookies.token || req.headers.authorization.split(" ")[1];

        if(!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        const isBlacklisted = await redisClient.get(token);
        if (isBlacklisted) {

            res.cookies("token", '', { httpOnly: true, expires: new Date(0) });
            return res.status(401).json({ message: "Unauthorized: Token is blacklisted" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
        
    } catch (error) {
        
    }
}