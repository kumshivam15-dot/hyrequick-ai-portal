import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, jobsTable, applicationsTable, companiesTable, employeesTable } from "@workspace/db";
import {
  GetEmployerStatsResponse,
  GetCandidateStatsResponse,
  GetPlatformStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/employer", async (_req, res): Promise<void> => {
  const [activeJobs] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(eq(jobsTable.isActive, true));
  const [totalApplications] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable);
  const [pendingReview] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "pending"));
  const [shortlisted] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "shortlisted"));
  const [hired] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "hired"));
  const [headcount] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.status, "active"));

  const topJobRow = await db
    .select({
      title: jobsTable.title,
      count: sql<number>`count(${applicationsTable.id})::int`,
    })
    .from(jobsTable)
    .leftJoin(applicationsTable, eq(applicationsTable.jobId, jobsTable.id))
    .groupBy(jobsTable.id, jobsTable.title)
    .orderBy(sql`count(${applicationsTable.id}) DESC`)
    .limit(1);

  const recentApplications = await db
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
    .orderBy(sql`${applicationsTable.appliedAt} DESC`)
    .limit(5);

  const applicationsByStatus = await db
    .select({
      status: applicationsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .groupBy(applicationsTable.status);

  res.json(GetEmployerStatsResponse.parse({
    activeJobs: activeJobs?.count ?? 0,
    totalApplications: totalApplications?.count ?? 0,
    pendingReview: pendingReview?.count ?? 0,
    shortlisted: shortlisted?.count ?? 0,
    hired: hired?.count ?? 0,
    topJob: topJobRow[0]?.title ?? null,
    headcount: headcount?.count ?? 0,
    recentApplications: recentApplications.map(app => ({
      ...app,
      jobTitle: app.jobTitle ?? "",
      companyName: app.companyName ?? "",
      appliedAt: app.appliedAt instanceof Date ? app.appliedAt.toISOString() : app.appliedAt,
    })),
    applicationsByStatus,
  }));
});

router.get("/stats/candidate", async (_req, res): Promise<void> => {
  const [totalApplied] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable);
  const [underReview] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "reviewed"));
  const [interviews] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "interviewed"));
  const [offers] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "offered"));
  const [rejected] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "rejected"));

  const recentApplications = await db
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
    .orderBy(sql`${applicationsTable.appliedAt} DESC`)
    .limit(5);

  res.json(GetCandidateStatsResponse.parse({
    totalApplied: totalApplied?.count ?? 0,
    underReview: underReview?.count ?? 0,
    interviews: interviews?.count ?? 0,
    offers: offers?.count ?? 0,
    rejected: rejected?.count ?? 0,
    recentApplications: recentApplications.map(app => ({
      ...app,
      jobTitle: app.jobTitle ?? "",
      companyName: app.companyName ?? "",
      appliedAt: app.appliedAt instanceof Date ? app.appliedAt.toISOString() : app.appliedAt,
    })),
  }));
});

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [totalJobs] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable);
  const [totalCompanies] = await db.select({ count: sql<number>`count(*)::int` }).from(companiesTable);
  const [totalApplications] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable);
  const [totalHires] = await db.select({ count: sql<number>`count(*)::int` }).from(applicationsTable).where(eq(applicationsTable.status, "hired"));

  res.json(GetPlatformStatsResponse.parse({
    totalJobs: totalJobs?.count ?? 0,
    totalCompanies: totalCompanies?.count ?? 0,
    totalApplications: totalApplications?.count ?? 0,
    totalHires: totalHires?.count ?? 0,
  }));
});

export default router;
