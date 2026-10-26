/**
 * A small, static subset of common ICD-10 diagnosis codes used by the
 * searchable code picker on the CPOE / diagnosis surface.
 *
 * This is intentionally a curated common-conditions list, not the full WHO
 * classification (tens of thousands of codes). Coding stays optional and
 * additive: a clinician may pick a code here or keep typing free text.
 */

export interface Icd10Code {
    code: string;
    description: string;
}

/** A common-subset ICD-10 list for primary / general-hospital use. */
export const ICD10_CODES: Icd10Code[] = [
    { code: "A09", description: "Infectious gastroenteritis and colitis, unspecified" },
    { code: "B50.9", description: "Plasmodium falciparum malaria, unspecified" },
    { code: "B54", description: "Unspecified malaria" },
    { code: "A01.0", description: "Typhoid fever" },
    { code: "A15.0", description: "Tuberculosis of lung" },
    { code: "B20", description: "Human immunodeficiency virus [HIV] disease" },
    { code: "J00", description: "Acute nasopharyngitis [common cold]" },
    { code: "J02.9", description: "Acute pharyngitis, unspecified" },
    { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
    { code: "J18.9", description: "Pneumonia, unspecified organism" },
    { code: "J44.9", description: "Chronic obstructive pulmonary disease, unspecified" },
    { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery" },
    { code: "I50.9", description: "Heart failure, unspecified" },
    { code: "I63.9", description: "Cerebral infarction, unspecified" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "E10.9", description: "Type 1 diabetes mellitus without complications" },
    { code: "E66.9", description: "Obesity, unspecified" },
    { code: "E78.5", description: "Hyperlipidemia, unspecified" },
    { code: "D64.9", description: "Anemia, unspecified" },
    { code: "N39.0", description: "Urinary tract infection, site not specified" },
    { code: "N18.9", description: "Chronic kidney disease, unspecified" },
    { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" },
    { code: "K29.70", description: "Gastritis, unspecified, without bleeding" },
    { code: "K59.00", description: "Constipation, unspecified" },
    { code: "R10.9", description: "Unspecified abdominal pain" },
    { code: "R50.9", description: "Fever, unspecified" },
    { code: "R51.9", description: "Headache, unspecified" },
    { code: "R05.9", description: "Cough, unspecified" },
    { code: "R07.9", description: "Chest pain, unspecified" },
    { code: "M54.5", description: "Low back pain" },
    { code: "M79.1", description: "Myalgia" },
    { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
    { code: "F41.9", description: "Anxiety disorder, unspecified" },
    { code: "G43.909", description: "Migraine, unspecified, not intractable, without status migrainosus" },
    { code: "H10.9", description: "Unspecified conjunctivitis" },
    { code: "H52.4", description: "Presbyopia" },
    { code: "H66.90", description: "Otitis media, unspecified, unspecified ear" },
    { code: "L30.9", description: "Dermatitis, unspecified" },
    { code: "S09.90XA", description: "Unspecified injury of head, initial encounter" },
    { code: "T78.40XA", description: "Allergy, unspecified, initial encounter" },
    { code: "Z00.00", description: "General adult medical examination without abnormal findings" },
    { code: "O80", description: "Encounter for full-term uncomplicated delivery" },
    { code: "Z34.90", description: "Encounter for supervision of normal pregnancy, unspecified" },
];
