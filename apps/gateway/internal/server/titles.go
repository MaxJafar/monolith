package server

import (
	"context"
	"github.com/MaxJafar/monolith/gateway/internal/editor"
	"github.com/jackc/pgx/v5"
)

func syncSourceTitle(ctx context.Context, tx pgx.Tx, scope workspace, source editor.Source, title string) error {
	var actor string
	if err := tx.QueryRow(ctx, "select current_setting('zillion.user_id',true)").Scan(&actor); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", scope.Owner); err != nil {
		return err
	}
	var err error
	switch source.Kind {
	case "page":
		_, err = tx.Exec(ctx, "update zillion_databases__workspace_pages set title=$3::text,body=jsonb_set(body,'{title}',to_jsonb($3::text)),updated=now() where id=$1 and workspace_id=$2", source.ID, scope.ID, title)
		if err == nil {
			_, err = tx.Exec(ctx, "update zillion_databases__documents set title=$3 where id=$1 and owner_id=$2", source.ID, scope.Owner, title)
		}
	case "record":
		_, err = tx.Exec(ctx, "update zillion_databases__records set title=$3,updated=now() where id=$1 and base_id in(select id from zillion_databases__bases where workspace_id=$2)", source.ID, scope.ID, title)
	case "note":
		_, err = tx.Exec(ctx, "update zillion_databases__records set title=$3,updated=now() where id in(select s.record_id from zillion_databases__record_sources s join zillion_databases__bases b on b.workspace_id=$2 join zillion_databases__records r on r.base_id=b.id and r.id=s.record_id where s.kind='note' and s.native_id=$1)", source.ID, scope.ID, title)
	}
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "select set_config('zillion.user_id',$1,true)", actor)
	return err
}
