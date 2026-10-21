package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/MaxJafar/monolith/gateway/internal/editor"
	"github.com/jackc/pgx/v5"
)

// The caller verifies membership before entering this function. Legacy rows
// still use owner RLS, so every read is additionally limited to that workspace.
func legacyInWorkspace(ctx context.Context, tx pgx.Tx, scope workspace, source editor.Source, lock bool) (legacySource, error) {
	result := legacySource{source: source}
	var actor string
	if err := tx.QueryRow(ctx, "select current_setting('zillion.user_id',true)").Scan(&actor); err != nil {
		return result, err
	}
	if _, err := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", scope.Owner); err != nil {
		return result, err
	}
	suffix := ""
	if lock {
		suffix = " for update"
	}
	var body string
	var err error
	switch source.Kind {
	case "page":
		result.canvas = true
		err = tx.QueryRow(ctx, "select title,body::text,created from zillion_databases__workspace_pages where workspace_id=$1 and id=$2"+suffix, scope.ID, source.ID).Scan(&result.title, &body, &result.created)
		if errors.Is(err, pgx.ErrNoRows) {
			result.canvas = false
			err = tx.QueryRow(ctx, `select title,content,created from zillion_databases__documents where owner_id=$1 and id=$2 and exists(select 1 from zillion_databases__workspaces where id=$3 and is_default)`+suffix, scope.Owner, source.ID, scope.ID).Scan(&result.title, &body, &result.created)
		}
	case "record":
		err = tx.QueryRow(ctx, `select r.title,r.content,r.created from zillion_databases__records r where r.id=$1 and exists(select 1 from zillion_databases__bases b where b.id=r.base_id and b.workspace_id=$2)`+suffix, source.ID, scope.ID).Scan(&result.title, &body, &result.created)
	case "note":
		var recordID string
		aliasErr := tx.QueryRow(ctx, `select s.record_id::text from zillion_databases__record_sources s join zillion_databases__records r on r.id=s.record_id join zillion_databases__bases b on b.id=r.base_id where s.kind='note' and s.native_id=$1 and b.workspace_id=$2`, source.ID, scope.ID).Scan(&recordID)
		if aliasErr == nil {
			result.source = editor.Source{Kind: "record", ID: recordID}
			err = tx.QueryRow(ctx, "select title,content,created from zillion_databases__records where id=$1"+suffix, recordID).Scan(&result.title, &body, &result.created)
		} else if !errors.Is(aliasErr, pgx.ErrNoRows) {
			err = aliasErr
		} else {
			err = pgx.ErrNoRows
		}
	default:
		err = pgx.ErrNoRows
	}
	if _, restoreErr := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", actor); restoreErr != nil && err == nil {
		err = restoreErr
	}
	result.body = []byte(body)
	return result, err
}

func findEnabledSource(ctx context.Context, tx pgx.Tx, user string, source editor.Source) (string, editor.Source, error) {
	rows, err := tx.Query(ctx, `select w.id::text,w.owner_id::text,case when w.owner_id=$1 then 'owner' else m.role end
 from zillion_databases__workspaces w join monolith_editor_rollouts f on f.workspace_id=w.id and f.enabled
 left join zillion_databases__workspace_members m on m.workspace_id=w.id and m.user_id=$1`, user)
	if err != nil {
		return "", source, err
	}
	scopes := []workspace{}
	for rows.Next() {
		var scope workspace
		if err = rows.Scan(&scope.ID, &scope.Owner, &scope.Role); err != nil {
			rows.Close()
			return "", source, err
		}
		scopes = append(scopes, scope)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return "", source, err
	}
	for _, scope := range scopes {
		original, err := legacyInWorkspace(ctx, tx, scope, source, false)
		if err == nil {
			return scope.ID, original.source, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", source, err
		}
	}
	return "", source, pgx.ErrNoRows
}

// New legacy identities created after rollout are converted explicitly on the
// first edit. Locking the source freezes the exact original before installing
// the legacy-write guard; retries return the same canonical document.
func (s *Server) initializeDocument(w http.ResponseWriter, r *http.Request) error {
	tx, scope, source, err := s.documentTx(r, true)
	if err != nil {
		return err
	}
	defer tx.Rollback(r.Context())
	var enabled bool
	if err = tx.QueryRow(r.Context(), "select coalesce((select enabled from monolith_editor_rollouts where workspace_id=$1),false)", scope.ID).Scan(&enabled); err != nil {
		return err
	}
	if !enabled {
		return fail(409, "rollout_disabled", "This workspace has not enabled the document editor")
	}
	if current, err := readDocument(r.Context(), tx, scope.ID, source, false); err == nil {
		respond(w, 200, current)
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	original, err := legacyInWorkspace(r.Context(), tx, scope, source, true)
	if err != nil {
		return err
	}
	source = original.source
	snapshot, err := editor.Convert(source, original.title, original.created.UnixMilli(), original.body, original.canvas)
	if err != nil {
		return fail(422, "conversion_failed", err.Error())
	}
	raw, _ := json.Marshal(snapshot)
	retained, _ := json.Marshal(map[string]any{"body": string(original.body), "canvas": original.canvas, "title": original.title})
	if _, err = tx.Exec(r.Context(), `insert into monolith_editor_documents(workspace_id,owner_id,source_kind,source_id,snapshot,search_text,original,original_sha256)
 values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing`, scope.ID, scope.Owner, source.Kind, source.ID, raw, editor.PlainText(snapshot), retained, digest(string(original.body))); err != nil {
		return err
	}
	// Legacy source links use owner RLS. Membership and the record's workspace
	// were verified above; restore the actor before reading canonical content.
	var actor string
	if err = tx.QueryRow(r.Context(), "select current_setting('zillion.user_id',true)").Scan(&actor); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), "select set_config('zillion.user_id',$1,true)", scope.Owner); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), `insert into monolith_editor_aliases(workspace_id,alias_kind,alias_id,source_kind,source_id)
 select $1,'note',s.native_id,'record',s.record_id from zillion_databases__record_sources s
 where s.record_id=$2 and s.kind='note' and $3='record' on conflict do nothing`, scope.ID, source.ID, source.Kind); err != nil {
		return err
	}
	if _, err = tx.Exec(r.Context(), "select set_config('zillion.user_id',$1,true)", actor); err != nil {
		return err
	}
	current, err := readDocument(r.Context(), tx, scope.ID, source, false)
	if err != nil {
		return err
	}
	if err = tx.Commit(r.Context()); err != nil {
		return err
	}
	respond(w, 200, current)
	return nil
}
