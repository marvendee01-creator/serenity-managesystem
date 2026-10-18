CREATE TABLE public.serenity_members (
  id bigint generated always as identity primary key,
  member_id text not null unique,
  customer_name text not null,
  card_name text not null default 'Serenity Privilege',
  issue_date date not null default (now())::date,
  expiry_date date not null default ((now())::date + interval '1 year'),
  qr_token text not null unique default gen_random_uuid()::text,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serenity_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serenity_members TO anon;
GRANT ALL ON public.serenity_members TO service_role;
ALTER TABLE public.serenity_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.serenity_members FOR ALL USING (true) WITH CHECK (true);