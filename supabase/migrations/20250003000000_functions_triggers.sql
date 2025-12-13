-- Auto-Update Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_writing_projects_updated_at
  BEFORE UPDATE ON writing_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_sources_updated_at
  BEFORE UPDATE ON research_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_structures_updated_at
  BEFORE UPDATE ON document_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_sections_updated_at
  BEFORE UPDATE ON document_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citations_updated_at
  BEFORE UPDATE ON citations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_documents_updated_at
  BEFORE UPDATE ON public_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-Create User Profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enforce Single Current Structure
CREATE OR REPLACE FUNCTION enforce_single_current_structure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE document_structures
    SET is_current = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_current_structure
  BEFORE INSERT OR UPDATE ON document_structures
  FOR EACH ROW WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION enforce_single_current_structure();

-- Enforce Single Current Document
CREATE OR REPLACE FUNCTION enforce_single_current_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE generated_documents
    SET is_current = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_current_document
  BEFORE INSERT OR UPDATE ON generated_documents
  FOR EACH ROW WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION enforce_single_current_document();

-- Share Link Token Generation
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN substring(
    replace(
      replace(
        encode(gen_random_bytes(24), 'base64'),
        '/', '_'
      ),
      '+', '-'
    )
    from 1 for 32
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL OR NEW.share_token = '' THEN
    NEW.share_token = generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shared_links_token
  BEFORE INSERT ON shared_links
  FOR EACH ROW EXECUTE FUNCTION set_share_token();

-- Increment Share Link Views
CREATE OR REPLACE FUNCTION increment_share_view(share_token_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE shared_links
  SET
    current_views = current_views + 1,
    last_accessed_at = NOW()
  WHERE share_token = share_token_param
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
