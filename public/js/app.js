function Index() {
  this.init = function() {
    self = this;
    const books = document.querySelectorAll(".book");
    this.indicateBookProgress(books);
    this.initMarkCompleteButtons();
    this.initSearch();
  }

  this.initMarkCompleteButtons = function() {
    document.querySelectorAll('button[data-mark-complete]').forEach(function(el) {
        el.addEventListener('click', function() {
          const bookID = this.dataset.bookId;
          const completed = Boolean(Number(this.dataset.markComplete));
          const chapterIndex = 0;
          const position = 0;
          const storage  = new Storage();
          storage.saveProgress(bookID, 0, 0, completed); // whether completed is t/f, setting chapter=0,seek=0 makes most sense
          document.querySelectorAll('button[data-book-id="'+bookID+'"][data-mark-complete]').forEach(function(el){
            el.classList.toggle('d-none');
          })
          // Update the indicated progress, but only for this book
          const book = document.querySelector('.book[data-book-id="'+bookID+'"]');
          self.indicateBookProgress([book]);
      });
    });
  }

  this.indicateBookProgress = function(books) {
    books.forEach(function(el) {
      const id = el.dataset.bookId;
      const chapteredDurations = el.dataset.chapteredDurations.split(',')
                                  .filter(function(v){return v !== ''})
                                  .map(function(v){return Number(v)});

      const storage  = new Storage();
      const position = storage.loadProgress(id);
      const timeListened = el.querySelector('.time-listened');
      const timeListenedPercentage = el.querySelector('.time-listened-percentage');

      if (position.completed) {
        document.querySelector('button[data-book-id="'+id+'"][data-mark-complete="0"]').classList.remove('d-none');
        el.classList.remove('alert-info');
        el.classList.add('alert-success');
        timeListened.textContent = el.querySelector('.duration').textContent;
        timeListenedPercentage.textContent = '(100%)';
      } else {
        document.querySelector('button[data-book-id="'+id+'"][data-mark-complete="1"]').classList.remove('d-none');
        const secondsListened = chapteredDurations.slice(0, position.chapter).reduce((a,b) => a+b,0) + position.seek;
        if (secondsListened > 10) {
          el.classList.add('alert-info');
          timeListened.textContent = calculateDuration(secondsListened);
          timeListenedPercentage.textContent = "("+Math.round(secondsListened/Number(el.dataset.totalDuration)*100)+'%)';
        } else {
          // May have been added by the MarkComplete buttons
          el.classList.remove('alert-info');
          el.classList.remove('alert-success');
          timeListened.textContent = '';
          timeListenedPercentage.textContent = '';
        }
      }
    });
  }

  this.initSearch = function() {
    document.querySelector('#filter-hide-completed').addEventListener('click', function(e) {
      if (e.target.checked) {
        document.querySelectorAll('div.book.alert-success').forEach(function(el) {el.classList.add('d-none')});
      } else {
        document.querySelectorAll('div.book.alert-success').forEach(function(el) {el.classList.remove('d-none')});
      }
    });
    document.querySelector('#filter-text').addEventListener('keyup', function(e) {
      const searchString = e.target.value.toLocaleLowerCase();
      Array.from(document.querySelectorAll('div.book')).forEach(function(el){
        const author = el.querySelector('.author').textContent.trim().toLocaleLowerCase();
        const title  = el.querySelector('.title').textContent.trim().toLocaleLowerCase();
        const toShow = author.indexOf(searchString) + title.indexOf(searchString) > -2
        if (toShow) {
          el.classList.remove('d-none');
        } else {
          el.classList.add('d-none');
        }
      })
    })
  }
}

