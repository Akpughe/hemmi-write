drop extension if exists "pg_net";


  create table "public"."ai_detection_results" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "provider" text not null,
    "overall_score" numeric(4,3) not null,
    "verdict" text not null,
    "spans" jsonb not null default '[]'::jsonb,
    "content_hash" text not null,
    "content_length" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_detection_results" enable row level security;


  create table "public"."quality_findings" (
    "id" uuid not null default gen_random_uuid(),
    "review_id" uuid not null,
    "severity" text not null,
    "summary" text not null,
    "reasoning" text,
    "excerpt_html" text not null,
    "replacement_html" text,
    "tags" text[] default ARRAY[]::text[],
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
      );


alter table "public"."quality_findings" enable row level security;


  create table "public"."quality_reviews" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "section_id" text not null,
    "section_title" text,
    "overall_score" integer,
    "status" text not null default 'running'::text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quality_reviews" enable row level security;

alter table "public"."generated_documents" add column "content_hash" text;

alter table "public"."generated_documents" add column "detection_score" numeric(4,3);

alter table "public"."generated_documents" add column "detection_verdict" text;

alter table "public"."generated_documents" add column "last_detection_run_at" timestamp with time zone;

alter table "public"."generated_documents" add column "last_quality_check_at" timestamp with time zone;

alter table "public"."generated_documents" add column "quality_score" integer;

alter table "public"."generated_documents" add column "quality_status" text;

CREATE UNIQUE INDEX ai_detection_results_pkey ON public.ai_detection_results USING btree (id);

CREATE UNIQUE INDEX ai_detection_results_unique_document ON public.ai_detection_results USING btree (document_id);

CREATE INDEX idx_ai_detection_results_content_hash ON public.ai_detection_results USING btree (content_hash);

CREATE INDEX idx_ai_detection_results_document_id ON public.ai_detection_results USING btree (document_id);

CREATE INDEX idx_ai_detection_results_verdict ON public.ai_detection_results USING btree (verdict);

CREATE INDEX idx_generated_documents_detection_run ON public.generated_documents USING btree (last_detection_run_at) WHERE (last_detection_run_at IS NOT NULL);

CREATE INDEX idx_generated_documents_detection_verdict ON public.generated_documents USING btree (detection_verdict) WHERE (detection_verdict IS NOT NULL);

CREATE INDEX idx_generated_documents_quality_check ON public.generated_documents USING btree (last_quality_check_at) WHERE (last_quality_check_at IS NOT NULL);

CREATE INDEX idx_generated_documents_quality_score ON public.generated_documents USING btree (quality_score) WHERE (quality_score IS NOT NULL);

CREATE INDEX idx_quality_findings_review_id ON public.quality_findings USING btree (review_id);

CREATE INDEX idx_quality_findings_severity ON public.quality_findings USING btree (severity);

CREATE INDEX idx_quality_findings_status ON public.quality_findings USING btree (status);

CREATE INDEX idx_quality_reviews_document_id ON public.quality_reviews USING btree (document_id);

CREATE INDEX idx_quality_reviews_section_id ON public.quality_reviews USING btree (section_id);

CREATE INDEX idx_quality_reviews_status ON public.quality_reviews USING btree (status);

CREATE UNIQUE INDEX quality_findings_pkey ON public.quality_findings USING btree (id);

CREATE UNIQUE INDEX quality_reviews_pkey ON public.quality_reviews USING btree (id);

CREATE UNIQUE INDEX quality_reviews_unique_section ON public.quality_reviews USING btree (document_id, section_id);

alter table "public"."ai_detection_results" add constraint "ai_detection_results_pkey" PRIMARY KEY using index "ai_detection_results_pkey";

alter table "public"."quality_findings" add constraint "quality_findings_pkey" PRIMARY KEY using index "quality_findings_pkey";

alter table "public"."quality_reviews" add constraint "quality_reviews_pkey" PRIMARY KEY using index "quality_reviews_pkey";

alter table "public"."ai_detection_results" add constraint "ai_detection_results_content_hash_length" CHECK ((char_length(content_hash) = 64)) not valid;

alter table "public"."ai_detection_results" validate constraint "ai_detection_results_content_hash_length";

alter table "public"."ai_detection_results" add constraint "ai_detection_results_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.generated_documents(id) ON DELETE CASCADE not valid;

alter table "public"."ai_detection_results" validate constraint "ai_detection_results_document_id_fkey";

alter table "public"."ai_detection_results" add constraint "ai_detection_results_overall_score_check" CHECK (((overall_score >= (0)::numeric) AND (overall_score <= (1)::numeric))) not valid;

alter table "public"."ai_detection_results" validate constraint "ai_detection_results_overall_score_check";

alter table "public"."ai_detection_results" add constraint "ai_detection_results_provider_check" CHECK ((provider = ANY (ARRAY['heuristic'::text, 'openai'::text, 'custom'::text]))) not valid;

alter table "public"."ai_detection_results" validate constraint "ai_detection_results_provider_check";

