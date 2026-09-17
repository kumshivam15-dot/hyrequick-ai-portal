import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, companiesTable, jobsTable } from "@workspace/db";
import {
  CreateCompanyBody,
  CreateCompanyResponse,
  GetCompanyParams,
  GetCompanyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/companies", async (_req, res): Promise<void> => {
  const companies = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      logo: companiesTable.logo,
      industry: companiesTable.industry,
      size: companiesTable.size,
      location: companiesTable.location,
      website: companiesTable.website,
      description: companiesTable.description,
      foundedYear: companiesTable.foundedYear,
      openJobCount: sql<number>`(select count(*) from jobs where jobs.company_id = ${companiesTable.id} and jobs.is_active = true)::int`,
    })
    .from(companiesTable)
    .orderBy(companiesTable.name);

  res.json(companies);
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db.insert(companiesTable).values(parsed.data).returning();

  res.status(201).json(CreateCompanyResponse.parse({
    ...company,
    openJobCount: 0,
  }));
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      logo: companiesTable.logo,
      industry: companiesTable.industry,
      size: companiesTable.size,
      location: companiesTable.location,
      website: companiesTable.website,
      description: companiesTable.description,
      foundedYear: companiesTable.foundedYear,
      openJobCount: sql<number>`(select count(*) from jobs where jobs.company_id = ${companiesTable.id} and jobs.is_active = true)::int`,
    })
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json(GetCompanyResponse.parse(company));
});

export default router;
