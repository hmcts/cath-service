# Seeded courts vs legacy CaTH court IDs

Source: legacy CaTH reference data export (`referenceData (1).csv`, 367 courts, 686 rows, P&I IDs 1–389; none at or above 100000). Environment: **old CaTH staging** (confirmed by the developer, 2026-11-17). Old CaTH admins chose IDs per environment, so re-check against an old CaTH production export before renumbering anything. Matched on English name, then Welsh name, ignoring case and punctuation. Generated 2026-11-17 for the #1078 report (§1.7, Q1).

| Seeded ID | Seeded name | Legacy P&I ID | Legacy court currently at the seeded ID |
|---|---|---|---|
| 1 | Oxford Combined Court Centre | **no exact match** — nearest: 99 Oxford Magistrates' Court (different court?) | Test Location |
| 2 | Birmingham Civil and Family Justice Centre | 16 | Test Location Other |
| 3 | Manchester Civil Justice Centre | 29 | Test Location Other 2 |
| 4 | Royal Courts of Justice | 109 | Unknown Location |
| 5 | Cardiff Civil and Family Justice Centre | 199 | — |
| 6 | Leeds Combined Court Centre | 267 | — |
| 7 | Bristol Civil and Family Justice Centre | 147 | Liverpool Social Security and Child Support Tribunal |
| 8 | Liverpool Civil and Family Court | 175 | — |
| 9 | Single Justice Procedure | 9 | Single Justice Procedure |
| 10 | Newcastle Combined Court Centre | **no exact match** — nearest: 35 Newcastle Civil & Family Courts and Tribunal Centre, or 232 Newcastle upon Tyne Crown Court and Magistrates' Court | — |
| 11 | Birmingham Crown Court | 316 | — |
| 12 | Birmingham Magistrates' Court | 345 | — |
| 13 | First-tier Tribunal (Special Educational Needs and Disability) | 157 | Slough County Court and Family Court |
| 14 | Criminal Injuries Compensation Tribunal | 119 | High Wycombe Magistrates' Court and County Court |
| 15 | East London Tribunal Service | **no exact match** — nearest: 247 East London Family Court (different court?) | Milton Keynes Magistrates' Court and Family Court |
| 16 | Asylum Support Tribunal | 98 | Birmingham Civil and Family Justice Centre |
| 17 | Midlands Social Security and Child Support Tribunal | 102 | Coventry Magistrates' Court |
| 18 | South East Social Security and Child Support Tribunal | 103 | Nottingham Justice Centre |
| 19 | Wales and South West Social Security and Child Support Tribunal | 104 | Bradford Tribunal Hearing Centre |
| 20 | Scotland Social Security and Child Support Tribunal | 105 | — |
| 21 | North East Social Security and Child Support Tribunal | 106 | Leeds Magistrates Court and Family Court |
| 22 | North West Social Security and Child Support Tribunal | 107 | Glasgow Tribunals Centre |
| 23 | London Social Security and Child Support Tribunal | 108 | Alloa Sheriff Court |
| 24 | Liverpool Social Security and Child Support Tribunal | 7 | Belfast Laganside Court |
| 25 | Primary Health Tribunal | 71 | Hatton Cross Tribunal Hearing Centre |
| 26 | Business and Property Division Rolls Building | 111 — **same court, confirmed** by the developer against its GOV.UK court page (2026-11-17); English and Welsh names differ ("Division"/"Adran" here, "Courts"/"Llysoedd" in old CaTH). GOV.UK shows "Business and Property Courts Rolls Building", matching legacy; renaming the seed is not being pursued for now | Harmondsworth Tribunal Hearing Centre |
| 27 | First-tier Tribunal (Property Chamber) - Residential Property Division | 84 | Manchester Tribunal Hearing Centre |
