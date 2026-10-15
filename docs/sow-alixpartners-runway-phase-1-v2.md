# AlixPartners

## RUNWAY PHASE 1 BUDGET TOOL MODERNIZATION

#### STATEMENT OF WORK

### SALES EXECUTIVE: PATRICK NAGORSEN TECHNICAL SALES: RICK MORAN

### DATE: 10/15/2026 SOW#: 2026-ALIXPARTNERS-RUNWAY-001

##### PROPOSAL TEAM

|Name|Company/Function|Phone|Email|
|---|---|---|---|
|Patrick Nagorsen|Account Manager|248.767.2619|patrick@scaletg.com|
|Rick Moran|Chief Application/AI Architect|216.903.1231|rick@scaletg.com|
|Adam Piechocinski|Field CTO|440.590.1643|adam@scaletg.com|

##### REVISION HISTORY

|Revision|Revision Date|Name|Notes|
|---|---|---|---|
|V1.0|10/15/2026|Adam Piechocinski|First Internal Release|
|V2.0|10/15/2026|Harold Shanks|Revised — Scale builds; updated pricing, timeline, team model|

*Notices:* *© 2026 Scale Technology Group Inc. All Rights Reserved. This document and its contents are the confidential and proprietary intellectual property of SCALE and may not be duplicated, redistributed or displayed to any third party without the prior written consent of SCALE.*

##### COPYRIGHT © SCALE TECHNOLOGY GROUP

##### 1. EXECUTIVE OVERVIEW

##### 1.1. Introduction

This Statement of Work is issued by **Scale Technology Group** to **AlixPartners** and covers Phase 1 of Runway, the modernization of the AlixPartners Budget Tool. Engagement Owners use the Budget Tool today to define an Engagement, select Resources and rates, and estimate the Engagement's profitability before the leadership team approves the Budget. Resources and rates reach the Budget Tool from SAP through a daily data load. AlixPartners wants a replacement that is easier to use, keeps a record of each Budget's approved states, and signs users in through Microsoft Entra ID with Duo multi-factor authentication.

##### 1.2. Solution Overview

Runway replaces the Budget Tool's screens and backend and keeps using its existing database. Database changes are limited to new tables and new optional columns, designed so that the Budget Tool, the SAP data load and other systems that use the database work as they do today. During the pilot, Runway and the Budget Tool run side by side on the same data.

Engagement Owners build a Budget by laying out Tasks over time and assigning people to them. A live panel recalculates margin as the Budget changes. Checkpoints record each Submitted, Approved and Modified state, so changes can be compared with the last approved Budget.

Scale designs, builds and delivers Runway. The application is built using React, Express and Node.js, connecting to the existing AlixPartners SQL Server database. Scale hosts the code repository during development and transfers ownership to AlixPartners at production go-live. Phase 1 runs for approximately 15 weeks from kickoff through the end of the pilot, targeting completion by **January 30, 2027**, for a fixed fee of **$222,000** billed across four milestones. AlixPartners provides the Azure environments, time from Strategic Finance and business users, and access to the existing database (see 4.4).

##### 1.3. Team

Scale provides the following roles:

|Role|Responsibility|
|---|---|
|Delivery Lead|Plans and runs Phase 1: governance, status reporting and risks.|
|Solution Architect|Owns the solution architecture, data access design and technical decisions.|
|Engineering Team|Designs, builds and tests Runway: front end, API, data access and calculation engine.|
|UX/UI Designer|Runs the UX sessions and produces wireframes, visual design and component library.|
|Test Lead|Owns the test strategy, calculation match, and acceptance plan.|
|DevOps Lead|Builds the Azure environments, Terraform and deployment pipelines.|

AlixPartners provides the following roles:

|Role|Responsibility|
|---|---|
|Executive Sponsor|Owns business priorities, resolves escalations and accepts milestones.|
|Strategic Finance|Supplies calculation rules and sample Engagements; validates results.|
|Business Users|Provide UX session participants, UAT testers and pilot users.|
|IT Contact|Provides Azure environment access, Entra ID configuration and database connectivity.|

