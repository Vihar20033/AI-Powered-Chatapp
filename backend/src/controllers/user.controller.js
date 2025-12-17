import { User } from "../models/user.models.js";
import userServices from "../services/user.services.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.services.js";


// ✅ CREATE USER
const createUserController = async (req, res) => {
  console.log("📥 [CREATE USER] Incoming Request Body:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ [VALIDATION FAILED] Errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log("⚙️ [SERVICE CALL] userServices.createUser()");
    const user = await userServices.createUser(req.body);

    console.log("✅ [USER CREATED] User:", user);

    console.log("🔐 [TOKEN GENERATE]");
    const token = await user.generateJWT();

    console.log("✅ [TOKEN SUCCESS] Token:", token);

    delete user._doc.password;

    return res.status(201).json({
      user: { email: user.email, id: user._id },
      token
    });

  } catch (error) {
    console.error("🔥 [ERROR in createUserController]:", error);
    return res.status(400).json({ message: error.message });
  }
};

// ✅ LOGIN USER
const loginController = async (req, res) => {
  console.log("📥 [LOGIN] Incoming Request Body:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ [VALIDATION FAILED] Errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    console.log("🔎 [DB QUERY] Searching user by email:", email);

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("❌ [LOGIN FAILED] No user found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("🔑 [PASSWORD CHECK]");
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      console.log("❌ [LOGIN FAILED] Incorrect password");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("🔐 [JWT GENERATE]");
    const token = user.generateJWT();

    delete user._doc.password;
    console.log("✅ [LOGIN SUCCESS]");
    return res.status(200).json({
      user: { email: user.email, id: user._id },
      token
    });

  } catch (error) {
    console.error("🔥 [ERROR in loginController]:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ PROFILE
const profileController = async (req, res) => {
  console.log("👤 [PROFILE] Authenticated User:", req.user);
  return res.status(200).json({ message: "Profile accessed", user: req.user });
};

// ✅ LOGOUT
const logoutController = async (req, res) => {
  console.log("🚪 [LOGOUT] Request received");

  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    console.log("🔍 [TOKEN FOUND]:", token);

    if (!token) {
      console.log("❌ [LOGOUT FAILED] No token provided");
      return res.status(400).json({ message: "No token provided" });
    }

    console.log("🗑 [REDIS BLACKLIST] Token added to blocklist");
    await redisClient.set(token, "logout", "EX", 3600 * 24);

    return res.status(200).json({ message: "Successfully logged out" });

  } catch (error) {
    console.error("🔥 [ERROR in logoutController]:", error);
    return res.status(400).json({ message: "Internal server error" });
  }
};


const getAllUsersController = async (req, res) => {
  try {
    const loggedInUser = await User.findOne({
      email: req.user.email
    });

    // ✅ get userId properly
    const userId = loggedInUser._id;

    const allUsers = await userServices.getAllUsers({ userId });

    return res.status(200).json({ users: allUsers });
  } catch (error) {
    console.error("🔥 [ERROR in getAllUsersController]:", error);
    return res.status(400).json({ message: error.message });
  }
};


export { createUserController, loginController, profileController, logoutController , getAllUsersController };
