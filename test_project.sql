-- Create a test project with some research sources
INSERT INTO writing_projects (id, title, citation_style, created_at) 
VALUES ('test-project-123', 'Test Project', 'APA', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add some test research sources
INSERT INTO research_sources (id, project_id, title, url, author, excerpt, is_selected, position) VALUES
('source-1', 'test-project-123', 'Test Article 1', 'https://example.com/article1', 'John Doe', 'This is a test excerpt for article 1', true, 0),
('source-2', 'test-project-123', 'Test Article 2', 'https://example.com/article2', 'Jane Smith', 'This is a test excerpt for article 2', true, 1)
ON CONFLICT (id) DO NOTHING;
