from mutagen.mp3 import MP3
from os import listdir, makedirs
from os.path import isfile, join
from shutil import copyfile
import yaml
import ntpath

class Book(object):
	def __init__(self, id, source_dir):
		self.id = id
		self.source_dir = source_dir
		self.cover = ''
		self.title = ''
		self.author = ''
		self.parts = []
		self.media = []
		self.manifest = {}
		self.loadManifest()
		self.initChapters()

	def loadManifest(self):
		manifest = join('manifests', '{}.yaml'.format(self.id))
		with open(manifest, 'r') as f:
			self.manifest = yaml.safe_load(f)
			self.title = self.manifest['title']
			self.author = self.manifest['author']

			# Get a list of all audio files
			mp3s = [f for f in listdir(self.source_dir) if isfile(join(self.source_dir, f)) and f.lower().endswith('.mp3')]
			mp3s.sort()
			self.media = mp3s

			covers = [f for f in listdir(self.source_dir) if isfile(join(self.source_dir, f)) and f.lower().endswith('.jpg')]
			# Assume the first one is the cover image
			covers.sort()
			self.cover = covers[0]


	def initChapters(self):
		m = self.media.copy()
		for part in self.manifest['parts']:
			p = Part(part['name'])
			for chapter_name in part['chapter_names']:
				c = Chapter(chapter_name, join(self.source_dir, m.pop(0)))
				p.appendChapter(c)
			self.parts.append(p)


	def getDuration(self):
		t=0
		for p in self.parts:
			t += sum([c.getDuration() for c in p.getChapters()])
		return t

	def getID(self):
		return self.id

	def getDefaultAudioSource(self):
		return self.parts[0].chapters[0].source

	def getTitle(self):
		return self.title

	def getAuthor(self):
		return self.author

	def getParts(self):
		return self.parts

	def export(self):
		dst_dir = join('public', 'media', self.getID())
		dst_cover = join(dst_dir, 'cover.jpg')

		makedirs(dst_dir, exist_ok=True)
		if not isfile(dst_cover):
			copyfile(join(self.source_dir, self.cover), dst_cover)
		for m in self.media:
			dst_m = join(dst_dir, m)
			if not isfile(dst_m):
				copyfile(join(self.source_dir, m), dst_m)




class Chapter(object):
	def __init__(self, name, source):
		self.name = name
		self.source = source
		self.duration = None

	def getDuration(self):
		if self.duration is not None:
			return self.duration
		audio = MP3(self.source)
		self.duration = audio.info.length
		return self.duration

	def getFilename(self):
		return ntpath.basename(self.source)

	def getName(self):
		return self.name


# Part of book, has a name and contains Chapters
class Part(object):
	def __init__(self, name):
		self.name = name
		self.chapters = []

	def appendChapter(self, c: Chapter):
		self.chapters.append(c)

	def getName(self):
		return self.name

	def getChapters(self):
		return self.chapters
