package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/MaxJafar/monolith/gateway/internal/editor"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type workspace struct{ ID, Owner, Role string }

func (s *Server) resolveSource(w http.ResponseWriter, r *http.Request) error {
	user, device, err := s.authenticate(r)
	if err != nil {
		return err
	}
	kind, err := editor.NormalizeKind(r.PathValue("kind"))
	id := r.PathValue("id")
	if err != nil || !validID(id) {
		return fail(400, "invalid_identity", "Invalid document identity")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, user, "", device); err != nil {
		return err
	}
	var wid, canonicalKind, canonicalID string
	err = tx.QueryRow(r.Context(), `select workspace_id::text,source_kind,source_id::text from (
 select a.workspace_id,a.source_kind,a.source_id,0 as precedence from monolith_editor_aliases a join monolith_editor_documents d using(workspace_id,source_kind,source_id) where a.alias_kind=$1 and a.alias_id=$2 and not d.deleted
 union all select workspace_id,source_kind,source_id,1 from monolith_editor_documents where source_kind=$1 and source_id=$2 and not deleted
 ) candidates order by precedence limit 1`, kind, id).Scan(&wid, &canonicalKind, &canonicalID)
	if errors.Is(err, pgx.ErrNoRows) {
		var source editor.Source
		wid, source, err = findEnabledSource(r.Context(), tx, user, editor.Source{Kind: kind, ID: id})
		if errors.Is(err, pgx.ErrNoRows) {
			respond(w, 200, map[string]any{"migrated": false})
			return nil
		}
		canonicalKind, canonicalID = source.Kind, source.ID
	}
	if err != nil {
		return err
	}
	respond(w, 200, map[string]any{"migrated": true, "workspaceId": wid, "source": editor.Source{Kind: canonicalKind, ID: canonicalID}})
	return nil
}