##### 1.4. Objectives

Phase 1 gives Engagement Owners a modern application for building and approving Budgets, and leaves AlixPartners' team able to support and extend it.

- Deliver the Section 3 feature scope in the AlixPartners Azure tenant.
- Match the Budget Tool's revenue, margin and KPI results.
- Keep the Budget Tool and its dependent systems working unchanged.
- Replace the spreadsheet-style screens with a staffing-plan timeline.
- Add Checkpoints, comparison with the approved Budget, and re-approval.
- Transfer the codebase and documentation to AlixPartners at go-live.

##### 2. EXECUTION

##### 2.1. Introduction

Work runs in six areas, scheduled in 2.6. Discovery and UX design come first. Scale then builds the platform and features in two-week sprints, with sprint demos and progress reporting to the AlixPartners stakeholders. Calculation match, user acceptance testing (UAT), a stabilization week, production go-live and a 4-week pilot follow.

##### 2.2. Tasks and Activities

##### 2.2.1. Mobilization and Discovery

Scale leads. AlixPartners provides the Budget Tool walkthrough, database access and Strategic Finance time.

- Hold a kickoff and agree the delivery plan, governance and sprint cadence.
- Walk through the Budget Tool with AlixPartners and confirm the feature scope.
- Analyze the Budget Tool database: tables, save behavior and dependent systems.
- Document the calculation rules with Strategic Finance.
- Agree the calculation match tolerance with Strategic Finance.
- Collect about 10 sample Engagements with expected results.
- Produce the solution architecture and a technical decision log.
- Confirm database connectivity and environment access with AlixPartners IT.

##### 2.2.2. UX and Design

Scale leads. AlixPartners provides PMDs and Partners for the sessions and the design review.

- Run two UX working sessions with 3 to 5 PMDs and Partners.
- Turn session findings into design principles and user journeys.
- Produce the information architecture and wireframes.
- Produce the visual design and a component library specification.
- Review the design with selected pilot users.

##### 2.2.3. Platform and Foundation

Scale builds and deploys.

- Terraform for the Dev, UAT and Prod environments in AlixPartners' Azure tenant.
- Build and deployment pipelines, including approval for production releases.
- Entra ID app registrations, role groups and Duo sign-in.
- Monitoring, alerting and backups.
- API foundation: sign-in, roles and Engagement-level access.
- Data access over the existing SQL Server database and any new tables or columns.
- Front-end foundation: application shell, navigation and component library.

##### 2.2.4. Feature Build

Scale builds the features in Section 3 in two-week sprints with sprint demos to AlixPartners stakeholders.

- Build each feature to the confirmed design and acceptance criteria.
- Demonstrate completed features at the end of each sprint.
- Track progress, risks and delivery pace against the delivery plan.
- Report sprint status to the Executive Sponsor and AlixPartners IT.

##### 2.2.5. Quality and Calculation Match

Scale owns the test strategy, calculation match, functional testing and security review.

- Define the test strategy and acceptance plan.
- Build and run automated tests for each feature.
- Run the calculation match on the sample Engagements and report results.
- Run regression testing of Runway alongside the Budget Tool.
- Review sign-in, permissions and Azure configuration for security issues.

##### 2.2.6. UAT, Go-Live and Pilot

AlixPartners testers run UAT. Scale fixes defects and deploys.

- Prepare UAT scripts and onboard the named AlixPartners testers.
- Support a 10-business-day UAT and triage defects.
- Complete a one-week stabilization period to close UAT defects.
- Deploy to production and execute go-live.
- Produce the user guide and training material for Engagement Owners.
- Support a 4-week pilot with 5 to 10 Engagement Owners and weekly check-ins.
- Transfer the code repository and all documentation to AlixPartners at go-live.

##### 2.3. Post-Go-Live Support

