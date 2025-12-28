// user.services.js
import { User } from "../models/user.models.js";

const createUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await User.create({ email, password });
  return user;
};

const getAllUsers = async ({userId}) => {

  const users = await User.find({
     _id: { $ne: userId } // Exclude the requesting user
  }, '-password'); // Exclude password field
  return users;
}

export default {
  createUser,
  getAllUsers
};
