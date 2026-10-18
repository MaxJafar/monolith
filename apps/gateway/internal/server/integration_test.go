package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/MaxJafar/monolith/gateway/internal/editor"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestRestrictedPostgresEndToEnd(t *testing.T) {
	if os.Getenv("MONOLITH_INTEGRATION") != "1" {
		t.Skip("set MONOLITH_INTEGRATION=1 with an isolated local PostgreSQL database")
	}
	ctx := context.Background()
	cfg := Environment()
	cfg.PublicURL = "http://127.0.0.1:8080"
	cfg.BootstrapToken = "integration-bootstrap-token"
	parsed, err := url.Parse(cfg.DatabaseURL)
	if err != nil || (parsed.Hostname() != "localhost" && parsed.Hostname() != "127.0.0.1") {
		t.Fatal("integration tests require a local isolated database")
	}
	if err = MigrateSchema(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	admin, err := pgx.Connect(ctx, cfg.AdminURL)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close(ctx)
	owner, viewer, other := uuid.NewString(), uuid.NewString(), uuid.NewString()
	wid, pageID := uuid.NewString(), uuid.NewString()
	password := "integration-password-123"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{owner, viewer, other} {
		if _, err = admin.Exec(ctx, "insert into users(id,email,username,auth_password_hash)values($1,$2,$4,$3)", id, id+"@example.invalid", hash, id); err != nil {
			t.Fatal(err)
		}
	}
	defer func() {
		_, _ = admin.Exec(ctx, "delete from zillion_databases__workspaces where id=$1", wid)
		_, _ = admin.Exec(ctx, "delete from users where id=any($1::uuid[])", []string{owner, viewer, other})
	}()
	if _, err = admin.Exec(ctx, "insert into zillion_databases__workspaces(id,owner_id,name)values($1,$2,'Gateway integration')", wid, owner); err != nil {
		t.Fatal(err)
	}
	if _, err = admin.Exec(ctx, "insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role)values($1,$2,$3,'viewer')", owner, wid, viewer); err != nil {
		t.Fatal(err)
	}
	canvas := map[string]any{"version": 1, "title": "Preserved title", "blocks": []any{map[string]any{"id": uuid.NewString(), "type": "document", "width": "full", "content": "# literal\nsecond paragraph"}}}
	body, _ := json.Marshal(canvas)
	if _, err = admin.Exec(ctx, "insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body)values($1,$2,$3,$4,'Preserved title',$5)", pageID, owner, wid, "/page/"+pageID, body); err != nil {
		t.Fatal(err)
	}
	app, err := Open(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer app.Close()
	report, err := app.ConvertWorkspace(ctx, owner, wid, true)
	if err != nil || report.Converted != 1 {
		t.Fatalf("dry run: %+v %v", report, err)
	}
	var count int
	if err = admin.QueryRow(ctx, "select count(*) from monolith_editor_documents where workspace_id=$1", wid).Scan(&count); err != nil || count != 0 {
		t.Fatal("dry run wrote content")
	}
	report, err = app.ConvertWorkspace(ctx, owner, wid, false)
	if err != nil || report.Converted != 1 {
		t.Fatalf("migration: %+v %v", report, err)
	}
	report, err = app.ConvertWorkspace(ctx, owner, wid, false)
	if err != nil || report.Converted != 0 || report.Existing != 1 {
		t.Fatal("migration was not idempotent", report, err)
	}
	request := func(method, path, token string, body any) *httptest.ResponseRecorder {
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest(method, path, bytes.NewReader(raw))
		req.RemoteAddr = "127.0.0.1:43210"
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		app.Handler().ServeHTTP(response, req)
		return response
	}
	login := func(user string) tokens {
		res := request("POST", "/api/v1/device-sessions", "", map[string]string{"email": user + "@example.invalid", "password": password, "deviceName": "Integration"})
		if res.Code != 201 {
			t.Fatal(res.Code, res.Body.String())
		}
		var result tokens
		if err := json.Unmarshal(res.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		return result
	}
	session := login(owner)
	readOnly := login(viewer)
	outsider := login(other)
	path := "/api/v1/editor-documents/page/" + pageID + "?workspaceId=" + wid
	res := request("GET", path, session.AccessToken, nil)
	if res.Code != 200 {
		t.Fatal(res.Code, res.Body.String())
	}
	var document editor.Document
	if err = json.Unmarshal(res.Body.Bytes(), &document); err != nil {
		t.Fatal(err)
	}
	if editor.PlainText(document.Snapshot) != "# literal\nsecond paragraph" {
		t.Fatal("migration changed source text")
	}
	if res = request("GET", path, readOnly.AccessToken, nil); res.Code != 200 {
		t.Fatal("viewer read failed", res.Code, res.Body.String())
	}
	if res = request("GET", path, outsider.AccessToken, nil); res.Code != 404 {
		t.Fatal("workspace isolation failed", res.Code, res.Body.String())
	}
	save := map[string]any{"expectedRevision": 1, "snapshot": document.Snapshot}
	if res = request("PUT", path, readOnly.AccessToken, save); res.Code != 403 {
		t.Fatal("viewer could save", res.Code, res.Body.String())
	}
	if res = request("PUT", path, session.AccessToken, save); res.Code != 200 {
		t.Fatal("save failed", res.Code, res.Body.String())
	}
	if res = request("PUT", path, session.AccessToken, save); res.Code != 409 {
		t.Fatal("conflict did not return 409", res.Code)
	}
	ref := editor.Block{Type: "block", ID: uuid.NewString(), Flavour: "monolith:linked-database", Version: 1, Props: map[string]any{"workspaceId": wid, "baseId": uuid.NewString(), "viewId": ""}, Children: []editor.Block{}}
	var invalid editor.Snapshot
	snapshotBytes, _ := json.Marshal(document.Snapshot)
	_ = json.Unmarshal(snapshotBytes, &invalid)
	invalid.Blocks.Children[1].Children = append(invalid.Blocks.Children[1].Children, ref)
	if res = request("PUT", path, session.AccessToken, map[string]any{"expectedRevision": 2, "snapshot": invalid}); res.Code != 403 {
		t.Fatal("unauthorized reference accepted", res.Code, res.Body.String())
	}
	tx, err := app.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = setIdentity(ctx, tx, owner, wid, ""); err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, "update zillion_databases__workspace_pages set body='{}' where id=$1", pageID)
	_ = tx.Rollback(ctx)
	if err == nil || !strings.Contains(err.Error(), "EDITOR_V2_REQUIRED") {
		t.Fatal("legacy write was not blocked", err)
	}
	newID := uuid.NewString()
	if _, err = admin.Exec(ctx, "insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body)values($1,$2,$3,$4,'New page',$5)", newID, owner, wid, "/page/"+newID, body); err != nil {
		t.Fatal(err)
	}
	if res = request("GET", "/api/v1/editor-sources/page/"+newID, session.AccessToken, nil); res.Code != 200 || !strings.Contains(res.Body.String(), `"migrated":true`) {
		t.Fatal("new source not resolved", res.Code, res.Body.String())
	}
	initPath := "/api/v1/editor-documents/page/" + newID + "/initialize?workspaceId=" + wid
	if res = request("POST", initPath, readOnly.AccessToken, nil); res.Code != 403 {
		t.Fatal("viewer initialized content", res.Code)
	}
	for range 2 {
		if res = request("POST", initPath, session.AccessToken, nil); res.Code != 200 {
			t.Fatal("new source initialization failed", res.Code, res.Body.String())
		}
	}
	if _, err = admin.Exec(ctx, "delete from zillion_databases__workspace_pages where id=$1", newID); err != nil {
		t.Fatal(err)
	}
	if res = request("GET", "/api/v1/editor-documents/page/"+newID+"?workspaceId="+wid, session.AccessToken, nil); res.Code != 404 {
		t.Fatal("deleted body was exposed", res.Code)
	}
	if err = app.RecoveryMode(ctx, owner, wid); err != nil {
		t.Fatal(err)
	}
	if res = request("PUT", path, session.AccessToken, map[string]any{"expectedRevision": 2, "snapshot": document.Snapshot}); res.Code != 423 {
		t.Fatal("recovery mode permits writes", res.Code)
	}
	// Recreate a separate recovery page without overwriting the source.
	res = request("POST", "/api/v1/editor-documents/page/"+pageID+"/recover?workspaceId="+wid, session.AccessToken, map[string]any{"title": "Recovered", "snapshot": document.Snapshot})
	if res.Code != 201 {
		t.Fatal("recovery creation failed", res.Code, res.Body.String())
	}
	refresh := request("POST", "/api/v1/device-sessions/refresh", "", map[string]string{"refreshToken": session.RefreshToken})
	if refresh.Code != 200 {
		t.Fatal(refresh.Code, refresh.Body.String())
	}
	var rotated tokens
	_ = json.Unmarshal(refresh.Body.Bytes(), &rotated)
	if rotated.RefreshToken == session.RefreshToken {
		t.Fatal("refresh token did not rotate")
	}
	if res = request("POST", "/api/v1/device-sessions/refresh", "", map[string]string{"refreshToken": session.RefreshToken}); res.Code != 401 {
		t.Fatal("reuse was not rejected")
	}
	if res = request("GET", path, rotated.AccessToken, nil); res.Code != 401 {
		t.Fatal("reuse did not revoke family")
	}
	if res = request("DELETE", "/api/v1/device-sessions/"+readOnly.SessionID, readOnly.AccessToken, nil); res.Code != http.StatusNoContent {
		t.Fatal("self-revocation failed", res.Code)
	}
	if res = request("GET", path, readOnly.AccessToken, nil); res.Code != 401 {
		t.Fatal("revoked session remained active")
	}
	if res = request("POST", "/api/v1/bootstrap", cfg.BootstrapToken, map[string]string{"email": "admin@example.invalid", "password": password, "name": "Admin"}); res.Code != 403 {
		t.Fatal("bootstrap remained enabled")
	}
	again, err := Open(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer again.Close()
	if again.serverID != app.serverID {
		t.Fatal("server identity changed on restart")
	}
}
