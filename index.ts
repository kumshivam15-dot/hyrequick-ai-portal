import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import companiesRouter from "./companies";
import employeesRouter from "./employees";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(applicationsRouter);
router.use(companiesRouter);
router.use(employeesRouter);
router.use(statsRouter);

export default router;
