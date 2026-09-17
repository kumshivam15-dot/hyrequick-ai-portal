import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, employeesTable, companiesTable } from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  CreateEmployeeResponse,
  GetEmployeeParams,
  GetEmployeeResponse,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  UpdateEmployeeResponse,
  DeleteEmployeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatEmployee(emp: {
  id: number;
  companyId: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  employmentType: string;
  startDate: string;
  salary: number | null;
  status: string;
  avatar: string | null;
  companyName: string | null;
}) {
  return {
    ...emp,
    companyName: emp.companyName ?? "",
  };
}

router.get("/employees", async (req, res): Promise<void> => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.department) {
    conditions.push(eq(employeesTable.department, query.data.department));
  }
  if (query.data.companyId) {
    conditions.push(eq(employeesTable.companyId, query.data.companyId));
  }

  const employees = await db
    .select({
      id: employeesTable.id,
      companyId: employeesTable.companyId,
      companyName: companiesTable.name,
      name: employeesTable.name,
      email: employeesTable.email,
      phone: employeesTable.phone,
      role: employeesTable.role,
      department: employeesTable.department,
      employmentType: employeesTable.employmentType,
      startDate: employeesTable.startDate,
      salary: employeesTable.salary,
      status: employeesTable.status,
      avatar: employeesTable.avatar,
    })
    .from(employeesTable)
    .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(employeesTable.name);

  res.json(employees.map(formatEmployee));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.insert(employeesTable).values(parsed.data).returning();
  const company = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId)).limit(1);

  res.status(201).json(CreateEmployeeResponse.parse({
    ...employee,
    companyName: company[0]?.name ?? "",
  }));
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db
    .select({
      id: employeesTable.id,
      companyId: employeesTable.companyId,
      companyName: companiesTable.name,
      name: employeesTable.name,
      email: employeesTable.email,
      phone: employeesTable.phone,
      role: employeesTable.role,
      department: employeesTable.department,
      employmentType: employeesTable.employmentType,
      startDate: employeesTable.startDate,
      salary: employeesTable.salary,
      status: employeesTable.status,
      avatar: employeesTable.avatar,
    })
    .from(employeesTable)
    .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
    .where(eq(employeesTable.id, params.data.id));

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(GetEmployeeResponse.parse(formatEmployee(employee)));
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.update(employeesTable)
    .set(parsed.data)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const company = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId)).limit(1);

  res.json(UpdateEmployeeResponse.parse({
    ...employee,
    companyName: company[0]?.name ?? "",
  }));
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id)).returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
