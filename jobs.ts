import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, jobsTable, companiesTable, applicationsTable } from "@workspace/db";
import {
  ListJobsQueryParams,
  CreateJobBody,
  CreateJobResponse,
  GetJobParams,
  GetJobResponse,
  UpdateJobParams,
  UpdateJobBody,
  UpdateJobResponse,
  DeleteJobParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jobs", async (req, res): Promise<void> => {
  const query = ListJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, location, type, category, companyId } = query.data;

  const conditions = [];
  if (search) {
    conditions.push(ilike(jobsTable.title, `%${search}%`));
  }
  if (location) {
    conditions.push(ilike(jobsTable.location, `%${location}%`));
  }
  if (type) {
    conditions.push(eq(jobsTable.type, type));
  }
  if (category) {
    conditions.push(eq(jobsTable.category, category));
  }
  if (companyId) {
    conditions.push(eq(jobsTable.companyId, companyId));
  }

  const jobs = await db
    .select({
      id: jobsTable.id,
      title: jobsTable.title,
      companyId: jobsTable.companyId,
      companyName: companiesTable.name,
      companyLogo: companiesTable.logo,
      location: jobsTable.location,
      type: jobsTable.type,
      category: jobsTable.category,
      description: jobsTable.description,
      requirements: jobsTable.requirements,
      salaryMin: jobsTable.salaryMin,
      salaryMax: jobsTable.salaryMax,
      tags: jobsTable.tags,
      postedAt: jobsTable.postedAt,
      isActive: jobsTable.isActive,
      applicationCount: sql<number>`(select count(*) from applications where applications.job_id = ${jobsTable.id})::int`,
    })
    .from(jobsTable)
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${jobsTable.postedAt} DESC`);

  res.json(jobs.map(j => ({
    ...j,
    companyName: j.companyName ?? "",
    postedAt: j.postedAt instanceof Date ? j.postedAt.toISOString() : j.postedAt,
  })));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [job] = await db.insert(jobsTable).values({
    ...parsed.data,
    tags: parsed.data.tags ?? [],
  }).returning();

  const company = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1);

  res.status(201).json(CreateJobResponse.parse({
    ...job,
    companyName: company[0]?.name ?? "",
    companyLogo: company[0]?.logo ?? null,
    postedAt: job.postedAt instanceof Date ? job.postedAt.toISOString() : job.postedAt,
    applicationCount: 0,
  }));
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db
    .select({
      id: jobsTable.id,
      title: jobsTable.title,
      companyId: jobsTable.companyId,
      companyName: companiesTable.name,
      companyLogo: companiesTable.logo,
      location: jobsTable.location,
      type: jobsTable.type,
      category: jobsTable.category,
      description: jobsTable.description,
      requirements: jobsTable.requirements,
      salaryMin: jobsTable.salaryMin,
      salaryMax: jobsTable.salaryMax,
      tags: jobsTable.tags,
      postedAt: jobsTable.postedAt,
      isActive: jobsTable.isActive,
      applicationCount: sql<number>`(select count(*) from applications where applications.job_id = ${jobsTable.id})::int`,
    })
    .from(jobsTable)
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(eq(jobsTable.id, params.data.id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(GetJobResponse.parse({
    ...job,
    companyName: job.companyName ?? "",
    postedAt: job.postedAt instanceof Date ? job.postedAt.toISOString() : job.postedAt,
  }));
});

router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [job] = await db.update(jobsTable)
    .set(parsed.data)
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const company = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1);
  const [appCount] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.jobId, job.id));

  res.json(UpdateJobResponse.parse({
    ...job,
    companyName: company[0]?.name ?? "",
    companyLogo: company[0]?.logo ?? null,
    postedAt: job.postedAt instanceof Date ? job.postedAt.toISOString() : job.postedAt,
    applicationCount: appCount?.count ?? 0,
  }));
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id)).returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
