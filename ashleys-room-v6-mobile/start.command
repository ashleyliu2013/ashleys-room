#!/bin/bash
cd "$(dirname "$0")"
echo "ASHLEY'S ROOM v6 · http://localhost:8080"
python3 -m http.server 8080
