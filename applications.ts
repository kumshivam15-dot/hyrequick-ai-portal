import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, applicationsTable, jobsTable, companiesTable } from "@workspace/db";
import {
  ListApplicationsQueryParams,
  ApplyToJobParams,
  ApplyToJobBody,
  ApplyToJobResponse,
  GetApplicationParams,
  GetApplicationResponse,
  UpdateApplicationParams,
  UpdateApplicationBody,
  UpdateApplicationResponse,
  ListJobApplicationsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatApplication(app: {
  id: number;
  jobId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  status: string;
  notes: string | null;
  appliedAt: Date;
  jobTitle: string | null;
  companyName: string | null;
}) {
  return {
    ...app,
    jobTitle: app.jobTitle ?? "",
    companyName: app.companyName ?? "",
    appliedAt: app.appliedAt instanceof Date ? app.appliedAt.toISOString() : app.appliedAt,
  };
}

router.get("/jobs/:id/applications", async (req, res): Promise<void> => {
  const params = ListJobApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const apps = await db
    .select({
      id: applicationsTable.id,
      jobId: applicationsTable.jobId,
      candidateName: applicationsTable.candidateName,
      candidateEmail: applicationsTable.candidateEmail,
      candidatePhone: applicationsTable.candidatePhone,
      resumeUrl: applicationsTable.resumeUrl,
      coverLetter: applicationsTable.coverLetter,
      status: applicationsTable.status,
      notes: applicationsTable.notes,
      appliedAt: applicationsTable.appliedAt,
      jobTitle: jobsTable.title,
      companyName: companiesTable.name,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(eq(applicationsTable.jobId, params.data.id))
    .orderBy(sql`${applicationsTable.appliedAt} DESC`);

  res.json(apps.map(formatApplication));
});

router.post("/jobs/:id/applications", async (req, res): Promise<void> => {
  const params = ApplyToJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ApplyToJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const job = await db.select().from(jobsTable).leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id)).where(eq(jobsTable.id, params.data.id)).limit(1);
  if (!job[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const [app] = await db.insert(applicationsTable).values({
    jobId: params.data.id,
    ...parsed.data,
  }).returning();

  res.status(201).json(ApplyToJobResponse.parse({
    ...app,
    jobTitle: job[0].jobs?.title ?? "",
    companyName: job[0].companies?.name ?? "",
    appliedAt: app.appliedAt instanceof Date ? app.appliedAt.toISOString() : app.appliedAt,
  }));
});

router.get("/applications", async (req, res): Promise<void> => {
  const query = ListApplicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.candidateName) {
    conditions.push(ilike(applicationsTable.candidateName, `%${query.data.candidateName}%`));
  }
  if (query.data.status) {
    conditions.push(eq(applicationsTable.status, query.data.status));
  }

  const apps = await db
    .select({
      id: applicationsTable.id,
      jobId: applicationsTable.jobId,
      candidateName: applicationsTable.candidateName,
      candidateEmail: applicationsTable.candidateEmail,
      candidatePhone: applicationsTable.candidatePhone,
      resumeUrl: applicationsTable.resumeUrl,
      coverLetter: applicationsTable.coverLetter,
      status: applicationsTable.status,
      notes: applicationsTable.notes,
      appliedAt: applicationsTable.appliedAt,
      jobTitle: jobsTable.title,
      companyName: companiesTable.name,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${applicationsTable.appliedAt} DESC`);

  res.json(apps.map(formatApplication));
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db
    .select({
      id: applicationsTable.id,
      jobId: applicationsTable.jobId,
      candidateName: applicationsTable.candidateName,
      candidateEmail: applicationsTable.candidateEmail,
      candidatePhone: applicationsTable.candidatePhone,
      resumeUrl: applicationsTable.resumeUrl,
      coverLetter: applicationsTable.coverLetter,
      status: applicationsTable.status,
      notes: applicationsTable.notes,
      appliedAt: applicationsTable.appliedAt,
      jobTitle: jobsTable.title,
      companyName: companiesTable.name,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(eq(applicationsTable.id, params.data.id));

  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json(GetApplicationResponse.parse(formatApplication(app)));
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(applicationsTable)
    .set(parsed.data)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const [enriched] = await db
    .select({
      id: applicationsTable.id,
      jobId: applicationsTable.jobId,
      candidateName: applicationsTable.candidateName,
      candidateEmail: applicationsTable.candidateEmail,
      candidatePhone: applicationsTable.candidatePhone,
      resumeUrl: applicationsTable.resumeUrl,
      coverLetter: applicationsTable.coverLetter,
      status: applicationsTable.status,
      notes: applicationsTable.notes,
      appliedAt: applicationsTable.appliedAt,
      jobTitle: jobsTable.title,
      companyName: companiesTable.name,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
    .where(eq(applicationsTable.id, params.data.id));

  res.json(UpdateApplicationResponse.parse(formatApplication(enriched)));
});

export default router;
