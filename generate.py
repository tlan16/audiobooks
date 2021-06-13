#!/usr/bin/env python3
from jinja2 import Environment, FileSystemLoader, select_autoescape
import sys
import yaml
import re
import argparse
from lib.book import Book

parser = argparse.ArgumentParser(description='Generate Books static pages')
parser.add_argument('--skip-media', action='store_true', help="Skip copying book media files")
parser.add_argument('--keep', action='store_true', help="Keep existing files in media/, even if not needed")
parser.add_argument('--only-index', action='store_true', help="Only generate index.html, implies --skip-media")
parser.add_argument('--with-extension', action='store_true', help="Include the .html extension in the templates")
parser.add_argument('--media-path', default='media', help="Path to where media will be served from on web page. Can be relative or absolute (eg if to an S3 bucket). default=media/")
options = parser.parse_args()
if options.only_index:
	options.skip_media = True

banned_book_ids = ['', 'undefined', 'index', 'settings']
media_path = str(options.media_path).rstrip('/')

def generate_book(book: Book):
	print("  Generating book {}".format(book.id))
	# Time to render
	template = env.get_template('book.html')
	html = template.render(book=book, media_path=media_path)
	with open("public/{}.html".format(book.getID()), 'w') as f:
		f.write(html)


def generate():
	books = []
	# Read the Index yaml
	with open('manifests/index.yaml', 'r') as f:
		try:
			index = yaml.safe_load(f)
		except Exception as e:
			print('Required file manifests/index.yaml missing or unreadable, ' + e)
			sys.exit(1)

	for section in index['sections']:
		if not options.only_index:
			print("Generating section {}".format(section['name']))
		for i,book in enumerate(section['books']):
			# Check book ID is allowed
			if book['id'] in banned_book_ids:
				print("Book ID '{}' is not an allowed ID".format(book['id']))
				sys.exit(1)

			# Generate each book
			try:
				b = Book(book['id'], book['source_dir'])
			except Exception as e:
				print("ERROR: Could not load {}; {}".format(book['id'], e))
				sys.exit(1)

			if not options.only_index:
				generate_book(b)
			if not options.skip_media:
				b.export()  # Generate media (cover + mp3)
			section['books'][i] = b

	# Render index
	print("Generating index for {} books".format(sum([len(x['books']) for x in index['sections']])))
	template = env.get_template('index.html')
	html = template.render(
		index = index,
		media_path=media_path,
		extension='.html' if options.with_extension else ''
	)
	with open("public/index.html", 'w') as f:
		f.write(html)

	return

def clean(base, files_to_keep):
	pass

env = Environment(
	loader=FileSystemLoader('templates'),
	autoescape=select_autoescape(['html'])
)

books = generate()