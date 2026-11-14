#!/usr/bin/env bash
# Build dist/coolroute-lambda.zip for AWS Lambda (Python 3.12, x86_64).
# Run from the repo root:  bash scripts/build_lambda.sh
set -euo pipefail
rm -rf build/lambda dist/coolroute-lambda.zip
mkdir -p build/lambda dist
python3.12 -m pip install --quiet --upgrade pip
python3.12 -m pip install --quiet \
  --platform manylinux2014_x86_64 --implementation cp --python-version 3.12 \
  --only-binary=:all: --target build/lambda -r backend/requirements-lambda.txt
cp -R backend build/lambda/backend
mkdir -p build/lambda/data
cp -R data/processed data/resources build/lambda/data/
find build/lambda -name "__pycache__" -type d -prune -exec rm -rf {} +
rm -rf build/lambda/backend/tests
(cd build/lambda && zip -qr ../../dist/coolroute-lambda.zip .)
ls -lh dist/coolroute-lambda.zip
