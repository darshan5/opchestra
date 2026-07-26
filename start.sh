#!/bin/sh
npx prisma db push --skip-generate 2>&1 || echo "Prisma db push failed (may be expected on first run)"
node server.js
