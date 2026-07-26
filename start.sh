#!/bin/sh
echo "Running database schema push..."
node scripts/migrate.mjs || true
echo "Starting server..."
exec node server.js