func access(ctx context.Context, tx pgx.Tx, user, id string, write bool) (workspace, error) {
	var result workspace
	result.ID = id
	err := tx.QueryRow(ctx, `select w.owner_id::text,case when w.owner_id=$2 then 'owner' else m.role end
  from zillion_databases__workspaces w left join zillion_databases__workspace_members m on m.workspace_id=w.id and m.user_id=$2
  where w.id=$1`, id, user).Scan(&result.Owner, &result.Role)
	if err != nil {
		return result, err
	}
	if result.Role == "" {
		return result, pgx.ErrNoRows
	}
	if write && result.Role == "viewer" {
		return result, fail(403, "read_only", "This workspace is read-only")
	}
	return result, nil
}
func (s *Server) documentTx(r *http.Request, write bool) (pgx.Tx, workspace, editor.Source, error) {
	user, device, err := s.authenticate(r)
	if err != nil {
		return nil, workspace{}, editor.Source{}, err
	}
	wid := r.URL.Query().Get("workspaceId")
	id := r.PathValue("id")
	kind, kindErr := editor.NormalizeKind(r.PathValue("kind"))
	if !validID(wid) || !validID(id) || kindErr != nil {
		return nil, workspace{}, editor.Source{}, fail(400, "invalid_identity", "A valid workspace and document identity are required")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return nil, workspace{}, editor.Source{}, err
	}
	if err = setIdentity(r.Context(), tx, user, wid, device); err != nil {
		tx.Rollback(r.Context())
		return nil, workspace{}, editor.Source{}, err
	}
	scope, err := access(r.Context(), tx, user, wid, write)
	if err != nil {
		tx.Rollback(r.Context())
		return nil, scope, editor.Source{}, err
	}
	source := editor.Source{Kind: kind, ID: id}
	var canonicalKind, canonicalID string
	err = tx.QueryRow(r.Context(), "select source_kind,source_id::text from monolith_editor_aliases where workspace_id=$1 and alias_kind=$2 and alias_id=$3", wid, kind, id).Scan(&canonicalKind, &canonicalID)
	if err == nil {
		source = editor.Source{Kind: canonicalKind, ID: canonicalID}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		tx.Rollback(r.Context())
		return nil, scope, source, err
	}
	return tx, scope, source, nil
}
func readDocument(ctx context.Context, tx pgx.Tx, wid string, source editor.Source, lock bool) (editor.Document, error) {
	result := editor.Document{Source: source, WorkspaceID: wid, FormatVersion: 2}
	var raw []byte
	query := "select revision,snapshot,mode='recovery',updated_at from monolith_editor_documents where workspace_id=$1 and source_kind=$2 and source_id=$3 and not deleted"
	if lock {
		query += " for update"
	}
	err := tx.QueryRow(ctx, query, wid, source.Kind, source.ID).Scan(&result.Revision, &raw, &result.Recovery, &result.UpdatedAt)
	if err != nil {
		return result, err
	}
	err = json.Unmarshal(raw, &result.Snapshot)
	return result, err
}
func (s *Server) getDocument(w http.ResponseWriter, r *http.Request) error {
	tx, scope, source, err := s.documentTx(r, false)
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	document, err := readDocument(r.Context(), tx, scope.ID, source, false)
	if err != nil {
		return err
	}
	respond(w, 200, document)
	return nil
}
func (s *Server) saveDocument(w http.ResponseWriter, r *http.Request) error {
	var body struct {
		ExpectedRevision int64           `json:"expectedRevision"`
		Snapshot         editor.Snapshot `json:"snapshot"`
	}
	if err := decode(w, r, &body, editor.MaxBytes+10000); err != nil {
		return err
	}
	references, err := editor.Validate(body.Snapshot)
	if err != nil {
		return fail(422, "invalid_snapshot", err.Error())
	}
	tx, scope, source, err := s.documentTx(r, true)
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	current, err := readDocument(r.Context(), tx, scope.ID, source, true)
	if err != nil {
		return err
	}
	if current.Recovery {
		return fail(423, "recovery_read_only", "This source is in read-only recovery mode")
	}
	if current.Revision != body.ExpectedRevision {
		respond(w, 409, map[string]any{"code": "revision_conflict", "message": "The server has a newer version", "current": current})
		return nil
	}
	if body.Snapshot.Meta.ID != source.ID {
		return fail(422, "invalid_identity", "Snapshot identity cannot change")
	}
	if err = checkReferences(r.Context(), tx, scope, references, current.Snapshot); err != nil {
		return err
	}
	raw, err := json.Marshal(body.Snapshot)
	if err != nil {
		return err
	}
	if err = tx.QueryRow(r.Context(), `update monolith_editor_documents set snapshot=$4,search_text=$5,revision=revision+1,updated_at=now()
  where workspace_id=$1 and source_kind=$2 and source_id=$3 returning revision,updated_at`, scope.ID, source.Kind, source.ID, raw, editor.PlainText(body.Snapshot)).Scan(&current.Revision, &current.UpdatedAt); err != nil {
		return err
	}
	current.Snapshot = body.Snapshot
	if err = syncSourceTitle(r.Context(), tx, scope, source, body.Snapshot.Meta.Title); err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 200, current)
	return nil
}
func checkReferences(ctx context.Context, tx pgx.Tx, scope workspace, refs []editor.Reference, previous editor.Snapshot) error {
	old := map[editor.Reference]bool{}
	if previous.Type != "" {
		prior, err := editor.Validate(previous)
		if err != nil {
			return err
		}
		for _, ref := range prior {
			old[ref] = true
		}
	}
	var actor string
	if err := tx.QueryRow(ctx, "select current_setting('zillion.user_id',true)").Scan(&actor); err != nil {
		return err
	}
	// The verified workspace owner is used only for these explicitly scoped legacy
	// base/view reads; member identity is restored before canonical writes.
	if _, err := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", scope.Owner); err != nil {
		return err
	}
	for _, ref := range refs {
		if old[ref] {
			continue
		} // unavailable old references remain recoverable placeholders
		if ref.WorkspaceID != scope.ID || !validID(ref.BaseID) || (ref.ViewID != "" && !validID(ref.ViewID)) {
			return fail(403, "database_forbidden", "Database reference is outside this workspace")
		}
		var allowed bool
		if err := tx.QueryRow(ctx, `select exists(select 1 from zillion_databases__bases b where b.id=$1 and b.workspace_id=$2 and
   ($3='' or exists(select 1 from zillion_databases__views v where v.base_id=b.id and v.id::text=$3)))`, ref.BaseID, scope.ID, ref.ViewID).Scan(&allowed); err != nil {
			return err
		}
		if !allowed {
			return fail(403, "database_forbidden", "Database or view is unavailable in this workspace")
		}
	}
	_, err := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", actor)
	return err
}
func (s *Server) rollout(w http.ResponseWriter, r *http.Request) error {
	user, device, err := s.authenticate(r)
	if err != nil {
		return err
	}
	id := r.PathValue("id")
	if !validID(id) {
		return fail(400, "invalid_identity", "Invalid workspace")
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	if err = setIdentity(r.Context(), tx, user, id, device); err != nil {
		return err
	}
	scope, err := access(r.Context(), tx, user, id, false)
	if err != nil {
		return err
	}
	var enabled bool
	if err = tx.QueryRow(r.Context(), "select coalesce((select enabled from monolith_editor_rollouts where workspace_id=$1),false)", id).Scan(&enabled); err != nil {
		return err
	}
	respond(w, 200, map[string]any{"enabled": enabled, "formatVersion": 2, "role": scope.Role})
	return nil
}
func (s *Server) recoverDocument(w http.ResponseWriter, r *http.Request) error {
	var body struct {
		Snapshot editor.Snapshot `json:"snapshot"`
		Title    string          `json:"title"`
	}
	if err := decode(w, r, &body, editor.MaxBytes+10000); err != nil {
		return err
	}
	refs, err := editor.Validate(body.Snapshot)
	if err != nil {
		return fail(422, "invalid_snapshot", err.Error())
	}
	tx, scope, source, err := s.documentTx(r, true)
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	previous, err := readDocument(r.Context(), tx, scope.ID, source, false)
	if err != nil {
		return err
	}
	if err = checkReferences(r.Context(), tx, scope, refs, previous.Snapshot); err != nil {
		return err
	}
	id := uuid.NewString()
	title := body.Title
	if title == "" {
		title = body.Snapshot.Meta.Title + " (recovered)"
	}
	if len(title) > 255 {
		return fail(422, "invalid_title", "Title is too long")
	}
	body.Snapshot.Meta.ID = id
	body.Snapshot.Meta.Title = title
	body.Snapshot.Blocks.Props["title"] = editor.Text(title)
	raw, _ := json.Marshal(body.Snapshot)
	// A recovery is a distinct navigable page. The conflicting source stays intact.
	canvas, _ := json.Marshal(map[string]any{"version": 1, "title": title, "icon": "lucide:file-text", "fullWidth": false, "revision": 1, "updated": nil, "blocks": []any{}})
	if _, err = tx.Exec(r.Context(), "insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body)values($1,$2,$3,$4,$5,$6)", id, scope.Owner, scope.ID, "/page/"+id, title, canvas); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), `insert into monolith_editor_documents(workspace_id,owner_id,source_kind,source_id,snapshot,search_text,original,original_sha256)
  values($1,$2,'page',$3,$4,$5,$6,$7)`, scope.ID, scope.Owner, id, raw, editor.PlainText(body.Snapshot), raw, digest(string(raw))); err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 201, editor.Document{Source: editor.Source{Kind: "page", ID: id}, WorkspaceID: scope.ID, Revision: 1, FormatVersion: 2, Snapshot: body.Snapshot, UpdatedAt: time.Now()})
	return nil
}