function Player(book_id) {
  this.book_id              = book_id;
  this.playingTimer         = null;
  this.playingTimerInterval = 500;
  this.saveTimer            = null;
  this.saveTimerInterval    = 5000;
  const self = this;


  const player              = document.getElementById('player');
  const steppers            = document.querySelectorAll('[data-step]');
  const togglePlayPause     = document.getElementById('toggle-play-pause');
  const playbackRateOptions = document.querySelectorAll("[data-playbackrate]");
  const hideFutureChapters  = document.querySelectorAll("[data-hide-future-chapters]");
  const playerPosition      = document.getElementById("player-position");
  const playerDuration      = document.getElementById("player-duration");
  const playerSeeker        = document.getElementById("player-seek");
  const chapters            = document.querySelectorAll(".chapter");
  const storage             = new Storage();

  this.init = function() {
    this.position = this.load();
    const oneTimeSeek = this.position.seek;
    this.initPlayer();
    this.initSteppers();
    this.initPlayPause();
    this.initSettings();
    this.initSeeker();
    this.initChapters();
    // Even if we're jumping to index=0 (default), because this also does other things
    this.jumpToChapter(this.position.chapter);
    // Only on first durationchange, seek to previously saved position
    player.addEventListener("durationchange", function() {
      self.seek(oneTimeSeek / player.duration);
      self.updateProgress();
    }, { once: true });
  }

  // Add event listeners to the audio element
  this.initPlayer = function() {
    player.addEventListener("ended", function() {
      self.jumpToNextChapter();
    });
  }

  // Add event listeners to rewind/forwards buttons
  this.initSteppers = function() {
    steppers.forEach(function(el) {
      el.addEventListener("click", function() {
        player.currentTime += Number(this.dataset.step);
        // Update the seeker, important if the player is paused
        self.updateProgress();
      });
    });
  }

  // Add event listeners to the play/pause button
  this.initPlayPause = function() {
    togglePlayPause.addEventListener("click", function() {
      if (player.paused) {
        self.play();
      } else {
        self.pause();
      }
    })
  }

  // Add event listeners to the seeker (progress bar)
  this.initSeeker = function() {
    playerSeeker.addEventListener('click', function(e) {
      const x = e.pageX - playerSeeker.getBoundingClientRect().x;
      const fraction = x / this.offsetWidth;
      self.seek(fraction);
      self.save();
    });
  }

  // Add event listeners to the chapters in the chapter list
  this.initChapters = function() {
    document.querySelectorAll(".chapter").forEach(function(el) {
      el.addEventListener("click", function(e) {
        self.jumpToChapter(Number(this.dataset.chapterIndex));
      });
    });
  }

  // Add event listeners to the settings options
  // Also apply any saved settings
  this.initSettings = function() {
    const settings = storage.loadSettings();

    // Add Event Handlers to the hideFutureChapters buttons
    hideFutureChapters.forEach(function(el) {
      el.addEventListener("click", function(e, i) {
        hideFutureChapters.forEach(function(el) {
          el.classList.remove("active");
        });
        e.target.classList.add("active");
        self.setHideFutureChapters();
      });
    });

    // Add Event Handlers to the playbackRateOptions buttons
    playbackRateOptions.forEach(function(el) {
      el.addEventListener("click", function(e, i) {
        playbackRateOptions.forEach(function(el) {
          el.classList.remove("active");
        });
        e.target.classList.add("active");
        self.setPlaybackRate();
      });
    });

    // Set the saved hideFutureChapters setting
    if (settings.hasOwnProperty('hideFutureChapters')) {
      let x = Array.prototype.slice.call(hideFutureChapters).find(function(v){return v.dataset.hideFutureChapters==settings['hideFutureChapters']});
      if (x) { x.click(); }
    }
    // Set the saved playbackRate setting
    if (settings.hasOwnProperty('playbackRate')) {
      let x = Array.prototype.slice.call(playbackRateOptions).find(function(v){return v.dataset.playbackrate==settings['playbackRate']});
      if (x) { x.click(); }
    }
  }

  // Set the hide-future-chapters setting
  this.setHideFutureChapters = function() {
    const isHidden = this.getHideFutureChapters()
    const threshold = isHidden ? self.position.chapter : Number.MAX_VALUE;

    chapters.forEach(function(el, i) {
      if (i > threshold) {
        el.querySelector('.chapter-name').textContent = 'hidden';
        el.querySelector('.chapter-name').classList.add('hidden');
      } else {
        el.querySelector('.chapter-name').textContent = el.dataset.chapterName;
        el.querySelector('.chapter-name').classList.remove('hidden');
      }
    });

    storage.saveSettings(this.getPlaybackRate(), isHidden);
  }

  // Get the hide-future-chapters setting, returns boolean
  this.getHideFutureChapters = function() {
    return Array.prototype.slice.call(hideFutureChapters).find(function(node) {
      return node.classList.contains("active");
    }).dataset.hideFutureChapters === "1";
  }

  // Set the playback-rate setting
  this.setPlaybackRate = function() {
    // Determine the desired rate, based on the active button
    const rate = this.getPlaybackRate()
    player.playbackRate = Number(rate);
    storage.saveSettings(rate, this.getHideFutureChapters());
  }

  // Get the playback-rate setting, returns float
  this.getPlaybackRate = function() {
    return Number(Array.prototype.slice.call(playbackRateOptions).find(function(node) {
          return node.classList.contains("active");
        }).dataset.playbackrate);
  }

  // Move the audio element to specified fraction of playtime
  this.seek = function(fraction) {
    fraction = Math.min(Math.max(fraction, 0), 1);
    player.currentTime = fraction * player.duration;
  }

  // Update the Chapter Duration text 
  this.setDuration = function() {
    // Relies on self.position.chapter being the current chapter
    playerDuration.textContent = chapters[self.position.chapter].querySelector(".chapter-duration").textContent.trim();
  }

  // update the seeker (progress bar)
  this.updateProgress = function() {
    try {
      playerPosition.textContent = calculateDuration(player.currentTime);
      playerSeeker.value = player.currentTime / player.duration * 100;
    } catch (e) {
      // Most likely the UA doesn't know the duration yet.
      playerSeeker.value = 0;
    }
  }

  // Just to a specific chapter, zero indexed.
  // Does all the related tasks like updating duration and starts playing
  this.jumpToChapter = function(chapterIndex) {
    chapters.forEach(function(el, i) {
      if (i < chapterIndex) { el.classList.remove("table-primary");el.classList.add("table-success"); }
      if (i === chapterIndex) { el.classList.remove("table-success");el.classList.add("table-primary"); }
      if (i > chapterIndex) { el.classList.remove("table-success");el.classList.remove("table-primary"); }
    });
    let source = chapters[chapterIndex].dataset.source;
    player.setAttribute("src", source);
    self.position = {chapter: chapterIndex, seek: 0};
    self.setDuration();
    self.setHideFutureChapters();
    self.play();
  }

  // Move to the chapter after the current one, or mark the book as complete
  this.jumpToNextChapter = function() {
    let newChapter = self.position.chapter + 1;
    if (chapters.length <= newChapter) {
      console.log("Book is complete");
      self.position.completed = true;
      self.save();
      self.pause();
    } else {
      self.position.completed = false;
      self.jumpToChapter(newChapter);
    }
  };

  // Move from paused state to playing state
  this.play = function() {
    // Again set the playback rate as it gets reset on chapter change, no harm in always setting it
    self.setPlaybackRate();
    player.play();
    // The UA may have blocked autoplay. Only continue the if the action was not blocked
    if (! player.paused) {
      // Just in case, let's clear the timers before we set new ones
      clearInterval(this.playingTimer);
      clearInterval(this.saveTimer);

      togglePlayPause.querySelector('.label').textContent = "Pause";
      togglePlayPause.querySelector('.icon').textContent = "⏸︎";
      this.playingTimer = setInterval(this.updateProgress, this.playingTimerInterval);
      this.save();
      this.saveTimer = setInterval(this.save, this.saveTimerInterval);
    }
  }

  // Move from playing state to paused state
  this.pause = function() {
    togglePlayPause.querySelector('.label').textContent = "Play";
    togglePlayPause.querySelector('.icon').textContent = "⏵︎";
    player.pause();
    clearInterval(this.playingTimer);
    clearInterval(this.saveTimer);
  }

  // Save progress helper
  this.save = function() {
    storage.saveProgress(self.book_id, self.position.chapter, player.currentTime, self.position.completed);
  }

  // Load progress helper
  this.load = function() {
    return storage.loadProgress(this.book_id);
  }
}

