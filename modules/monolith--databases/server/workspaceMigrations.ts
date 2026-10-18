const actor = "nullif(current_setting('zillion.user_id',true),'')::uuid"
const memberRead = `owner_id=${actor} or user_id=${actor}`
const workspaceRead = `owner_id=${actor} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=zillion_databases__workspaces.id and m.user_id=${actor})`
const pageRead = `exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id)`
const pageWrite = `exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id and (w.owner_id=${actor} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=w.id and m.user_id=${actor} and m.role='editor')))`

function policies(table: string, read: string, write: string) {
  return `drop policy if exists zillion_owner on ${table};
    drop policy if exists monolith_read on ${table};
    drop policy if exists monolith_insert on ${table};
    drop policy if exists monolith_update on ${table};
    drop policy if exists monolith_delete on ${table};
    create policy monolith_read on ${table} for select using (${read});
    create policy monolith_insert on ${table} for insert with check (${write});
    create policy monolith_update on ${table} for update using (${write}) with check (${write});
    create policy monolith_delete on ${table} for delete using (${write});`
}

/** Reviewed, repeatable additions applied in the same transaction as schema push. */
export const databaseMigrations = [
  `alter table zillion_databases__bases add column if not exists table_type varchar(20);
   update zillion_databases__bases b set table_type = case
     when source_type='task' then 'action'
     when source_type in ('project','note','event') then source_type
     when exists(select 1 from zillion_databases__records r where r.base_id=b.id and r.item_type='project')
       and not exists(select 1 from zillion_databases__records r where r.base_id=b.id and r.item_type<>'project') then 'project'
     when exists(select 1 from zillion_databases__records r where r.base_id=b.id and r.item_type='task')
       and not exists(select 1 from zillion_databases__records r where r.base_id=b.id and r.item_type<>'task') then 'action'
     else 'general' end where table_type is null;
   do $$ begin
     if not exists(select 1 from pg_constraint where conname='monolith_table_type') then
       alter table zillion_databases__bases add constraint monolith_table_type
       check(table_type in ('general','project','action','note','event'));
     end if;
   end $$;`,
  `alter table zillion_databases__bases add column if not exists templates jsonb not null default '[]';
   alter table zillion_databases__records add column if not exists appearance jsonb not null default '{}';
   alter table zillion_databases__records add column if not exists description text not null default '';
   alter table zillion_databases__records add column if not exists comments jsonb not null default '[]';
   alter table zillion_databases__records add column if not exists created_by uuid;
   alter table zillion_databases__records add column if not exists updated_by uuid;`,
  `alter table zillion_databases__workspaces add column if not exists navigation jsonb not null default '{"revision":0,"groups":[],"items":[]}';
   alter table zillion_databases__records add column if not exists status varchar(20) not null default 'planned';
   alter table zillion_databases__records add column if not exists priority varchar(20) not null default 'normal';
   alter table zillion_databases__records add column if not exists tags jsonb not null default '[]';`,
  policies(
    'zillion_databases__workspace_members',
    memberRead,
    `owner_id=${actor}`
  ),
  policies('zillion_databases__workspaces', workspaceRead, `owner_id=${actor}`),
  policies('zillion_databases__workspace_pages', pageRead, pageWrite),
  policies('zillion_databases__knowledge_collections', pageRead, pageWrite),
  policies('zillion_databases__knowledge_sources', pageRead, pageWrite),
  `do $$ begin
    if not exists(select 1 from pg_constraint where conname='monolith_workspace_page_owner') then
      alter table zillion_databases__workspace_pages add constraint monolith_workspace_page_owner
      foreign key(owner_id,workspace_id) references zillion_databases__workspaces(owner_id,id) on delete cascade;
    end if;
    if not exists(select 1 from pg_constraint where conname='monolith_workspace_account') then
      alter table zillion_databases__workspaces add constraint monolith_workspace_account foreign key(owner_id) references users(id) on delete cascade;
      alter table zillion_databases__workspace_members add constraint monolith_workspace_member_account foreign key(user_id) references users(id) on delete cascade;
    end if;
  end $$;`,
  `create table if not exists monolith_native_changes (
    id bigint generated always as identity primary key,
    transaction_id bigint not null default txid_current(),
    owner_id uuid not null, kind text not null, native_id uuid not null,
    operation text not null, payload jsonb not null
  );
  create index if not exists monolith_native_changes_transaction on monolith_native_changes(transaction_id,owner_id,id);
  alter table monolith_native_changes enable row level security;
  alter table monolith_native_changes force row level security;
  drop policy if exists monolith_change_owner on monolith_native_changes;
  create policy monolith_change_owner on monolith_native_changes using(owner_id=${actor}) with check(owner_id=${actor});
  create or replace function monolith_capture_native() returns trigger language plpgsql as $$
    declare payload jsonb;
    begin
      if current_setting('monolith.syncing',true)='1' then return null; end if;
      payload := case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
      if TG_OP='UPDATE' and to_jsonb(OLD)=to_jsonb(NEW) then return null; end if;
      insert into monolith_native_changes(owner_id,kind,native_id,operation,payload)
      values((payload->>'owner_id')::uuid,TG_ARGV[0],
        (case when TG_ARGV[0]='event-date' then payload->>'base_event' else payload->>'id' end)::uuid,TG_OP,payload);
      return null;
    end $$;`,
  ...Object.entries({
    todo_list__entries: 'todo',
    projects__tasks: 'project-task',
    projects__entries: 'project',
    notes__entries: 'note',
    calendar__events: 'event',
    calendar__events_single: 'event-date',
    blog__entries: 'post',
    zillion_databases__documents: 'document'
  }).map(
    ([table, kind]) => `do $$ begin
    if to_regclass('${table}') is not null then
      execute 'drop trigger if exists monolith_native_change on ${table}';
      execute 'create trigger monolith_native_change after insert or update or delete on ${table} for each row execute function monolith_capture_native(''${kind}'')';
    end if;
  end $$;`
  )
]
