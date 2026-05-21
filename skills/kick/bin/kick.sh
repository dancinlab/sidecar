#!/bin/sh
# kick — wrap `hexa kick` (gap breakthrough · discovery).
# All args = the seed expression (joined). Use `hexa kick` directly for
# advanced flags like --rounds / --engine.
exec hexa kick --seed "$*"
