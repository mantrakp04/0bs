#!/bin/bash

uv run scripts/crawler.py &
uv run scripts/doc_processor.py