After production go-live, Scale provides up to 120 hours of support (hypercare) to AlixPartners for troubleshooting, defect resolution and knowledge transfer. Support for the 4-week pilot is included in Phase 1 and does not draw on these hours. The hours expire 180 days after production go-live and are not refunded or carried forward.

##### 2.4. Milestones and Deliverables

Scale produces three deliverable packages. Working material such as meeting notes and draft designs is shared as it is produced and is not subject to acceptance.

|ID|Deliverable|Contents|Milestone|
|---|---|---|---|
|D-1|Discovery and Design Package|Delivery plan, confirmed feature scope, database assessment, calculation rules and match tolerance, solution architecture and technical decision log, UX design (wireframes, visual design), engineering standards and test strategy.|1|
|D-2|Build Quality Package|Sprint reports, calculation match report, security review report and UAT plan.|3|
|D-3|Go-Live Package|UAT defect log, user guide and training material, code repository transfer. A pilot summary follows at the end of the pilot and is not a milestone condition.|4|

Each billing milestone is complete when its exit criteria are met:

|Milestone|Exit Criteria|
|---|---|
|Milestone 1: Discovery and Design Complete|D-1 accepted.|
|Milestone 2: Platform and Foundation Complete|Dev, UAT and Prod environments provisioned and foundation code deployed.|
|Milestone 3: Build Complete and Ready for UAT|Section 3 features deployed to the UAT environment; D-2 delivered.|
|Milestone 4: Production Go-Live|UAT complete, Runway deployed to production, code repository transferred, and D-3 delivered.|

##### 2.5. Acceptance

Scale's deliverables (D-1 to D-3) are accepted under the review terms in 4.1. The calculation match compares Runway with the Budget Tool's revenue, margin and KPI results for about 10 sample Engagements supplied by AlixPartners, within a tolerance agreed with Strategic Finance in discovery and recorded in D-1. UAT runs for 10 business days with named AlixPartners testers. A defect is a failure against Section 3 or the calculation match, ranked as follows:

|Severity|Definition|
|---|---|
|Critical|A core workflow cannot be completed and there is no workaround.|
|High|A core workflow is affected and a workaround exists.|
|Medium|A non-core function is affected.|
|Low|Cosmetic or minor issue with no effect on results.|

UAT is complete when no Critical or High defects remain open. If AlixPartners sends no written rejection by the end of UAT, UAT is complete and any open defects move to post-go-live support.

##### 2.6. Schedule

The schedule targets completion by **January 30, 2027** and is confirmed in the delivery plan.

|Activity|Timing|
|---|---|
|Mobilization and Discovery|Weeks 1 to 2|
|UX and Design|Weeks 1 to 4|
|Platform and Foundation|Weeks 2 to 4|
|Feature Build (Scale)|Weeks 4 to 9|
|Calculation Match and System Testing|Weeks 7 to 9|
|UAT (10 business days)|Weeks 9 to 10|
|Stabilization|Week 11|
|Production Go-Live and Code Transfer|End of Week 11|
|Pilot (4 weeks)|Weeks 12 to 15|
|Post-Go-Live Support (120 hours)|Until 180 days after production go-live|

##### 3. PHASE 1 FEATURE SCOPE

Each feature is marked Keep (same behavior, rebuilt), Redesign (same outcome, delivered a new way) or New (not in the Budget Tool today). The list reflects Scale's understanding of the Budget Tool and will be confirmed in the walkthrough. Phase 1 is priced and accepted against it.

##### 3.1. Sign-in and Access

|ID|Feature|Disposition|
|---|---|---|
|A1|Sign-in with Microsoft Entra ID and Duo.|Keep|
|A2|Engagement Owners see only Engagements where they are the Lead PMD/Partner. Strategic Finance sees all. Approvers see Budgets submitted to them. Roles are Entra groups.|Keep|
|A3|Raw cost rates are visible only to Strategic Finance. Engagement Owners see margin.|Keep (confirm in walkthrough)|

