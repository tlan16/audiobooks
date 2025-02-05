#!/usr/bin/env bash

# Usage Example:
#   find ./*.{mp4,flv} -type f | parallel -j 2 --keep-order --line-buffer ./convert_pipe.sh {} {.}.opus
#   ./convert_pipe.sh input.mp4 output.mp4

set -e


echo "Input: $(realpath "$1")"
echo "Output: $(realpath "$2")"

INPUT_ENV=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=nokey=1:noprint_wrappers=1 "${1}")
OUTPUT_EXT="${2##*.}"
TEMP_FILE=/tmp/"$(cat /dev/urandom | gtr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)"."${OUTPUT_EXT}"

# validation
if [ "${OUTPUT_EXT}" = "" ]; then
  echo "Invalid output of ${2}, skipping ..."
  return 1
fi

echo "Start converting "$(basename "$1")" to temp file: ${TEMP_FILE}"

ffmpeg -hide_banner \
  -i "${1}" \
  -c:v copy \
  -c:a libopus \
  -application:a voip \
  -b:a 20k \
  -vbr 2 \
  -compression_level 6 \
  -y \
  "${TEMP_FILE}"

mv "${TEMP_FILE}" "${2}"

#if [ "${1}" != "${2}" ]; then
#  rm -f "${1}"
#  echo "Deleted source file" "$(realpath "$1")"
#fi
