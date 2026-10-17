-- Retain conversion evidence when a source is deleted, but never serve its
-- body through search, aliases or the editor API after deletion.
alter table monolith_editor_documents add column if not exists deleted boolean not null default false;
create or replace function monolith_delete_editor_source() returns trigger language plpgsql as $$ begin
 update monolith_editor_documents set deleted=true,updated_at=now()
 where source_kind=TG_ARGV[0] and source_id=OLD.id;
 return OLD;
end $$;
do $$ declare item text[]; begin
 foreach item slice 1 in array array[
  ['zillion_databases__workspace_pages','page'],['zillion_databases__documents','page'],
  ['zillion_databases__records','record'],['notes__entries','note']
 ] loop
  execute format('create trigger monolith_editor_delete after delete on %I for each row execute function monolith_delete_editor_source(%L)',item[1],item[2]);
 end loop;
end $$;