##### 3.2. Engagements

|ID|Feature|Disposition|
|---|---|---|
|B1|List and search Engagements, with Budget status (Draft, Submitted, Approved, Rejected, Modified).|Redesign|
|B2|Create an Engagement: client, name, Engagement Owner, Engagement type (Fixed Fee or Hourly), fee, Engagement Dates, and Period Type (weekly or monthly). Engagement Dates replace the number of periods.|Redesign|

##### 3.3. Building a Budget

|ID|Feature|Disposition|
|---|---|---|
|C1|Add Tasks with a name, estimated hours, a start and a number of Periods. Periods can be removed individually. Tasks can be reordered.|New|
|C2|Add Allocations to a Task for a named Resource or a Placeholder for a Resource Category, with hours per Period.|Redesign|
|C3|Once a Task has Allocations, its estimate is greyed out and replaced by the sum of its Allocations.|New|
|C4|Each Allocation line shows the Resource's level and standard rate. The engagement rate is editable per line.|Keep (confirm in walkthrough)|
|C5|Allocations with no Task (older Budgets, or rows added in the Budget Tool) appear under a Catch-all Task.|New|
|C6|Hours, fees at standard and fees at engagement rates, totaled by Period, Resource, Task and Budget.|Keep|
|C7|Staffing-plan timeline (Tasks and Resources over time) in place of a spreadsheet grid. Final design comes from the two UX sessions.|Redesign|

##### 3.4. Profitability

|ID|Feature|Disposition|
|---|---|---|
|D1|Live calculation as the user edits: revenue, margin, margin %, Realization, Staff/PMD hours (leverage), % of hours below Director. Results match the Budget Tool within the agreed tolerance.|Keep|

##### 3.5. Submission, Approval and Checkpoints

|ID|Feature|Disposition|
|---|---|---|
|E1|Submit a Budget for Approval. An Approver accepts or rejects it with a comment.|Keep|
|E2|Every save is kept. Checkpoints are taken at Submitted, Approved and Modified.|New|
|E3|View a Budget's Checkpoints and compare the current state with the Baseline, which is the most recent Approved Checkpoint.|New|
|E4|Modify an approved Budget. Re-approval is required when it crosses the Re-approval Threshold: one percentage limit and one total-hours limit, set by AlixPartners in discovery.|New|
|E5|Budget status changes are shown in the application. No email or Teams notifications.|Keep (confirm in walkthrough)|

##### 3.6. Data and Integration

|ID|Feature|Disposition|
|---|---|---|
|F1|Resources, rates and Resource Categories are read from the Budget Tool database, as loaded today from SAP. No new SAP integration.|Keep|
|F2|Runway saves Budgets to the Budget Tool database in its existing structure, so systems that read approved Budgets today (including SAP Project creation) keep working unchanged.|Keep|
|F3|Runway and the Budget Tool run side by side on the same data during the pilot, with no lock between them.|New|

##### 3.7. Output

|ID|Feature|Disposition|
|---|---|---|
|G1|Export a Budget to Excel in one standard layout.|Keep (confirm in walkthrough)|

##### 3.8. Non-Functional

|ID|Feature|Disposition|
|---|---|---|
|H1|Desktop browsers supported by AlixPartners. No mobile layout.|Keep|
|H2|Hosted in the AlixPartners Azure tenant (Dev, UAT, Prod). Availability follows Azure's standard service levels.|New|
|H3|Design target: recalculation completes in under 1 second for a typical Budget. Not an acceptance criterion.|New|

##### 4. ASSUMPTIONS

##### 4.1. General Assumptions

- All work under this SOW is performed remotely.
- Work is performed during normal business hours, Monday to Friday, Eastern Time.
- Working sessions are held over Microsoft Teams or a similar tool.
- Changes to scope, schedule or assumptions are handled through a change order.
- AlixPartners reviews each Scale deliverable within 5 business days.
- A deliverable with no written rejection after 5 business days is accepted.

