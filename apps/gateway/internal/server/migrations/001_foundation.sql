create table if not exists monolith_server_identity (
 singleton boolean primary key default true check(singleton),
 id uuid not null default gen_random_uuid(), created_at timestamptz not null default now()
);
insert into monolith_server_identity(singleton) values(true) on conflict do nothing;

create table if not exists monolith_editor_rollouts (
 workspace_id uuid primary key references zillion_databases__workspaces(id) on delete cascade,
 enabled boolean not null default false
);
create table if not exists monolith_editor_documents (
 workspace_id uuid not null, owner_id uuid not null,
 source_kind text not null check(source_kind in ('page','record','note')),
 source_id uuid not null, revision bigint not null default 1 check(revision>0),
 format_version integer not null default 2 check(format_version=2),
 snapshot jsonb not null, search_text text not null default '',
 original jsonb not null, original_sha256 text not null,
 mode text not null default 'active' check(mode in ('active','recovery')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(workspace_id,source_kind,source_id),
 foreign key(owner_id,workspace_id) references zillion_databases__workspaces(owner_id,id) on delete cascade,
 check(octet_length(snapshot::text)<=5000000)
);
create index if not exists monolith_editor_search on monolith_editor_documents using gin(to_tsvector('simple',search_text));
create table if not exists monolith_editor_aliases (
 workspace_id uuid not null, alias_kind text not null, alias_id uuid not null,
 source_kind text not null, source_id uuid not null,
 primary key(workspace_id,alias_kind,alias_id),
 foreign key(workspace_id,source_kind,source_id) references monolith_editor_documents(workspace_id,source_kind,source_id) on delete cascade
);
create table if not exists monolith_migration_checkpoints (
 workspace_id uuid not null, source_kind text not null, source_id uuid not null,
 completed_at timestamptz not null default now(), source_sha256 text not null,
 primary key(workspace_id,source_kind,source_id)
);

create or replace function monolith_editor_can_write(wid uuid) returns boolean
language sql stable security invoker as $$
 select exists(select 1 from zillion_databases__workspaces w where w.id=wid and (
  w.owner_id=nullif(current_setting('zillion.user_id',true),'')::uuid or exists(
   select 1 from zillion_databases__workspace_members m where m.workspace_id=w.id
    and m.user_id=nullif(current_setting('zillion.user_id',true),'')::uuid and m.role='editor')))
$$;
do $$ declare table_name text; begin
 foreach table_name in array array['monolith_editor_documents','monolith_editor_aliases','monolith_migration_checkpoints','monolith_editor_rollouts'] loop
  execute format('alter table %I enable row level security',table_name);
  execute format('alter table %I force row level security',table_name);
  execute format('drop policy if exists editor_read on %I',table_name);
  execute format('drop policy if exists editor_write on %I',table_name);
  execute format('create policy editor_read on %I for select using(exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id))',table_name);
  execute format('create policy editor_write on %I for all using(monolith_editor_can_write(workspace_id)) with check(monolith_editor_can_write(workspace_id))',table_name);
 end loop;
end $$;

create table if not exists monolith_device_sessions (
 id uuid primary key, user_id uuid not null references users(id) on delete cascade,
 device_name text not null, created_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(), expires_at timestamptz not null,
 idle_expires_at timestamptz not null, revoked_at timestamptz,
 check(length(device_name) between 1 and 120)
);
create table if not exists monolith_device_refresh (
 token_hash text primary key, session_id uuid not null references monolith_device_sessions(id) on delete cascade,
 created_at timestamptz not null default now(), consumed_at timestamptz
);
create index if not exists monolith_refresh_session on monolith_device_refresh(session_id);
alter table monolith_device_sessions enable row level security;
alter table monolith_device_sessions force row level security;
drop policy if exists device_session_scope on monolith_device_sessions;
create policy device_session_scope on monolith_device_sessions using(
 user_id=nullif(current_setting('zillion.user_id',true),'')::uuid or id=nullif(current_setting('monolith.device_id',true),'')::uuid
) with check(user_id=nullif(current_setting('zillion.user_id',true),'')::uuid or id=nullif(current_setting('monolith.device_id',true),'')::uuid);
alter table monolith_device_refresh enable row level security;
alter table monolith_device_refresh force row level security;
drop policy if exists device_refresh_scope on monolith_device_refresh;
create policy device_refresh_scope on monolith_device_refresh using(exists(select 1 from monolith_device_sessions s where s.id=session_id)) with check(exists(select 1 from monolith_device_sessions s where s.id=session_id));

create table if not exists monolith_login_challenges (
 token_hash text primary key,user_id uuid not null references users(id) on delete cascade,
 device_name text not null,expires_at timestamptz not null,attempts integer not null default 0
);
create table if not exists monolith_login_limits (
 key text primary key, attempts integer not null, expires_at timestamptz not null
);

-- The old bodies remain as recovery evidence. A migrated source cannot be
-- overwritten through a legacy route, even while its new UI is disabled.
create or replace function monolith_guard_legacy_editor() returns trigger language plpgsql as $$
 declare migrated boolean; kind text; old_body jsonb; new_body jsonb;
 begin
  kind:=TG_ARGV[0]; old_body:=to_jsonb(OLD)->TG_ARGV[1]; new_body:=to_jsonb(NEW)->TG_ARGV[1];
  if old_body is not distinct from new_body then return NEW; end if;
  select exists(select 1 from monolith_editor_documents d where d.source_kind=kind and d.source_id=OLD.id)
   or exists(select 1 from monolith_editor_aliases a where a.alias_kind=kind and a.alias_id=OLD.id) into migrated;
  if migrated then raise exception 'EDITOR_V2_REQUIRED: this document has migrated; use canonical editor storage' using errcode='55000'; end if;
  return NEW;
 end $$;
do $$ declare item text[]; begin
 foreach item slice 1 in array array[
  ['zillion_databases__workspace_pages','page','body'],
  ['zillion_databases__documents','page','content'],
  ['zillion_databases__records','record','content'],
  ['notes__entries','note','content']
 ] loop
  if to_regclass(item[1]) is not null then
   execute format('drop trigger if exists monolith_editor_guard on %I',item[1]);
   execute format('create trigger monolith_editor_guard before update of %I on %I for each row execute function monolith_guard_legacy_editor(%L,%L)',item[3],item[1],item[2],item[3]);
  end if;
 end loop;
end $$;

create or replace function monolith_notify_session_revoked() returns trigger language plpgsql as $$ begin
 if NEW.revoked_at is not null and OLD.revoked_at is null then perform pg_notify('monolith_device_revoked',NEW.id::text); end if;
 return NEW;
end $$;
drop trigger if exists monolith_device_revoked on monolith_device_sessions;
create trigger monolith_device_revoked after update of revoked_at on monolith_device_sessions for each row execute function monolith_notify_session_revoked();