alter table "public"."ai_detection_results" add constraint "ai_detection_results_verdict_check" CHECK ((verdict = ANY (ARRAY['likely-human'::text, 'likely-ai'::text, 'inconclusive'::text]))) not valid;

alter table "public"."ai_detection_results" validate constraint "ai_detection_results_verdict_check";

alter table "public"."generated_documents" add constraint "generated_documents_content_hash_check" CHECK (((content_hash IS NULL) OR (char_length(content_hash) = 64))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_content_hash_check";

alter table "public"."generated_documents" add constraint "generated_documents_detection_score_check" CHECK (((detection_score IS NULL) OR ((detection_score >= (0)::numeric) AND (detection_score <= (1)::numeric)))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_detection_score_check";

alter table "public"."generated_documents" add constraint "generated_documents_detection_verdict_check" CHECK (((detection_verdict IS NULL) OR (detection_verdict = ANY (ARRAY['likely-human'::text, 'likely-ai'::text, 'inconclusive'::text])))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_detection_verdict_check";

alter table "public"."generated_documents" add constraint "generated_documents_quality_score_check" CHECK (((quality_score IS NULL) OR ((quality_score >= 1) AND (quality_score <= 10)))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_quality_score_check";

alter table "public"."generated_documents" add constraint "generated_documents_quality_status_check" CHECK (((quality_status IS NULL) OR (quality_status = ANY (ARRAY['running'::text, 'completed'::text, 'error'::text])))) not valid;

alter table "public"."generated_documents" validate constraint "generated_documents_quality_status_check";

alter table "public"."quality_findings" add constraint "quality_findings_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.quality_reviews(id) ON DELETE CASCADE not valid;

alter table "public"."quality_findings" validate constraint "quality_findings_review_id_fkey";

alter table "public"."quality_findings" add constraint "quality_findings_severity_check" CHECK ((severity = ANY (ARRAY['critical'::text, 'important'::text, 'minor'::text]))) not valid;

alter table "public"."quality_findings" validate constraint "quality_findings_severity_check";

alter table "public"."quality_findings" add constraint "quality_findings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'dismissed'::text]))) not valid;

alter table "public"."quality_findings" validate constraint "quality_findings_status_check";

alter table "public"."quality_findings" add constraint "quality_findings_summary_length" CHECK (((char_length(summary) >= 1) AND (char_length(summary) <= 1000))) not valid;

alter table "public"."quality_findings" validate constraint "quality_findings_summary_length";

alter table "public"."quality_reviews" add constraint "quality_reviews_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.generated_documents(id) ON DELETE CASCADE not valid;

alter table "public"."quality_reviews" validate constraint "quality_reviews_document_id_fkey";

alter table "public"."quality_reviews" add constraint "quality_reviews_overall_score_check" CHECK (((overall_score >= 1) AND (overall_score <= 10))) not valid;

alter table "public"."quality_reviews" validate constraint "quality_reviews_overall_score_check";

alter table "public"."quality_reviews" add constraint "quality_reviews_section_id_length" CHECK (((char_length(section_id) >= 1) AND (char_length(section_id) <= 500))) not valid;

alter table "public"."quality_reviews" validate constraint "quality_reviews_section_id_length";

alter table "public"."quality_reviews" add constraint "quality_reviews_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'error'::text]))) not valid;

alter table "public"."quality_reviews" validate constraint "quality_reviews_status_check";

grant delete on table "public"."ai_detection_results" to "anon";

grant insert on table "public"."ai_detection_results" to "anon";

grant references on table "public"."ai_detection_results" to "anon";

grant select on table "public"."ai_detection_results" to "anon";

grant trigger on table "public"."ai_detection_results" to "anon";

grant truncate on table "public"."ai_detection_results" to "anon";

grant update on table "public"."ai_detection_results" to "anon";

grant delete on table "public"."ai_detection_results" to "authenticated";

grant insert on table "public"."ai_detection_results" to "authenticated";

grant references on table "public"."ai_detection_results" to "authenticated";

grant select on table "public"."ai_detection_results" to "authenticated";

grant trigger on table "public"."ai_detection_results" to "authenticated";

grant truncate on table "public"."ai_detection_results" to "authenticated";

grant update on table "public"."ai_detection_results" to "authenticated";

grant delete on table "public"."ai_detection_results" to "service_role";

grant insert on table "public"."ai_detection_results" to "service_role";

grant references on table "public"."ai_detection_results" to "service_role";

grant select on table "public"."ai_detection_results" to "service_role";

grant trigger on table "public"."ai_detection_results" to "service_role";

grant truncate on table "public"."ai_detection_results" to "service_role";

grant update on table "public"."ai_detection_results" to "service_role";

grant delete on table "public"."quality_findings" to "anon";

grant insert on table "public"."quality_findings" to "anon";

grant references on table "public"."quality_findings" to "anon";

grant select on table "public"."quality_findings" to "anon";

grant trigger on table "public"."quality_findings" to "anon";

grant truncate on table "public"."quality_findings" to "anon";

grant update on table "public"."quality_findings" to "anon";

grant delete on table "public"."quality_findings" to "authenticated";

grant insert on table "public"."quality_findings" to "authenticated";

grant references on table "public"."quality_findings" to "authenticated";

grant select on table "public"."quality_findings" to "authenticated";

grant trigger on table "public"."quality_findings" to "authenticated";

grant truncate on table "public"."quality_findings" to "authenticated";

grant update on table "public"."quality_findings" to "authenticated";

grant delete on table "public"."quality_findings" to "service_role";

grant insert on table "public"."quality_findings" to "service_role";

grant references on table "public"."quality_findings" to "service_role";

grant select on table "public"."quality_findings" to "service_role";

grant trigger on table "public"."quality_findings" to "service_role";

grant truncate on table "public"."quality_findings" to "service_role";

grant update on table "public"."quality_findings" to "service_role";

grant delete on table "public"."quality_reviews" to "anon";

grant insert on table "public"."quality_reviews" to "anon";

grant references on table "public"."quality_reviews" to "anon";

grant select on table "public"."quality_reviews" to "anon";

grant trigger on table "public"."quality_reviews" to "anon";

grant truncate on table "public"."quality_reviews" to "anon";

grant update on table "public"."quality_reviews" to "anon";

grant delete on table "public"."quality_reviews" to "authenticated";

grant insert on table "public"."quality_reviews" to "authenticated";

grant references on table "public"."quality_reviews" to "authenticated";

grant select on table "public"."quality_reviews" to "authenticated";

grant trigger on table "public"."quality_reviews" to "authenticated";

grant truncate on table "public"."quality_reviews" to "authenticated";

grant update on table "public"."quality_reviews" to "authenticated";

grant delete on table "public"."quality_reviews" to "service_role";

grant insert on table "public"."quality_reviews" to "service_role";

grant references on table "public"."quality_reviews" to "service_role";

grant select on table "public"."quality_reviews" to "service_role";

grant trigger on table "public"."quality_reviews" to "service_role";

grant truncate on table "public"."quality_reviews" to "service_role";

grant update on table "public"."quality_reviews" to "service_role";


  create policy "ai_detection_results_delete_own"
  on "public"."ai_detection_results"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "ai_detection_results_insert_own"
  on "public"."ai_detection_results"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "ai_detection_results_select_own"
  on "public"."ai_detection_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (writing_projects.user_id = auth.uid()) AND (writing_projects.deleted_at IS NULL)))));



  create policy "ai_detection_results_select_public"
  on "public"."ai_detection_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.public_documents ON ((public_documents.project_id = writing_projects.id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (public_documents.is_active = true) AND (public_documents.moderation_status = 'approved'::text)))));



  create policy "ai_detection_results_select_shared"
  on "public"."ai_detection_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.shared_links ON ((shared_links.project_id = writing_projects.id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (shared_links.is_active = true) AND ((shared_links.expires_at IS NULL) OR (shared_links.expires_at > now()))))));



  create policy "ai_detection_results_update_own"
  on "public"."ai_detection_results"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = ai_detection_results.document_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_findings_delete_own"
  on "public"."quality_findings"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_findings_insert_own"
  on "public"."quality_findings"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM ((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_findings_select_own"
  on "public"."quality_findings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (writing_projects.user_id = auth.uid()) AND (writing_projects.deleted_at IS NULL)))));



  create policy "quality_findings_select_public"
  on "public"."quality_findings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.public_documents ON ((public_documents.project_id = writing_projects.id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (public_documents.is_active = true) AND (public_documents.moderation_status = 'approved'::text)))));



  create policy "quality_findings_select_shared"
  on "public"."quality_findings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.shared_links ON ((shared_links.project_id = writing_projects.id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (shared_links.is_active = true) AND ((shared_links.expires_at IS NULL) OR (shared_links.expires_at > now()))))));



  create policy "quality_findings_update_own"
  on "public"."quality_findings"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.quality_reviews
     JOIN public.generated_documents ON ((generated_documents.id = quality_reviews.document_id)))
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((quality_reviews.id = quality_findings.review_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_reviews_delete_own"
  on "public"."quality_reviews"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_reviews_insert_own"
  on "public"."quality_reviews"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (writing_projects.user_id = auth.uid())))));



  create policy "quality_reviews_select_own"
  on "public"."quality_reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (writing_projects.user_id = auth.uid()) AND (writing_projects.deleted_at IS NULL)))));



  create policy "quality_reviews_select_public"
  on "public"."quality_reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.public_documents ON ((public_documents.project_id = writing_projects.id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (public_documents.is_active = true) AND (public_documents.moderation_status = 'approved'::text)))));



  create policy "quality_reviews_select_shared"
  on "public"."quality_reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
     JOIN public.shared_links ON ((shared_links.project_id = writing_projects.id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (shared_links.is_active = true) AND ((shared_links.expires_at IS NULL) OR (shared_links.expires_at > now()))))));



  create policy "quality_reviews_update_own"
  on "public"."quality_reviews"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.generated_documents
     JOIN public.writing_projects ON ((writing_projects.id = generated_documents.project_id)))
  WHERE ((generated_documents.id = quality_reviews.document_id) AND (writing_projects.user_id = auth.uid())))));



