#!/bin/sh
# verify — wrap `hexa verify`.
# Pass args through unchanged. hexa verify supports multiple forms:
#   hexa verify <id> [--absorb]              atlas atom lookup + recompute
#   hexa verify --expr <fn> <n> <v>          numerical recompute
#   hexa verify --fence "<claim>"            honest ⚪ SPECULATION-FENCED
#   hexa verify rubric | list                tier rubric
# For natural-language claims that don't match a form, hexa will print
# usage — the model can then reframe.
exec hexa verify "$@"
