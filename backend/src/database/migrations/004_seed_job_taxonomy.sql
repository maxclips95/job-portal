-- Seed baseline taxonomy so employer job posting works on fresh environments.
INSERT INTO job_categories (id, name, slug, description, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Engineering', 'engineering', 'Software and engineering roles', TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'Product', 'product', 'Product and strategy roles', TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'Design', 'design', 'Design and UX roles', TRUE, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO job_subcategories (id, category_id, name, slug, description, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.id,
  v.name,
  v.slug,
  v.description,
  TRUE,
  NOW(),
  NOW()
FROM (
  VALUES
    ('engineering', 'Backend Engineering', 'backend-engineering', 'Backend and API engineering'),
    ('engineering', 'Frontend Engineering', 'frontend-engineering', 'Frontend and UI engineering'),
    ('product', 'Product Management', 'product-management', 'Product planning and execution'),
    ('design', 'UX/UI Design', 'ux-ui-design', 'User experience and visual design')
) AS v(category_slug, name, slug, description)
JOIN job_categories c ON c.slug = v.category_slug
ON CONFLICT (category_id, slug) DO NOTHING;
