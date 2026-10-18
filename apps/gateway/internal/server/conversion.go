package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/MaxJafar/monolith/gateway/internal/editor"
	"github.com/jackc/pgx/v5"
)

type MigrationReport struct {
	WorkspaceID         string `json:"workspaceId"`
	DryRun              bool   `json:"dryRun"`
	Converted, Existing int
	Sources             []string `json:"sources"`
}
type legacySource struct {
	source  editor.Source
	title   string
	body    []byte
	canvas  bool
	created time.Time
}

func (s *Server) ConvertWorkspace(ctx context.Context, actor, wid string, dryRun bool) (MigrationReport, error) {
	report := MigrationReport{WorkspaceID: wid, DryRun: dryRun, Sources: []string{}}
	if !validID(actor) || !validID(wid) {
		return report, errors.New("--actor and --workspace UUIDs are required")
	}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return report, err
	}
	defer tx.Rollback(ctx)
	if err = setIdentity(ctx, tx, actor, wid, ""); err != nil {
		return report, err
	}
	scope, err := access(ctx, tx, actor, wid, true)
	if err != nil {
		return report, err
	}
	if scope.Role != "owner" {
		return report, errors.New("only the workspace owner can migrate")
	}
	if _, err = tx.Exec(ctx, "select pg_advisory_xact_lock(hashtextextended($1,0))", actor+":connected-items"); err != nil {
		return report, err
	}
	var pending bool
	if err = tx.QueryRow(ctx, "select exists(select 1 from monolith_native_changes where owner_id=$1)", actor).Scan(&pending); err != nil {
		return report, err
	}
	if pending {
		return report, errors.New("pending native changes must be synchronized by opening the workspace before migration")
	}
	sources := []legacySource{}
	rows, err := tx.Query(ctx, `select 'page',id::text,title,body::text,created,true from zillion_databases__workspace_pages where workspace_id=$1
 union all select 'record',r.id::text,r.title,r.content,r.created,false from zillion_databases__records r join zillion_databases__bases b on b.id=r.base_id where b.workspace_id=$1
 union all select 'note',n.id::text,n.name,n.content,n.created at time zone 'UTC',false from notes__entries n where n.owner_id=$2 and n.type='note'
  and not exists(select 1 from zillion_databases__record_sources s where s.kind='note' and s.native_id=n.id)
  and exists(select 1 from zillion_databases__workspaces w where w.id=$1 and w.is_default)
 union all select 'page',d.id::text,d.title,d.content,d.created,false from zillion_databases__documents d where d.owner_id=$2
  and not exists(select 1 from zillion_databases__workspace_pages p where p.id=d.id)
  and exists(select 1 from zillion_databases__workspaces w where w.id=$1 and w.is_default)
 order by 1,2`, wid, actor)
	if err != nil {
		return report, err
	}
	for rows.Next() {
		var source legacySource
		var body string
		if err = rows.Scan(&source.source.Kind, &source.source.ID, &source.title, &body, &source.created, &source.canvas); err != nil {
			rows.Close()
			return report, err
		}
		source.body = []byte(body)
		sources = append(sources, source)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return report, err
	}
	for _, source := range sources {
		var exists bool
		if err = tx.QueryRow(ctx, "select exists(select 1 from monolith_editor_documents where workspace_id=$1 and source_kind=$2 and source_id=$3)", wid, source.source.Kind, source.source.ID).Scan(&exists); err != nil {
			return report, err
		}
		if exists {
			report.Existing++
			continue
		}
		snapshot, err := editor.Convert(source.source, source.title, source.created.UnixMilli(), source.body, source.canvas)
		if err != nil {
			return report, fmt.Errorf("%s:%s: %w", source.source.Kind, source.source.ID, err)
		}
		report.Converted++
		report.Sources = append(report.Sources, source.source.Kind+":"+source.source.ID)
		if dryRun {
			continue
		}
		original, _ := json.Marshal(map[string]any{"body": string(source.body), "canvas": source.canvas, "title": source.title})
		raw, _ := json.Marshal(snapshot)
		if _, err = tx.Exec(ctx, `insert into monolith_editor_documents(workspace_id,owner_id,source_kind,source_id,snapshot,search_text,original,original_sha256)
   values($1,$2,$3,$4,$5,$6,$7,$8)`, wid, actor, source.source.Kind, source.source.ID, raw, editor.PlainText(snapshot), original, digest(string(source.body))); err != nil {
			return report, err
		}
		if _, err = tx.Exec(ctx, "insert into monolith_migration_checkpoints(workspace_id,source_kind,source_id,source_sha256)values($1,$2,$3,$4)on conflict do nothing", wid, source.source.Kind, source.source.ID, digest(string(source.body))); err != nil {
			return report, err
		}
	}
	if dryRun {
		return report, nil
	}
	// Native notes and their connected database records share one body. The
	// alias retains the original note identity without creating a second writer.
	if _, err = tx.Exec(ctx, `insert into monolith_editor_aliases(workspace_id,alias_kind,alias_id,source_kind,source_id)
 select $1,'note',s.native_id,'record',s.record_id from zillion_databases__record_sources s
 join monolith_editor_documents d on d.workspace_id=$1 and d.source_kind='record' and d.source_id=s.record_id
 where s.kind='note' and s.owner_id=$2 on conflict do nothing`, wid, actor); err != nil {
		return report, err
	}
	if _, err = tx.Exec(ctx, "insert into monolith_editor_rollouts(workspace_id,enabled)values($1,true)on conflict(workspace_id)do update set enabled=true", wid); err != nil {
		return report, err
	}
	return report, tx.Commit(ctx)
}
func (s *Server) RecoveryMode(ctx context.Context, actor, wid string) error {
	if !validID(actor) || !validID(wid) {
		return errors.New("--actor and --workspace UUIDs are required")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = setIdentity(ctx, tx, actor, wid, ""); err != nil {
		return err
	}
	scope, err := access(ctx, tx, actor, wid, true)
	if err != nil {
		return err
	}
	if scope.Role != "owner" {
		return errors.New("only the owner can enter recovery mode")
	}
	if _, err = tx.Exec(ctx, "update monolith_editor_documents set mode='recovery' where workspace_id=$1", wid); err != nil {
		return err
	}
	// Keep rollout enabled: the retained canonical content is displayed read-only.
	return tx.Commit(ctx)
}
