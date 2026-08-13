-- synthetic.sql (LOCAL DEVELOPMENT ONLY)
--
-- Apply explicitly: psql "$SUPABASE_DB_URL" -f supabase/seed/synthetic.sql
-- Never wired into `supabase db reset`'s automatic seed path (see
-- supabase/config.toml [db.seed] sql_paths) and never run against staging
-- or production — staging uses anonymized production data per the
-- Architecture Blueprint §8.3, not fabricated fixtures.

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-000000000001', 'admin@paz.local', '{"full_name": "Local Admin"}'),
  ('d0000000-0000-0000-0000-000000000002', 'editor@paz.local', '{"full_name": "Local Editor"}')
on conflict (id) do nothing;

-- identity.handle_new_auth_user creates the corresponding people rows.

insert into authz.user_roles (person_id, role_key, granted_by)
select p.id, 'super_admin', p.id
from identity.people p
where p.auth_user_id = 'd0000000-0000-0000-0000-000000000001'
on conflict do nothing;

insert into authz.user_roles (person_id, role_key, granted_by)
select p.id, 'editor', a.id
from identity.people p, identity.people a
where p.auth_user_id = 'd0000000-0000-0000-0000-000000000002'
  and a.auth_user_id = 'd0000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Placeholder institutional content
--
-- Every title/body below is prefixed "[PLACEHOLDER]" on purpose — this is
-- fixture data so the public site has something to render locally, not
-- real PAZ copy. Whoever writes the real About/Guild/Treasury/Contact
-- pages, the real menu, and the real programme replaces these rows
-- through the CMS; nothing here is meant to survive past local
-- development (this file never touches staging or production — see the
-- header comment above and docs/runbooks/environments.md).
-- ---------------------------------------------------------------------

-- Institutional pages: nav links (/about, /guild, /treasury) otherwise
-- 404 as "not published" with nothing to look at locally. /contact is a
-- dedicated route (contact-page.tsx, T-068), not a CMS page, so it is
-- not seeded here.
insert into publishing.items (type, status, slug, title, summary, body, author, published_at)
select
  'page', 'published', v.slug, v.title, v.summary, v.body::jsonb, a.id, now()
from identity.people a,
  (values
    (
      'about',
      '[PLACEHOLDER] About PAZ',
      '[PLACEHOLDER] One-paragraph institutional summary goes here.',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"[PLACEHOLDER] About PAZ"}]},{"type":"paragraph","content":[{"type":"text","text":"[PLACEHOLDER] Replace this paragraph with the real About copy through the CMS before this page is meant to be seen by anyone outside local development."}]}]}'
    ),
    (
      'guild',
      '[PLACEHOLDER] The Guild',
      '[PLACEHOLDER] What the Guild is and who it is for.',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"[PLACEHOLDER] The Guild"}]},{"type":"paragraph","content":[{"type":"text","text":"[PLACEHOLDER] Replace this paragraph with the real Guild copy through the CMS."}]}]}'
    ),
    (
      'treasury',
      '[PLACEHOLDER] The Treasury',
      '[PLACEHOLDER] What the Treasury is and how giving works.',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"[PLACEHOLDER] The Treasury"}]},{"type":"paragraph","content":[{"type":"text","text":"[PLACEHOLDER] Replace this paragraph with the real Treasury copy through the CMS."}]}]}'
    )
  ) as v(slug, title, summary, body)
where a.auth_user_id = 'd0000000-0000-0000-0000-000000000002'
on conflict (type, slug) do nothing;

-- One published article so /journal and the read-an-article journey
-- (Architecture Blueprint §11.4) aren't empty locally.
insert into publishing.items (type, status, slug, title, summary, body, author, published_at)
select
  'article', 'published', 'placeholder-first-piece',
  '[PLACEHOLDER] A first piece for the Journal',
  '[PLACEHOLDER] Summary of a sample article.',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"[PLACEHOLDER] A first piece for the Journal"}]},{"type":"paragraph","content":[{"type":"text","text":"[PLACEHOLDER] Replace this with real writing through the CMS. This row exists so the Journal and article-reading journey render something locally."}]}]}'::jsonb,
  a.id, now()
from identity.people a
where a.auth_user_id = 'd0000000-0000-0000-0000-000000000002'
on conflict (type, slug) do nothing;

-- Hearth menu: /menu and /hearth otherwise render an empty "nothing
-- published" state locally.
insert into hospitality.menus (slug, name, status)
values ('hearth', '[PLACEHOLDER] Hearth Menu', 'published')
on conflict (slug) do nothing;

insert into hospitality.menu_sections (menu_id, name, position)
select m.id, v.name, v.position
from hospitality.menus m,
  (values ('[PLACEHOLDER] Small Plates', 1), ('[PLACEHOLDER] Mains', 2)) as v(name, position)
where m.slug = 'hearth'
  and not exists (
    select 1 from hospitality.menu_sections s where s.menu_id = m.id and s.name = v.name
  );

insert into hospitality.menu_items (section_id, name, description, price_cents, position)
select s.id, v.name, v.description, v.price_cents, v.position
from hospitality.menu_sections s
join hospitality.menus m on m.id = s.menu_id and m.slug = 'hearth'
join (
  values
    ('[PLACEHOLDER] Small Plates', '[PLACEHOLDER] Dish name', '[PLACEHOLDER] Description', 45000, 1),
    ('[PLACEHOLDER] Mains', '[PLACEHOLDER] Dish name', '[PLACEHOLDER] Description', 85000, 1)
) as v(section_name, name, description, price_cents, position) on v.section_name = s.name
where not exists (
  select 1 from hospitality.menu_items i where i.section_id = s.id and i.name = v.name
);

-- One programme + upcoming session so /programmes isn't empty locally.
insert into programs.programs (slug, title, summary)
values (
  'placeholder-programme',
  '[PLACEHOLDER] Sample Programme',
  '[PLACEHOLDER] Replace with a real programme through the admin console.'
)
on conflict (slug) do nothing;

insert into programs.sessions (program_id, starts_at, ends_at, capacity)
select p.id, now() + interval '14 days', now() + interval '14 days 2 hours', 20
from programs.programs p
where p.slug = 'placeholder-programme'
  and not exists (select 1 from programs.sessions s where s.program_id = p.id);
