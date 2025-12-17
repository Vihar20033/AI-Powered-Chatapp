import {Router} from "express";
import * as userController from "../controllers/user.controller.js";
import { body } from "express-validator";
import { authUser } from "../middlewares/auth.middleware.js";


const router = Router();

router.post("/register", 
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    userController.createUserController
);

router.post("/login",
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    userController.loginController
)

router.get("/profile", authUser,userController.profileController)

router.get("/logout", authUser, userController.logoutController);   

router.get("/get-all-users", authUser, userController.getAllUsersController);

export default router;