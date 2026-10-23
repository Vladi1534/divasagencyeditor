-- Divas v38 · Biblioteca privada de documentos.
-- Ejecutar completo UNA VEZ en el mismo proyecto Supabase del editor.
-- Requiere la instalación Divas existente. Es seguro volver a ejecutarlo.
begin;
do $$ begin
  if to_regclass('public.divas_members') is null or
     to_regprocedure('divas_private.is_admin()') is null then
    raise exception 'Este proyecto no tiene la instalación Divas. Abre el proyecto Supabase que utiliza tu editor.';
  end if;
end $$;

create table if not exists public.divas_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  topic text not null default '' check (length(topic)<=60),
  file_name text not null check (length(file_name) between 1 and 200),
  file_kind text not null check (file_kind in ('pdf','docx','txt')),
  byte_size bigint not null check (byte_size between 1 and 26214400),
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  object_path text not null unique,
  unit_count integer not null check (unit_count between 1 and 1000),
  state text not null default 'uploading' check (state in ('uploading','ready')),
  published boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (object_path=id::text||'/original.'||file_kind)
);
create index if not exists divas_documents_recent on public.divas_documents(created_at desc,id);
alter table public.divas_documents enable row level security;
revoke all on public.divas_documents from public,anon,authenticated;
grant select,insert,delete on public.divas_documents to authenticated;
grant update(title,topic,published) on public.divas_documents to authenticated;

-- Check the original without re-entering the Storage -> documents RLS chain.
create or replace function divas_private.document_object_missing(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select divas_private.is_admin() and not exists (
    select 1 from storage.objects where bucket_id='divas-documents' and name=p_path
  );
$$;
revoke all on function divas_private.document_object_missing(text) from public,anon;
grant execute on function divas_private.document_object_missing(text) to authenticated;

drop policy if exists divas_documents_read on public.divas_documents;
create policy divas_documents_read on public.divas_documents for select to authenticated
using ((select divas_private.is_admin()) or
  ((select divas_private.is_member()) and state='ready' and published));
drop policy if exists divas_documents_insert on public.divas_documents;
create policy divas_documents_insert on public.divas_documents for insert to authenticated
with check ((select divas_private.is_admin()) and created_by=(select auth.uid()) and state='uploading');
drop policy if exists divas_documents_update on public.divas_documents;
create policy divas_documents_update on public.divas_documents for update to authenticated
using ((select divas_private.is_admin())) with check ((select divas_private.is_admin()));
drop policy if exists divas_documents_delete on public.divas_documents;
create policy divas_documents_delete on public.divas_documents for delete to authenticated
using ((select divas_private.is_admin()) and not published and divas_private.document_object_missing(object_path));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('divas-documents','divas-documents',false,26214400,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists divas_documents_storage_read on storage.objects;
create policy divas_documents_storage_read on storage.objects for select to authenticated
using (bucket_id='divas-documents' and ((select divas_private.is_admin()) or
  ((select divas_private.is_member()) and exists (select 1 from public.divas_documents d
    where d.object_path=name and d.state='ready' and d.published))));
drop policy if exists divas_documents_storage_insert on storage.objects;
create policy divas_documents_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='divas-documents' and (select divas_private.is_admin()) and
  exists(select 1 from public.divas_documents d where d.object_path=name and d.state='uploading'));
-- No UPDATE policy: the source is immutable; a revision is a new document.
drop policy if exists divas_documents_storage_delete on storage.objects;
create policy divas_documents_storage_delete on storage.objects for delete to authenticated
using (bucket_id='divas-documents' and (select divas_private.is_admin()));

-- A receipt from the database, not a browser timeout, confirms successful upload.
create or replace function public.divas_document_finish(p_id uuid) returns public.divas_documents
language plpgsql security definer set search_path='' as $$
declare d public.divas_documents; stored_size bigint; stored_mime text;
begin
  if not divas_private.is_admin() then raise exception 'Acceso reservado al administrador.' using errcode='42501'; end if;
  select * into d from public.divas_documents where id=p_id for update;
  if d.id is null then raise exception 'El documento ya no existe.'; end if;
  select (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
    into stored_size,stored_mime from storage.objects o
    where o.bucket_id='divas-documents' and o.name=d.object_path;
  if not found then return null; end if;
  if stored_size is distinct from d.byte_size or stored_mime is distinct from
    (case d.file_kind when 'pdf' then 'application/pdf' when 'docx' then
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' else 'text/plain' end)
    then raise exception 'El archivo guardado no coincide. Elimínalo y vuelve a subir el original.'; end if;
  update public.divas_documents set state='ready' where id=d.id returning * into d;
  return d;
end $$;
revoke all on function public.divas_document_finish(uuid) from public,anon;
grant execute on function public.divas_document_finish(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
select 'Biblioteca de documentos preparada. Vuelve al editor y pulsa Actualizar.' as resultado;
