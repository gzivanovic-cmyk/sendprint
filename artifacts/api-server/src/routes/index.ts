import { Router, type IRouter } from "express";
import healthRouter from "./health";
import printRouter from "./print";
import configRouter from "./config";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(printRouter);
router.use(configRouter);
router.use(logsRouter);

export default router;
