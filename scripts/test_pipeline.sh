#!/usr/bin/env bash
# ==============================================================================
# End-to-End Pipeline Integration Test
# Validates Sections 34, 57, 58
# ==============================================================================
set -e

BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "=== [1/6] Generating Test Input Image ==="
ffmpeg -f lavfi -i smptebars=duration=1:size=720x1280:rate=1 -frames:v 1 "$TMP_DIR/test_input.png" -y > /dev/null 2>&1
echo "Created test input image: $TMP_DIR/test_input.png"

echo "=== [2/6] Checking System Capabilities ==="
CAPS=$(curl -s "$BASE_URL/api/v1/system/capabilities")
echo "System capabilities: $CAPS"

echo "=== [3/6] Uploading Image ==="
UPLOAD_RESP=$(curl -s -X POST "$BASE_URL/api/v1/uploads/image" \
  -F "image=@$TMP_DIR/test_input.png")
echo "Upload response: $UPLOAD_RESP"

IMAGE_ID=$(echo "$UPLOAD_RESP" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$IMAGE_ID" ]; then
  echo "Failed to extract IMAGE_ID from upload response"
  exit 1
fi
echo "Uploaded image ID: $IMAGE_ID"

echo "=== [4/6] Submitting Video Generation Job ==="
GEN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/video/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_id\": \"$IMAGE_ID\",
    \"prompt\": \"A test cinematic scene with subtle camera push-in and natural motion\",
    \"duration\": 2,
    \"fps\": 24,
    \"resolution\": \"512p\",
    \"aspect_ratio\": \"9:16\",
    \"camera_motion\": \"slow push-in\",
    \"motion_strength\": 50
  }")
echo "Generation submit response: $GEN_RESP"

JOB_ID=$(echo "$GEN_RESP" | grep -o '"job_id":"[^"]*' | head -n 1 | cut -d'"' -f4)
if [ -z "$JOB_ID" ]; then
  echo "Failed to extract JOB_ID"
  exit 1
fi
echo "Enqueued Job ID: $JOB_ID"

echo "=== [5/6] Polling Job Status ==="
MAX_WAIT=30
WAITED=0
STATUS="queued"

while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ] && [ "$WAITED" -lt "$MAX_WAIT" ]; do
  sleep 2
  WAITED=$((WAITED + 2))
  JOB_STATUS_RESP=$(curl -s "$BASE_URL/api/v1/video/jobs/$JOB_ID")
  STATUS=$(echo "$JOB_STATUS_RESP" | grep -o '"status":"[^"]*' | head -n 1 | cut -d'"' -f4)
  PROGRESS=$(echo "$JOB_STATUS_RESP" | grep -o '"progress":[0-9]*' | head -n 1 | cut -d':' -f2)
  STAGE=$(echo "$JOB_STATUS_RESP" | grep -o '"stage":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "[$WAITED s] Status: $STATUS | Progress: $PROGRESS% | Stage: $STAGE"
done

if [ "$STATUS" != "completed" ]; then
  echo "Generation test did not complete successfully. Status: $STATUS"
  exit 1
fi

echo "=== [6/6] Verifying Video Output Stream ==="
VIDEO_URL=$(curl -s "$BASE_URL/api/v1/video/jobs/$JOB_ID" | grep -o '"video_url":"[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Video URL: $BASE_URL$VIDEO_URL"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$VIDEO_URL")
if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 206 ]; then
  echo "Failed to stream video. HTTP Code: $HTTP_CODE"
  exit 1
fi

echo "======================================================================"
echo "  SUCCESS: End-to-end AI Video Generation pipeline verified!"
echo "======================================================================"
