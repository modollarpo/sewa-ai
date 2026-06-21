#!/bin/bash
# SEWA AI — scripts/init-db.sh
# Creates additional databases needed at first postgres startup
# © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- HAPI FHIR JPA server database (local dev only)
  CREATE DATABASE hapi_fhir;
  GRANT ALL PRIVILEGES ON DATABASE hapi_fhir TO $POSTGRES_USER;
EOSQL
echo "✅ hapi_fhir database created"
