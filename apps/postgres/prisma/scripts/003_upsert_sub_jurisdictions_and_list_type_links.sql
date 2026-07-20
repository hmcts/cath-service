-- Ensure all sub-jurisdictions exist and all list type → sub-jurisdiction links are in place.
-- Safe to re-run (fully idempotent via ON CONFLICT DO NOTHING / DO UPDATE).

-- Step 0: Upsert parent jurisdictions (required FK for sub-jurisdictions)
INSERT INTO jurisdiction (jurisdiction_id, name, welsh_name)
VALUES
  (1, 'Civil',     'Sifil'),
  (2, 'Family',    'Teulu'),
  (3, 'Crime',     'Trosedd'),
  (4, 'Tribunal',  'Tribiwnlys')
ON CONFLICT (jurisdiction_id) DO UPDATE SET
  name       = EXCLUDED.name,
  welsh_name = EXCLUDED.welsh_name;

-- Step 1: Upsert all sub-jurisdictions
-- Jurisdiction IDs: 1=Civil, 2=Family, 3=Crime, 4=Tribunal
INSERT INTO sub_jurisdiction (sub_jurisdiction_id, name, welsh_name, jurisdiction_id)
VALUES
  (1,  'Civil Court',                                                        'Llys Sifil',                                                                                       1),
  (2,  'Family Court',                                                       'Llys Teulu',                                                                                       2),
  (3,  'Employment Tribunal',                                                'Tribiwnlys Cyflogaeth',                                                                             4),
  (4,  'Crown Court',                                                        'Llys y Goron',                                                                                     3),
  (5,  'Court of Appeal (Civil Division)',                                   'Y Llys Apêl (Adran Sifil)',                                                                        1),
  (6,  'Immigration and Asylum Chamber',                                     'Siambr Mewnfudo a Lloches',                                                                        4),
  (7,  'Magistrates Court',                                                  'Llys Ynadon',                                                                                      3),
  (8,  'Social Security and Child Support',                                  'Tribiwnlys Nawdd Cymdeithasol a Chynnal Plant',                                                     4),
  (9,  'Care Standards Tribunal',                                            'Tribiwnlys Safonau Gofal',                                                                         4),
  (10, 'High Court',                                                         'Yr Uchel Lys',                                                                                     1),
  (11, 'High Court of the Family Division',                                  'Adran Deulu yr Uchel Lys',                                                                         2),
  (12, 'Court of Appeal (Criminal Division)',                                'Y Llys Apêl (Adran Troseddol)',                                                                    3),
  (13, 'Asylum Support Tribunal',                                            'Tribiwnlys Cefnogi Ceiswyr Lloches',                                                               4),
  (14, 'Criminal Injuries Compensation Tribunal',                            'Tribiwnlys Digolledu am Anafiadau Troseddol',                                                      4),
  (15, 'First-Tier Tribunal (Land Registration Tribunal)',                   'Tribiwnlys Haen Gyntaf (Tribiwnlys Cofrestru Tir)',                                                4),
  (16, 'First-Tier Tribunal (Tax Chamber)',                                  'Tribiwnlys Haen Gyntaf (Siambr Treth)',                                                            4),
  (17, 'First-Tier Tribunal (War Pensions and Armed Forces Compensation)',   'Tribiwnlys Haen Gyntaf (Iawndal Pensiynau Rhyfel a''r Lluoedd Arfog)',                             4),
  (18, 'First-tier Tribunal (Special Educational Needs and Disability)',     'Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)',                                 4),
  (19, 'General Regulatory Chamber',                                         'Siambr Rheoleiddio Cyffredinol',                                                                   4),
  (20, 'Mental Health Tribunal',                                             'Tribiwnlys Iechyd Meddwl',                                                                         4),
  (21, 'Pathogens Access Appeal Commission',                                 'Comisiwn Apeliadau Mynediad Pathogenau',                                                           4),
  (22, 'Primary Health Tribunal',                                            'Tribiwnlys Iechyd Sylfaenol',                                                                      4),
  (23, 'Proscribed Organisations Appeal Commission',                         'Comisiwn Apeliadau Sefydliadau Gwaharddedig',                                                      4),
  (24, 'Residential Property Tribunal',                                      'Tribiwnlys Eiddo Preswyl',                                                                         4),
  (25, 'Special Immigration Appeals Commission',                             'Comisiwn Apeliadau Mewnfudo Arbennig',                                                             4),
  (26, 'Upper Tribunal (Administrative Appeals Chamber)',                    'Uwch Dribiwnlys (Siambr Apeliadau Gweinyddol)',                                                    4),
  (27, 'Upper Tribunal (Immigration and Asylum) - Judicial Review',          'Siambr Uwch Dribiwnlys (Mewnfudo a Lloches) - Adolygiadau Barnwrol',                              4),
  (28, 'Upper Tribunal (Immigration and Asylum) - Statutory Appeal',         'Siambr Uwch Dribiwnlys (Mewnfudo a Lloches) - Apeliadau Statudol',                               4),
  (29, 'Upper Tribunal (Lands Chamber)',                                     'Uwch Dribiwnlys (Siambr Tiroedd)',                                                                 4),
  (30, 'Upper Tribunal (Tax and Chancery Chamber)',                          'Uwch Dribiwnlys (Siambr Treth a Siawnsri)',                                                        4)
