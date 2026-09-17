# QuickHyre AI Portal

An AI-powered job application and recruitment platform built to streamline hiring workflows for candidates and recruiters.

## 🚀 Features
* **Candidate Hub:** Job search, company browsing, application tracking, and automated matching.
* **Employer Suite:** Job posting, applicant tracking system (ATS), and team management (HRMS).
* **AI Integrations:** Intelligent candidate screening and automated resume analysis.

## 🛠️ Tech Stack
* **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
* **Backend:** Node.js, Express.js, TypeScript
* **Database & ORM:** PostgreSQL, Drizzle ORM
* **Architecture:** pnpm Monorepo Workspaces

## 📦 Project Structure
```text
.
├── artifacts/
│   ├── quickhyre/       # React + Vite frontend application
│   └── api-server/      # Express.js REST API server
└── lib/
    ├── db/              # PostgreSQL schema & Drizzle ORM setup
    └── api-spec/        # OpenAPI / Swagger specification
