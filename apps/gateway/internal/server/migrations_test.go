package server

import (
	"context"
	"net/url"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestEditorSourceMigrationsWithOptionalNotes(t *testing.T) {
	connectionURL := os.Getenv("MONOLITH_MIGRATION_TEST_URL")
	if connectionURL == "" {
		t.Skip("requires an isolated local PostgreSQL database")
	}
	parsed, err := url.Parse(connectionURL)
	if err != nil || parsed.Hostname() != "127.0.0.1" || parsed.Path != "/monolith_migration_test" {
		t.Fatal("migration tests require the isolated local test database")
	}
	ctx := context.Background()
	connection, err := pgx.Connect(ctx, connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close(ctx)
	for _, withNotes := range []bool{false, true} {
		name := "native-only"
		if withNotes {
			name = "existing-notes"
		}
		t.Run(name, func(t *testing.T) {
			tx, err := connection.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback(ctx)
			exec := func(statement string, args ...any) {
				t.Helper()
				if _, err := tx.Exec(ctx, statement, args...); err != nil {
					t.Fatal(err)
				}
			}
			schema := pgx.Identifier{"migration_test_" + uuid.NewString()}.Sanitize()
			exec("create schema " + schema)
			exec("set local search_path to " + schema)
			exec(`create table monolith_editor_documents (
			 source_kind text, source_id uuid, snapshot jsonb, revision bigint default 1,
			 mode text default 'active', updated_at timestamptz default now());
			 create table monolith_editor_aliases(alias_kind text, alias_id uuid);`)
			for _, table := range []string{"zillion_databases__workspace_pages", "zillion_databases__documents", "zillion_databases__records"} {
				exec("create table " + table + " (id uuid primary key, title text, body jsonb, content text)")
			}
			if withNotes {
				exec("create table notes__entries(id uuid primary key, name text, content text)")
			}
			for _, file := range []string{"002_source_lifecycle.sql", "003_editor_titles.sql"} {
				body, err := migrations.ReadFile("migrations/" + file)
				if err != nil {
					t.Fatal(err)
				}
				exec(string(body))
			}
			sources := [][3]string{{"zillion_databases__workspace_pages", "page", "title"}, {"zillion_databases__records", "record", "title"}}
			if withNotes {
				sources = append(sources, [3]string{"notes__entries", "note", "name"})
			}
			for _, source := range sources {
				id := uuid.NewString()
				exec("insert into "+source[0]+"(id,"+source[2]+") values($1,'Before')", id)
				exec(`insert into monolith_editor_documents(source_kind,source_id,snapshot)
				 values($1,$2,'{"meta":{"title":"Before"},"blocks":{"props":{}}}')`, source[1], id)
				exec("update "+source[0]+" set "+source[2]+"='After' where id=$1", id)
				var title string
				var revision int
				if err := tx.QueryRow(ctx, "select snapshot#>>'{meta,title}',revision from monolith_editor_documents where source_id=$1", id).Scan(&title, &revision); err != nil || title != "After" || revision != 2 {
					t.Fatalf("title synchronization failed: %s %d %v", title, revision, err)
				}
				exec("delete from "+source[0]+" where id=$1", id)
				var deleted bool
				if err := tx.QueryRow(ctx, "select deleted from monolith_editor_documents where source_id=$1", id).Scan(&deleted); err != nil || !deleted {
					t.Fatalf("deleted source remains visible: %v", err)
				}
			}
		})
	}
}
