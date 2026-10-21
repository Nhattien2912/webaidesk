ALTER TABLE cms_contents ADD COLUMN last_mutation_id TEXT;
ALTER TABLE cms_comments ADD COLUMN last_mutation_id TEXT;
CREATE INDEX IF NOT EXISTS ix_cms_contents_mutation ON cms_contents(last_mutation_id);
CREATE INDEX IF NOT EXISTS ix_cms_comments_mutation ON cms_comments(last_mutation_id);