function Storage() {
  this.saveProgress = function(book_id, chapterIndex, position, completed) {
    obj = {
      chapter: Number(chapterIndex),
      seek: Number(position),
      completed: !!completed
    }
    localStorage.setItem(book_id, JSON.stringify(obj));
  }

  this.loadProgress = function(book_id) {
    const position = localStorage.getItem(book_id);
    if (position !== null) {
      return JSON.parse(position);
    }
    // Or default position
    return {"chapter": 0, "seek": 0, "completed": false};
  }

  this.saveSettings = function(playbackRate, hideFutureChapters) {
    obj = {
      playbackRate: Number(playbackRate),
      hideFutureChapters: !!hideFutureChapters
    }
    localStorage.setItem('settings', JSON.stringify(obj));
  }

  this.loadSettings = function() {
    const settings = localStorage.getItem('settings');
    if (settings !== null) {
      return JSON.parse(settings);
    }
    // Or default settings
    return {"playback-rate": 1, "hide-future-chapters": false};
  }
}

function calculateDuration(seconds) {
  hours = Math.floor(seconds / 3600);
  minutes = Math.floor((seconds-(hours*3600)) / 60);
  seconds = Math.floor((seconds-(hours*3600)-(minutes*60)));
  if (hours>0) {
    return hours+"h "+minutes+"m "+seconds+"s";
  }
  return minutes+"m "+seconds+"s";
}