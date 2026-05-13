# Supabase cloud slideshow backups

The app can optionally save full slideshow ZIP bundles to Supabase Storage and index
them in a `saved_slideshows` table.

## Required client env vars

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
VITE_SUPABASE_PROJECT_BUCKET=project-zips
```

## Database table

```sql
create table if not exists public.saved_slideshows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.saved_slideshows enable row level security;

create policy "users can view their slideshow backups"
on public.saved_slideshows
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert their slideshow backups"
on public.saved_slideshows
for insert
to authenticated
with check (auth.uid() = user_id);
```

## Storage bucket

Create a private bucket named `project-zips`, then add policies like:

```sql
create policy "users can upload own project zips"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-zips'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "users can download own project zips"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-zips'
  and split_part(name, '/', 1) = auth.uid()::text
);
```

With that in place, signed-in users can save local listing projects as cloud ZIP
backups and restore them back into the app later.
