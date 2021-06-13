#!/usr/bin/env python3
import sys
from os import listdir
from os.path import isdir, isfile, join
import yaml
import re
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('basedir', help='The base path of the audiobook library')
parser.add_argument('-v', '--verbose', dest='verbose', action='store_true', help="Print skipped books")
parser.add_argument('-f', '--filter', dest='filter', help="Import books matching filter only")
options = parser.parse_args()

basedir = options.basedir
stub = {
  "title": "",
  "author": "",
  "parts": [{
    "name": "",
    "chapter_names": []
  }]
}
# Assume {author}/{title}/
authors = [d for d in listdir(basedir) if isdir(join(basedir, d))]
for author in authors:
	titles = [d for d in listdir(join(basedir, author)) if isdir(join(basedir, author, d))]
	for title in titles:
		chapter_count = len([f for f in listdir(join(basedir, author, title)) if f.endswith('.mp3') and isfile(join(basedir, author, title, f))])
		book_stub = stub.copy()
		book_stub['author'] = author
		book_stub['title'] = title
		book_stub['parts'][0]['chapter_names'] = [f'Chapter {n}' for n in range(1, chapter_count+1)]

		s_author = ''.join(c for c in author if c.isalnum() or c == ' ')
		s_title = ''.join(c for c in title if c.isalnum() or c == ' ')
		stub_name = f'{s_author}-{s_title}'.lower().replace(' ', '-')
		stub_name = re.sub(r'-+', '-', stub_name)

		fn = f'manifests/{stub_name}.yaml'
		if isfile(fn):
			if options.verbose:
				print(f'Stub {fn} exists, skipping')
		else:
			if options.filter is None or (options.filter in author or options.filter in title or options.filter in stub_name):
				print(f'Creating stub {fn}')
				with open(fn, 'w') as f:
					yaml.dump(book_stub, f)
			else:
				if options.verbose:
					print(f'Stub {fn} does not match filter {options.filter}, skipping')