##### 4.2. Project Assumptions

The fixed fee is based on the following assumptions. If any of them proves wrong, the affected work is re-scoped through a change order. Delays caused by AlixPartners availability or dependencies, including Strategic Finance, are also handled through a change order.

- No Budget Tool source code was reviewed before this SOW.
- The feature scope covers the Budget Tool features in use today.
- Runway's Azure environment can reach the database over a private connection.
- The Budget Tool database runs on SQL Server or Azure SQL.
- Runway uses the existing Budget Tool database in place.
- AlixPartners agrees that Runway may add tables and optional columns.
- These additions do not affect the Budget Tool or other systems.
- The Budget Tool updates Allocation rows in place when it saves.
- The existing SAP data load provides the Resources and rates Runway needs.
- Approval is a single step by any member of an Approver group.
- Existing Budgets use only weekly or monthly Periods.
- AlixPartners accepts Terraform and Azure App Service for hosting.
- The application is built using React, Express and Node.js, connecting to AlixPartners' SQL Server database.
- Scale hosts the code repository during development and transfers it to AlixPartners at production go-live.
- The schedule targets completion by January 30, 2027.

##### 4.3. Out of Scope

- Budget vs. Actual, Forecasts and the Ideal Hours Coefficient (Phase 2).
- Any change to how the Budget Tool, the SAP data load, SAP or Intapp behave.
- A daily Period Type, or more than one Period Type within a Budget.
- Budget templates, copying a Budget, bulk import and dashboards.
- Multi-step approval routing.
- Budget Tool screens, reports or workflows not listed in Section 3.
- Data migration.
- Email or Teams notifications, mobile layouts and offline use.
- Penetration testing; AlixPartners' security team runs any required test.
- Azure consumption and licensing costs.

##### 4.4. Client Responsibilities

- Name the Executive Sponsor at kickoff.
- Provide a Budget Tool walkthrough and access to its database schema.
- Provide calculation rules and about 10 sample Engagements within 2 weeks of kickoff.
- Make Strategic Finance available in Weeks 1 to 2 and Weeks 7 to 9.
- Provide Dev, UAT and Prod Azure environments and Scale access within 2 weeks of kickoff.
- Create the Entra ID groups for roles and configure Duo.
- Name an approver for production deployments.
- Provide 3 to 5 PMDs and Partners for the two UX sessions.
- Provide named UAT testers for the 10-business-day UAT window.
- Select 5 to 10 Engagement Owners for the 4-week pilot.
- Decide on and carry out full rollout after the pilot.

##### 5. PRICING

The fixed fee of **$222,000** is billed in four milestones:

|Billing Milestone|Percentage|Amount|
|---|---|---|
|Milestone 1: Discovery and Design Complete|25%|$ 55,500.00|
|Milestone 2: Platform and Foundation Complete|20%|$ 44,400.00|
|Milestone 3: Build Complete and Ready for UAT|30%|$ 66,600.00|
|Milestone 4: Production Go-Live|25%|$ 55,500.00|
|Total:|100%|$ 222,000.00|

##### 5.1. Expenses

No travel or incidental expenses are billed under this SOW.

##### 6. TERMS AND CONDITIONS

The following terms and conditions shall govern this agreement unless a valid Master Services & Product Agreement or other similar agreement ("Master Agreement") between the parties has been executed and is in force, in which case the terms of the Master Agreement shall prevail to the extent that they are inconsistent with the following terms and conditions.

