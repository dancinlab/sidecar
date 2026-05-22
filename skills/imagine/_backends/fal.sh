#!/bin/bash
# fal.ai queue+poll backend — fal.api_key via `secret get`. Default model: openai/gpt-image-2.
# argv (from imagine.sh): <prompt_abs> <out_abs> <size_token> <model_id_or_empty>
#
# Canonical default = openai/gpt-image-2 (user-pinned, do not silently
# downgrade to gpt-image-1 / dall-e-3 / flux / etc.). Override only via
# explicit `-m <model>` on the imagine command line.
set -euo pipefail

PROMPT_FILE="$1"
OUT_PNG="$2"
SIZE="$3"
DEFAULT_MODEL="openai/gpt-image-2"
MODEL="${4:-$DEFAULT_MODEL}"
[ -z "$MODEL" ] && MODEL="$DEFAULT_MODEL"

FAL_KEY=$(secret get fal.api_key)
if [ -z "$FAL_KEY" ]; then
  echo "[fal] secret get fal.api_key returned empty — set with: secret set fal.api_key" >&2
  exit 1
fi

# fal.ai accepts canonical size tokens directly.
PAYLOAD_FILE=$(mktemp)
trap 'rm -f "$PAYLOAD_FILE"' EXIT
PROMPT_TEXT="$(cat "$PROMPT_FILE")" SIZE_VAL="$SIZE" python3 - <<'PY' > "$PAYLOAD_FILE"
import json, os
print(json.dumps({
    "prompt": os.environ["PROMPT_TEXT"],
    "image_size": os.environ["SIZE_VAL"],
    "num_images": 1,
    "output_format": "png",
    "quality": "high",
}))
PY

ENDPOINT="https://queue.fal.run/${MODEL}"
RESP=$(curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @"$PAYLOAD_FILE")

RID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('request_id',''))" 2>/dev/null || echo "")
STATUS_URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_url',''))" 2>/dev/null || echo "")
RESULT_URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response_url',''))" 2>/dev/null || echo "")
if [ -z "$RID" ] || [ -z "$STATUS_URL" ] || [ -z "$RESULT_URL" ]; then
  echo "[fal] submit failed: $RESP" >&2
  exit 1
fi
echo "[fal] queued $(basename "$OUT_PNG") model=$MODEL size=$SIZE request_id=$RID" >&2

for i in $(seq 1 80); do
  STATUS_JSON=$(curl -sS "$STATUS_URL" -H "Authorization: Key $FAL_KEY")
  STATUS=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
  if [ "$STATUS" = "COMPLETED" ]; then break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "ERROR" ]; then
    echo "[fal] $(basename "$OUT_PNG") FAILED status=$STATUS json=$STATUS_JSON" >&2
    exit 2
  fi
  sleep 3
done

RESULT=$(curl -sS "$RESULT_URL" -H "Authorization: Key $FAL_KEY")
URL=$(echo "$RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); imgs=r.get('images') or []; print(imgs[0].get('url','') if imgs else '')" 2>/dev/null || echo "")
if [ -z "$URL" ]; then
  echo "[fal] no image URL in result: $RESULT" >&2
  exit 3
fi
curl -sSL "$URL" -o "$OUT_PNG"
SZ=$(stat -f %z "$OUT_PNG" 2>/dev/null || stat -c %s "$OUT_PNG" 2>/dev/null || echo 0)
echo "[fal] wrote $OUT_PNG ($SZ bytes)"
