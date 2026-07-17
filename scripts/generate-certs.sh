#!/usr/bin/env bash
set -euo pipefail

cert_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/certs"
mkdir -p "$cert_dir"

openssl req -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout "$cert_dir/localhost-key.pem" \
  -out "$cert_dir/localhost-cert.pem" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates written to $cert_dir"