1. **Purchase Orders, Invoicing, Payment and Acceptance.** Any purchase order submitted by CLIENT in connection with this agreement shall be deemed subject to these Additional Terms and this agreement. Unsigned, electronically submitted purchase orders shall be deemed to include CLIENT's electronic signature and shall be binding to the extent accepted by Scale. Scale's performance of such purchase order shall not constitute Scale's acceptance of new or different terms, including pre-printed terms on such order. In absence of a purchase order, CLIENT agrees that its signature below grants Scale the right to invoice CLIENT and authorizes payment to Scale for the amounts owed. Further, CLIENT represents that Scale can rely on such CLIENT signature for payment. Scale shall invoice CLIENT for the Products and/or Services in accordance with the terms stated in the agreement. The price included herein reflects a 3% discount for payment by cash, check or wire transfer. This discount will not apply in the event that CLIENT pays using a credit card or debit card. CLIENT shall make payment to Scale within thirty (30) days from the date of invoice. Except for taxes due on Scale's net income, CLIENT shall pay all taxes. Scale reserves the right to bill CLIENT for additional work requested by CLIENT and performed by Scale, and for applicable expenses incurred by Scale pursuant to providing such additional services, which are not described in this agreement. Unless otherwise indicated in this agreement, CLIENT agrees that staff augmentation services and services performed on a Fixed Fee basis shall be deemed accepted as performed. Unless otherwise indicated in this agreement, Projects shall be deemed accepted upon the earlier of Scale's receipt a signed Project Completion and Acceptance document which has been signed and dated by an authorized representative of CLIENT, or thirty (30) calendar days from the date of the delivery of the final Project deliverable. If acceptance is refused and Scale reasonably confirms a non-conformance, Scale will re-perform the deliverable and resubmit.
2. **Shipment of Product**. All Products delivered to CLIENT hereunder shall be shipped FOB origin, freight collect. Title and risk of loss shall pass to CLIENT at point of origin. Products shall be deemed accepted upon delivery.
3. **Limitations of Warranties. Scale warrants that Services shall be provided by competent personnel in accordance with applicable professional standards. ALL PRODUCTS PROVIDED BY SCALE ARE PROVIDED "AS IS", WITH ALL FAULTS. SCALE MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. ANY AND ALL ORIGINAL EQUIPMENT MANUFACTURER (OEM) WARRANTIES, CERTIFICATIONS AND GUARANTEES, IF ANY, ARE PASSED THROUGH TO CLIENT.**
4. **Intellectual Property**. CLIENT acknowledges that Scale, its vendors, and/or its licensors retain all patents and/or copyrights in and to all proprietary data, processes and programs, if any, provided in connection with Services performed hereunder; any Scale software provided to CLIENT as part of the Services provided shall be subject to the vendor's, licensor's or OEM's copyright and licensing policy. To the extent such software is prepared by Scale, it is provided by nontransferable, nonexclusive license for CLIENT'S internal use only, subject strictly to the terms and conditions of this Agreement, and shall terminate upon termination or expiration of this Agreement. CLIENT shall not duplicate, use or disclose for the benefit of third parties, reverse engineer or decompile any such software.
5. **Confidential Information.** The parties agree that Confidential Information means any information disclosed by the disclosing party to the receiving party, either directly or indirectly, in writing, orally or by inspection of tangible objects (including without limitation documents, prototypes, samples, plant and equipment, "CLIENT" lists or other "CLIENT" information not known to the public), which is designated as "Confidential," "Proprietary" or some similar designation, or is the type of information which should reasonably be recognized as Confidential or Proprietary. The receiving party shall not use any Confidential Information of the disclosing party for any purpose except to evaluate and engage in discussions concerning this Proposal. Each party agrees to protect the other party's Proprietary and Confidential Information to the same extent that it protects its own Proprietary and Confidential Information but with no less than a reasonable degree of care.
6. **Limitation of Liability.** IN NO EVENT SHALL SCALE BE LIABLE TO CLIENT FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES OF ANY KIND WHATSOEVER, ARISING IN CONTRACT, TORT OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. SCALE'S ENTIRE LIABILITY AND CLIENT'S EXCLUSIVE REMEDY FOR DAMAGES FROM ANY CAUSE WHATSOEVER, INCLUDING, BUT NOT LIMITED TO, NONPERFORMANCE OR MISREPRESENTATION, AND REGARDLESS OF THE FORM OF ACTIONS, SHALL BE LIMITED TO THE AMOUNT WHICH HAS BEEN ACTUALLY PAID TO SCALE BY CLIENT FOR SERVICES AND/OR PERFORMANCE HEREUNDER. Without limiting the foregoing, Scale will have no responsibility for the adequacy or performance of (i) any third-party software provided to Scale under this agreement; (ii) any hardware, and (iii) any services provided by any third party.
7. **Non-Solicitation Provision.** During the term of this agreement and for twelve (12) months thereafter, CLIENT will not solicit for a permanent or other position any employee or subcontractor of the other party to whom that party was introduced as a result of this agreement. Should CLIENT solicit and/or hire an employee or contractor from SCALE, CLIENT shall pay to SCALE an administrative fee equal to 1 year's salary of the employee's new salary at CLIENT.
8. **Export Law Compliance.** CLIENT has been advised that all Products purchased hereunder, and Scale Confidential Information is subject to the U.S. Export Administration Regulations. CLIENT agrees to comply with all applicable United States export control laws, and regulations, as from time to time amended, including without limitation, the laws and regulations administered by the United States Department of Commerce and the United States Department of State.
9. **Force Majeure.** Neither party shall be liable for any failure or delay in performance of its obligations hereunder where such performance is prevented or delayed by causes beyond its reasonable control, including without limitation, flood, war, embargo, strike or other labor dispute, riot, acts of God or the intervention of any government authority.
10. **Choice of Law and Venue.** The parties will attempt to settle any claim or controversy arising under this agreement through consultation and negotiation in good faith and a spirit of mutual cooperation. This agreement and all matters relating thereto shall be governed exclusively by the substantive law of the State of Michigan. Any dispute relating directly or indirectly to this agreement or any other contract or agreement between the parties which cannot be resolved through the process of consultation and negotiation shall be brought in a court of competent jurisdiction in Livingston County, Michigan, that being the exclusive venue for any dispute between or any claims held by any of the parties to this agreement.
11. **Miscellaneous.** This agreement constitutes the entire agreement of the parties and supersedes all prior written or oral agreements, representations and understandings relating to the subject matter hereof, with the exception of a valid Master Services and Product Agreement between the parties under the terms of which this agreement shall be incorporated. This agreement shall not be amended or modified except by written instrument signed by the parties. Should additional work beyond the scope of the Services detailed herein by Scale be requested by CLIENT, fees for such additional Services will be negotiated with CLIENT prior to performing such work and will be memorialized in writing between the Parties by utilizing a Project Change Request form ("PCR") or an additional agreement as appropriate. Scale will invoice CLIENT for any additional work performed and expenses incurred which are not described in this agreement. The Parties agree that neither may assign its rights or duties under this contract without the prior written consent of the other Party, which consent shall not be unreasonably withheld.
12. **Severability.** The provisions of this Agreement are severable. If any provision of this Agreement or its application to any person or circumstance is ever held by any court of competent jurisdiction to be invalid for any reason, the remainder of this Agreement and the application of such provision or part of this Agreement to other persons or circumstances shall not be affected.

##### 7. AUTHORIZATION TO PROCEED

The use of signatures on this Proposal is to ensure agreement on project objectives and the work to be performed by Scale. Scale signature signifies our commitment to proceed with the project as described in this document. Please review this document thoroughly, as it will be the basis for all work performed by Scale on this project. This Proposal is valid for a period of sixty (60) days from the date that this proposal is provided by Scale to CLIENT unless otherwise agreed to by both parties.

##### AlixPartners Representative

Signature Date

Printed Name

Invoice/Bill to Address

##### Scale Technology Group Representative:

Signature Date

Printed Name & Title

*Please sign and return the entire document to Scale Technology Group.*

*Thank you.* **SCALE TECHNOLOGY GROUP – YOUR BUSINESS AT SCALE**
