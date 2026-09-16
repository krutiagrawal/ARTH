-- CreateEnum
CREATE TYPE "NgoOrgType" AS ENUM ('trust', 'society', 'section8_company', 'registered_nonprofit', 'other');

-- CreateEnum
CREATE TYPE "NgoDocumentType" AS ENUM ('registration_certificate', 'twelve_a_certificate', 'eighty_g_certificate', 'fcra_certificate', 'csr1_certificate', 'authorization_proof', 'past_work_photo');

-- AlterTable
ALTER TABLE "ngo_profiles" ADD COLUMN     "annual_report_links" TEXT[],
ADD COLUMN     "arth_usage_goals" TEXT[],
ADD COLUMN     "conducts_plantation_drives" BOOLEAN,
ADD COLUMN     "csr1_registration_number" TEXT,
ADD COLUMN     "does_post_plantation_maintenance" BOOLEAN,
ADD COLUMN     "drive_report_links" TEXT[],
ADD COLUMN     "drives_conducted_historical" INTEGER,
ADD COLUMN     "eighty_g_registration_number" TEXT,
ADD COLUMN     "environmental_work_since_year" INTEGER,
ADD COLUMN     "expected_drives_per_year" INTEGER,
ADD COLUMN     "fcra_registration_number" TEXT,
ADD COLUMN     "impact_report_links" TEXT[],
ADD COLUMN     "line1" TEXT,
ADD COLUMN     "major_projects_description" TEXT,
ADD COLUMN     "media_coverage_links" TEXT[],
ADD COLUMN     "monitors_survival_post_planting" BOOLEAN,
ADD COLUMN     "ngo_darpan_id" TEXT,
ADD COLUMN     "office_bearers" JSONB,
ADD COLUMN     "official_email" TEXT,
ADD COLUMN     "operating_cities" TEXT[],
ADD COLUMN     "operating_states" TEXT[],
ADD COLUMN     "org_type" "NgoOrgType",
ADD COLUMN     "pan_number" TEXT,
ADD COLUMN     "participant_types" TEXT[],
ADD COLUMN     "plantation_verification_method" TEXT,
ADD COLUMN     "previous_project_links" TEXT[],
ADD COLUMN     "primary_contact_designation" TEXT,
ADD COLUMN     "primary_contact_email" TEXT,
ADD COLUMN     "primary_contact_name" TEXT,
ADD COLUMN     "primary_contact_phone" TEXT,
ADD COLUMN     "primary_work_areas" TEXT[],
ADD COLUMN     "project_page_links" TEXT[],
ADD COLUMN     "registration_authority" TEXT,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "sapling_source_description" TEXT,
ADD COLUMN     "social_media_links" TEXT[],
ADD COLUMN     "social_media_post_links" TEXT[],
ADD COLUMN     "species_commonly_planted" TEXT,
ADD COLUMN     "trees_planted_historical" INTEGER,
ADD COLUMN     "twelve_a_registration_number" TEXT,
ADD COLUMN     "typical_drive_locations" TEXT,
ADD COLUMN     "typical_saplings_per_drive" TEXT;

-- CreateTable
CREATE TABLE "ngo_verification_documents" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "doc_type" "NgoDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngo_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ngo_verification_documents_ngo_id_idx" ON "ngo_verification_documents"("ngo_id");

-- CreateIndex
CREATE INDEX "ngo_verification_documents_ngo_id_doc_type_idx" ON "ngo_verification_documents"("ngo_id", "doc_type");

-- AddForeignKey
ALTER TABLE "ngo_verification_documents" ADD CONSTRAINT "ngo_verification_documents_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
