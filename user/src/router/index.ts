import { Router } from "express";
import { userRouter } from "./user.router";
import { authRouter } from "./auth.router";

export const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
