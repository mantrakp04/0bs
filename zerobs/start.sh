#!/bin/bash

jupyter lab --no-browser --port 8888 --IdentityProvider.token zerobs --ip 0.0.0.0 & uv run docling-serve run & uv run zerobs