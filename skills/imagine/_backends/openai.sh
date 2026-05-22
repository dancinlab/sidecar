#!/bin/bash
# OpenAI sync /v1/images/generations backend — openai.api_key via `secret get`. Default model: gpt-image-1.
# argv (from imagine.sh): <prompt_abs> <out_abs> <size_token> <model_id_or_empty>
set -euo pipefail

PROMPT_FILE="$1"
OUT_PNG="$2"
SIZE="$3"
MODEL="${4:-gpt-image-1}"
[ -z "$MODEL" ] && MODEL="gpt-image-1"

OPENAI_KEY=$(secret get openai.api_key)
if [ -z "$OPENAI_KEY" ]; then
  echo "[openai] secret get openai.api_key returned empty — set with: secret set openai.api_key" >&2
  exit 1
fi

# Map canonical size tokens to OpenAI pixel form.
case "$SIZE" in
  square_hd|square) PIX="1024x1024" ;;
  landscape_16_9)   PIX="1536x1024" ;;
  portrait_16_9)    PIX="1024x1536" ;;
  *) echo "[openai] internal: unknown size '$SIZE'" >&2; exit 2 ;;
esac

PAYLOAD_FILE=$(mktemp)
trap 'rm -f "$PAYLOAD_FILE"' EXIT
PROMPT_TEXT="$(cat "$PROMPT_FILE")" SIZE_VAL="$PIX" MODEL_VAL="$MODEL" python3 - <<'PY' > "$PAYLOAD_FILE"
import json, os
print(json.dumps({
    "model": os.environ["MODEL_VAL"],
    "prompt": os.environ["PROMPT_TEXT"],
    "size": os.environ["SIZE_VAL"],
    "n": 1,
}))
PY

echo "[openai] submit model=$MODEL size=$PIX → $(basename "$OUT_PNG")" >&2
RESP=$(curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @"$PAYLOAD_FILE")

# OpenAI returns either { data: [ { url } ] } (dall-e-3) or { data: [ { b64_json } ] } (gpt-image-1 default).
B64=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data') or []; print(d[0].get('b64_json','') if d else '')" 2>/dev/null || echo "")
URL=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data') or []; print(d[0].get('url','') if d else '')" 2>/dev/null || echo "")

if [ -n "$B64" ]; then
  python3 -c "import sys,base64; open(sys.argv[1],'wb').write(base64.b64decode(sys.argv[2]))" "$OUT_PNG" "$B64"
elif [ -n "$URL" ]; then
  curl -sSL "$URL" -o "$OUT_PNG"
else
  echo "[openai] no image data in response: $RESP" >&2
  exit 3
fi

SZ=$(stat -f %z "$OUT_PNG" 2>/dev/null || stat -c %s "$OUT_PNG" 2>/dev/null || echo 0)
echo "[openai] wrote $OUT_PNG ($SZ bytes)"
