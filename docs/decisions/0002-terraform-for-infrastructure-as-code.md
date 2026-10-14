# 0002. Terraform for infrastructure as code

- Status: Accepted
- Date: 2026-10-08

## Context
Runway is deployed into AlixPartners' Azure tenant. Delivery happens in two stages: Scale's source control and pipelines run the deployments at first, and both later move to AlixPartners' ownership. The infrastructure definition has to work the same way under both owners and survive the handover.

## Decision
Runway's Azure infrastructure is defined in Terraform. Scale runs it from Scale's tooling at first; the code and state move to AlixPartners at transition.

## Rejected alternatives
- **Bicep** — rejected because it is tied to Azure Resource Manager, whereas Terraform is Scale's working standard *(assumed, needs confirmation)* and gives one explicit state file that can be handed over with the code. Bicep's advantage, being Azure-native and familiar to Microsoft-shop ops teams, did not outweigh this.
- **Manual / portal-configured infrastructure** — rejected because it cannot be reviewed, reproduced across Dev/UAT/Prod, or handed over reliably.

## Consequences
- Terraform state needs a home (an Azure Storage backend in AlixPartners' tenant is the natural choice) and a planned migration at handover.
- AlixPartners' ops team may need Terraform familiarity; include it in the transition plan.
- Follow-up: confirm AlixPartners has no policy mandating Bicep or ARM templates.