ON CONFLICT (sub_jurisdiction_id) DO UPDATE SET
  name           = EXCLUDED.name,
  welsh_name     = EXCLUDED.welsh_name,
  jurisdiction_id = EXCLUDED.jurisdiction_id;

-- Step 2: Link each list type to its sub-jurisdiction(s)
-- Derived from listTypeData.subJurisdictionIds in libs/list-types/common/src/list-type-data.ts
-- Uses INSERT ... ON CONFLICT DO NOTHING so re-runs are safe and existing links are preserved.
INSERT INTO list_types_sub_jurisdictions (list_type_id, sub_jurisdiction_id)
SELECT lt.id, sj.sub_jurisdiction_id
FROM (VALUES
  -- CIVIL_DAILY_CAUSE_LIST → Civil Court (1)
  ('CIVIL_DAILY_CAUSE_LIST',                                              1),
  -- FAMILY_DAILY_CAUSE_LIST → Family Court (2)
  ('FAMILY_DAILY_CAUSE_LIST',                                             2),
  -- MAGISTRATES_PUBLIC_LIST → Magistrates Court (7)
  ('MAGISTRATES_PUBLIC_LIST',                                             7),
  -- CROWN_WARNED_LIST → Crown Court (4)
  ('CROWN_WARNED_LIST',                                                   4),
  -- CROWN_DAILY_LIST → Crown Court (4)
  ('CROWN_DAILY_LIST',                                                    4),
  -- CROWN_FIRM_LIST → Crown Court (4)
  ('CROWN_FIRM_LIST',                                                     4),
  -- CIVIL_AND_FAMILY_DAILY_CAUSE_LIST → Civil Court (1), Family Court (2)
  ('CIVIL_AND_FAMILY_DAILY_CAUSE_LIST',                                   1),
  ('CIVIL_AND_FAMILY_DAILY_CAUSE_LIST',                                   2),
  -- CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST → Care Standards Tribunal (9)
  ('CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST',                         9),
  -- MENTAL_HEALTH_TRIBUNAL_HEARING_LIST → Mental Health Tribunal (20)
  ('MENTAL_HEALTH_TRIBUNAL_HEARING_LIST',                                 20),
  -- CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST → Civil Court (1)
  ('CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST',                                   1),
  -- COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST → Civil Court (1)
  ('COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST',                          1),
  -- COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST → Court of Appeal (Criminal Division) (12)
  ('COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST',                           12),
  -- FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST → Family Court (2)
  ('FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST',                         2),
  -- KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST → Civil Court (1)
  ('KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST',                               1),
  -- KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST → Civil Court (1)
  ('KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST',                                1),
  -- MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST → Civil Court (1)
  ('MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST',                                   1),
  -- SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST → Civil Court (1)
  ('SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST',                         1),
  -- LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST → Civil Court (1)
  ('LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST',                        1),
  -- COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST → Court of Appeal (Civil Division) (5)
  ('COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST',                              5),
  -- BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST → Civil Court (1)
  ('BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST',                    1),
  -- LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST → Civil Court (1)
  ('LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST',                         1),
  -- BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST → Civil Court (1)
  ('BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST',               1),
  -- MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST → Civil Court (1)
  ('MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST',                    1),
  -- SJP_PRESS_LIST → Magistrates Court (7)
  ('SJP_PRESS_LIST',                                                      7),
  -- SJP_PUBLIC_LIST → Magistrates Court (7)
  ('SJP_PUBLIC_LIST',                                                     7),
  -- SJP_DELTA_PRESS_LIST → Magistrates Court (7)
  ('SJP_DELTA_PRESS_LIST',                                                7),
  -- SJP_DELTA_PUBLIC_LIST → Magistrates Court (7)
  ('SJP_DELTA_PUBLIC_LIST',                                               7),
  -- SIAC_WEEKLY_HEARING_LIST → Special Immigration Appeals Commission (25)
  ('SIAC_WEEKLY_HEARING_LIST',                                            25),
  -- POAC_WEEKLY_HEARING_LIST → Proscribed Organisations Appeal Commission (23)
  ('POAC_WEEKLY_HEARING_LIST',                                            23),
  -- PAAC_WEEKLY_HEARING_LIST → Pathogens Access Appeal Commission (21)
  ('PAAC_WEEKLY_HEARING_LIST',                                            21),
  -- FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST → First-Tier Tribunal (Tax Chamber) (16)
  ('FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST',                                 16),
  -- FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST → First-Tier Tribunal (Land Registration) (15)
  ('FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST',                 15),
  -- FTT_RPT_EASTERN_WEEKLY_HEARING_LIST → Residential Property Tribunal (24)
  ('FTT_RPT_EASTERN_WEEKLY_HEARING_LIST',                                 24),
  -- FTT_RPT_LONDON_WEEKLY_HEARING_LIST → Residential Property Tribunal (24)
  ('FTT_RPT_LONDON_WEEKLY_HEARING_LIST',                                  24),
  -- FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST → Residential Property Tribunal (24)
  ('FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST',                                24),
  -- FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST → Residential Property Tribunal (24)
  ('FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST',                                24),
  -- FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST → Residential Property Tribunal (24)
  ('FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST',                                24),
  -- SEND_DAILY_HEARING_LIST → First-tier Tribunal (SEND) (18)
  ('SEND_DAILY_HEARING_LIST',                                             18),
  -- CIC_WEEKLY_HEARING_LIST → Criminal Injuries Compensation Tribunal (14)
  ('CIC_WEEKLY_HEARING_LIST',                                             14),
  -- AST_DAILY_HEARING_LIST → Asylum Support Tribunal (13)
  ('AST_DAILY_HEARING_LIST',                                              13),
  -- GRC_WEEKLY_HEARING_LIST → General Regulatory Chamber (19)
  ('GRC_WEEKLY_HEARING_LIST',                                             19),
  -- WPAFCC_WEEKLY_HEARING_LIST → First-Tier Tribunal (War Pensions and Armed Forces Compensation) (17)
  ('WPAFCC_WEEKLY_HEARING_LIST',                                          17),
  -- UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST → Upper Tribunal (IA) - Statutory Appeal (28)
  ('UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST',                           28),
  -- UTIAC_JR_LONDON_DAILY_HEARING_LIST → Upper Tribunal (IA) - Judicial Review (27)
  ('UTIAC_JR_LONDON_DAILY_HEARING_LIST',                                  27),
  -- UTIAC_JR_LEEDS_DAILY_HEARING_LIST → Upper Tribunal (IA) - Judicial Review (27)
  ('UTIAC_JR_LEEDS_DAILY_HEARING_LIST',                                   27),
  -- UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST → Upper Tribunal (IA) - Judicial Review (27)
  ('UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST',                              27),
  -- UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST → Upper Tribunal (IA) - Judicial Review (27)
  ('UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST',                              27),
  -- UTIAC_JR_CARDIFF_DAILY_HEARING_LIST → Upper Tribunal (IA) - Judicial Review (27)
  ('UTIAC_JR_CARDIFF_DAILY_HEARING_LIST',                                 27),
  -- SSCS_MIDLANDS_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_MIDLANDS_DAILY_HEARING_LIST',                                    8),
  -- SSCS_SOUTH_EAST_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_SOUTH_EAST_DAILY_HEARING_LIST',                                  8),
  -- SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST',                        8),
  -- SSCS_SCOTLAND_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_SCOTLAND_DAILY_HEARING_LIST',                                    8),
  -- SSCS_NORTH_EAST_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_NORTH_EAST_DAILY_HEARING_LIST',                                  8),
  -- SSCS_NORTH_WEST_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_NORTH_WEST_DAILY_HEARING_LIST',                                  8),
  -- SSCS_LONDON_DAILY_HEARING_LIST → Social Security and Child Support (8)
  ('SSCS_LONDON_DAILY_HEARING_LIST',                                      8),
  -- MAGISTRATES_STANDARD_LIST → Magistrates Court (7)
  ('MAGISTRATES_STANDARD_LIST',                                           7),
  -- UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST → Upper Tribunal (Tax and Chancery Chamber) (30)
  ('UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST',                      30),
  -- UT_LANDS_CHAMBER_DAILY_HEARING_LIST → Upper Tribunal (Lands Chamber) (29)
  ('UT_LANDS_CHAMBER_DAILY_HEARING_LIST',                                 29),
  -- UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST → Upper Tribunal (Administrative Appeals Chamber) (26)
  ('UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST',                26)
) AS mapping(list_type_name, sub_jurisdiction_id)
JOIN list_types lt ON lt.name = mapping.list_type_name
JOIN sub_jurisdiction sj ON sj.sub_jurisdiction_id = mapping.sub_jurisdiction_id
ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;

-- Verify: show all list types with their linked sub-jurisdictions
-- SELECT lt.name, sj.name AS sub_jurisdiction
-- FROM list_types lt
-- JOIN list_types_sub_jurisdictions ltsj ON ltsj.list_type_id = lt.id
-- JOIN sub_jurisdiction sj ON sj.sub_jurisdiction_id = ltsj.sub_jurisdiction_id
-- ORDER BY lt.name, sj.name;
