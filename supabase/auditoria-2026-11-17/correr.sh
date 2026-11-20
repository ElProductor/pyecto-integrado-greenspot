#!/usr/bin/env bash
# Corre la batería de ataque de operario en un Postgres local desechable (no toca Supabase).
#   ./correr.sh          → base tal como está hoy (001–004)
#   ./correr.sh con005   → con la propuesta 005 aplicada
set -euo pipefail
A=$(cd "$(dirname "$0")" && pwd); G=$A/..; T=$(mktemp -d); trap 'pg_ctl -D $T/pg stop -m fast >/dev/null 2>&1; rm -rf $T' EXIT
initdb -D $T/pg -U postgres -A trust >/dev/null; pg_ctl -D $T/pg -o "-p 54329 -k $T -c listen_addresses=''" -l $T/log start -w >/dev/null
P(){ psql -h $T -p 54329 -U postgres -q -v ON_ERROR_STOP=1 "$@"; }
P -c "CREATE ROLE anon NOLOGIN" -c "CREATE ROLE authenticated NOLOGIN" -c "CREATE ROLE service_role NOLOGIN BYPASSRLS" -c "CREATE DATABASE gs"
P -d gs -f $A/stub_supabase.sql
for f in 001_esquema 002_datos_ejemplo 003_usuarios_y_permisos 004_reglas_en_la_base; do P -d gs -f $G/$f.sql 2>&1 | grep -v NOTICE || true; done
[ "${1:-}" = con005 ] && P -d gs -f $A/005_propuesta_cierre_operario.sql
P -d gs -c "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','admin@x.cl','{\"full_name\":\"Admin\"}'),('bbbbbbbb-0000-0000-0000-000000000001','op1@x.cl','{\"full_name\":\"Operario Uno\"}'),('bbbbbbbb-0000-0000-0000-000000000002','op2@x.cl','{\"full_name\":\"Operario Dos\"}'),('cccccccc-0000-0000-0000-000000000001','inactivo@x.cl','{}'); UPDATE profiles SET is_active = email<>'inactivo@x.cl'"
python3 -I $A/ataque_operario.py $T | tee $T/r.txt
echo "== fallas: $(grep -c '❌' $T/r.txt || true)"
