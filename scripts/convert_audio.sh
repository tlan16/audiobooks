#!/usr/bin/env bash

# Usage Example:
#   find ./*.{mp4,flv} -type f | parallel -j 2 --keep-order --line-buffer ./convert_pipe.sh {} {.}.opus
#   ./convert_pipe.sh input.mp4 output.mp4

set -e

# Shell colors
RED='\033[0;31m'
GREEN='\033[32m'
NC='\033[0m' # No Color

echo "${GREEN}Input: $(realpath "$1")"
echo "${GREEN}Output: $(realpath "$2")"

INPUT_ENV=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=nokey=1:noprint_wrappers=1 "${1}")
OUTPUT_EXT="${2##*.}"
TEMP_FILE=/tmp/"$(cat /dev/urandom | gtr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)"."${OUTPUT_EXT}"

# validation
if [ "${OUTPUT_EXT}" = "" ]; then
  echo "${RED}Invalid output of ${2}, skipping ...${NC}"
  return 1
fi

echo "${GREEN}Start converting "$(basename "$1")" to temp file: ${TEMP_FILE}"
echo "${NC}"

ffmpeg -hide_banner \
  -i "${1}" \
  -c:v copy \
  -c:a libopus \
  -application:a voip \
  -b:a 20k \
  -vbr 2 \
  -compression_level 10 \
  -y \
  "${TEMP_FILE}"

mv "${TEMP_FILE}" "${2}"

#if [ "${1}" != "${2}" ]; then
#  rm -f "${1}"
#  echo "${GREEN}Deleted source file" "$(realpath "$1")"
#fi
