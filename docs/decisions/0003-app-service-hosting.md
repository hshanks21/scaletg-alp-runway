# 0003. App Service for the API, Static Web Apps for the front end

- Status: Accepted (pending confirmation of AlixPartners' hosting standard)
- Date: 2026-10-08

## Context
Runway's users are senior PMDs and Partners around the world, editing Budgets with a lot of back-and-forth (edit an Allocation → recalculate margin). It runs in AlixPartners' Azure tenant, and their IT team will eventually operate it. A React front end and an API backend were assumed. Scale was open to the hosting choice, as long as the trade-offs for the user experience were understood.

## Decision
Host the API on **Azure App Service** (always on) and the React front end on **Azure Static Web Apps** (served through a CDN).

## Rejected alternatives
- **Azure Functions (consumption plan)**: rejected because cold starts make the first request after a quiet period take several seconds, and the edit-and-recalculate loop makes many requests. It's also awkward for a stateful API.
- **Container Apps, scaling to zero**: rejected because of the same 5–15 second cold start each morning and after quiet periods. Senior users quickly lose trust in a tool that hesitates.
- **Container Apps with one replica always running**: equivalent experience and similar cost. Rejected only because Microsoft-shop ops teams know App Service better. It's the preferred switch if AlixPartners already standardizes on containers.

## Consequences
- Consistent response times with no cold starts. A fixed monthly cost that is small at this firm's scale.
- Fits private networking to the Budget Tool database (ADR 0001).
- Follow-up: confirm AlixPartners' standard hosting platform with Paul; revisit if they mandate containers or AKS.
