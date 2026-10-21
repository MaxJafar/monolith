-- Page presentation metadata can change without reopening the frozen old body.
create or replace function monolith_guard_legacy_editor() returns trigger language plpgsql as $$
declare migrated boolean; kind text; old_body jsonb; new_body jsonb;
begin
 kind:=TG_ARGV[0]; old_body:=to_jsonb(OLD)->TG_ARGV[1]; new_body:=to_jsonb(NEW)->TG_ARGV[1];
 if old_body is not distinct from new_body then return NEW; end if;
 if TG_ARGV[1]='body' and old_body->'blocks' is not distinct from new_body->'blocks' then return NEW; end if;
 select exists(select 1 from monolith_editor_documents d where d.source_kind=kind and d.source_id=OLD.id)
 or exists(select 1 from monolith_editor_aliases a where a.alias_kind=kind and a.alias_id=OLD.id) into migrated;
 if migrated then raise exception 'EDITOR_V2_REQUIRED: this document has migrated; use canonical editor storage' using errcode='55000'; end if;
 return NEW;
end $$;

-- Sidebar/record renames participate in the canonical revision check too.
create or replace function monolith_editor_source_title() returns trigger language plpgsql as $$
declare new_title text; begin
 new_title:=to_jsonb(NEW)->>TG_ARGV[1];
 if new_title is not distinct from (to_jsonb(OLD)->>TG_ARGV[1]) then return NEW; end if;
 if exists(select 1 from monolith_editor_documents where source_kind=TG_ARGV[0] and source_id=NEW.id and mode='recovery') then
  raise exception 'EDITOR_RECOVERY_READ_ONLY' using errcode='55000';
 end if;
 update monolith_editor_documents set
 snapshot=jsonb_set(jsonb_set(snapshot,'{meta,title}',to_jsonb(new_title)), '{blocks,props,title}',jsonb_build_object('$blocksuite:internal:text$',true,'delta',jsonb_build_array(jsonb_build_object('insert',new_title)))),
 revision=revision+1,updated_at=now()
 where source_kind=TG_ARGV[0] and source_id=NEW.id and not deleted and snapshot#>>'{meta,title}' is distinct from new_title;
 return NEW;
end $$;
do $$ declare item text[]; begin
 foreach item slice 1 in array array[
  ['zillion_databases__workspace_pages','page','title'],['zillion_databases__documents','page','title'],
  ['zillion_databases__records','record','title'],['notes__entries','note','name']
 ] loop
  if to_regclass(item[1]) is not null then
   execute format('create trigger monolith_editor_title after update of %I on %I for each row execute function monolith_editor_source_title(%L,%L)',item[3],item[1],item[2],item[3]);
  end if;
 end loop;
end $$;
