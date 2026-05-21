#!/bin/sh
# pool — wrap the `pool` CLI (host roster + remote exec).
# Pass args through unchanged. Verbs: list · add <host> · on <host> <cmd> · status · install tailscale · rm <host> · off <host>
exec pool "$@"
