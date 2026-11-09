---
layout: default
---
<section class="posts">

  <button onclick="party()">🎉 Celebrate!</button>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
  <script>
  function party() {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  </script>

  <section class="music-section">
    <!--<h3>Music of the Week :</h3>-->
    <div class="music-player">
      {% for track in site.data.music %}
      {%- comment -%} Style du lecteur, réglé dans _data/music.yml : « cd » ou « pochette » (par défaut) {%- endcomment -%}
      {% assign lecteur_style = track.style | default: 'pochette' | strip | downcase %}
      {% unless lecteur_style == 'cd' %}{% assign lecteur_style = 'pochette' %}{% endunless %}
      <div class="lecteur lecteur-style-{{ lecteur_style }}" data-lecteur data-titre="{{ track.title | escape }}" data-artiste="{{ track.artist | escape }}">
        {% if lecteur_style == 'cd' %}
        <div class="lecteur-scene">
          <div class="lecteur-cd" aria-hidden="true">
            <div class="lecteur-cd-surface"></div>
            <div class="lecteur-cd-grave"></div>
            <div class="lecteur-cd-centre"></div>
            <div class="lecteur-cd-rotation">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false">
                <path id="cd-matrice-{{ forloop.index }}" d="M50,50 m-17.6,0 a17.6,17.6 0 1,1 35.2,0 a17.6,17.6 0 1,1 -35.2,0" fill="none"></path>
                <text font-family="Arial, Helvetica, sans-serif" font-size="2.3" letter-spacing="0.25" fill="#5a5f68" fill-opacity="0.75"><textPath href="#cd-matrice-{{ forloop.index }}" xlink:href="#cd-matrice-{{ forloop.index }}">TBBE-{{ forloop.index | prepend: '000' | slice: -4, 4 }} · MUSIC OF THE WEEK · A1</textPath></text>
              </svg>
            </div>
          </div>
          <button type="button" class="lecteur-boitier" data-toggle aria-label="Écouter : {{ track.title | escape }}">
            <span class="lecteur-charniere"></span>
            <span class="lecteur-pochette"><img src="{{ track.cover }}" alt="" width="150" height="150"></span>
          </button>
        </div>
        {% else %}
        <button type="button" class="lecteur-pochette" data-toggle aria-label="Écouter : {{ track.title | escape }}">
          <img src="{{ track.cover }}" alt="" width="150" height="150">
          <svg class="lecteur-anneau" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path class="lecteur-anneau-fond" d="M1.5 1.5H98.5V98.5H1.5Z"></path>
            <path class="lecteur-anneau-avance" d="M1.5 1.5H98.5V98.5H1.5Z"></path>
          </svg>
        </button>
        {% endif %}
        <div class="track-info">
          <h3>{{ track.title }} - <span>{{ track.artist }}</span></h3>
          {% if track.ref %}
          <p><a href="{{ track.ref }}">{{ track.artist }}</a></p>
          {% endif %}
          {% if track.subtitle %}
          <p>{{ track.subtitle }}</p>
          {% endif %}
          <audio controls preload="metadata">
            <source src="{{ track.audio }}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
          <div class="lecteur-controles" hidden>
            <button type="button" class="lecteur-play" data-toggle aria-label="Écouter : {{ track.title | escape }}">
              <svg class="icone-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"></path></svg>
              <svg class="icone-pause" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z" fill="currentColor"></path></svg>
            </button>
            <span class="lecteur-temps"><span data-temps>0:00</span> / <span data-duree>{{ track.duree | default: '-:--' }}</span></span>
            <span class="lecteur-sauts">
              <button type="button" class="lecteur-saut" data-saut="-10" aria-label="Reculer de 10 secondes">−10 s</button>
              <button type="button" class="lecteur-saut" data-saut="10" aria-label="Avancer de 10 secondes">+10 s</button>
            </span>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
    <script src="{{ '/assets/js/lecteur.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
  </section>

  <!--<h2>Blog</h2>-->

  <!-- Affiché seulement quand les posts sont filtrés par auteur (voir assets/js/author-filter.js) -->
  <p class="author-filter" hidden>
    <a href="{{ '/' | relative_url }}" class="author-filter-back">← Back</a>
    <span class="author-filter-label">Posts by <span class="author-filter-name"></span></span>
  </p>

  {% assign visible_posts = site.posts | where: "show", true | sort: "date" | reverse %}
  {% for post in visible_posts %}
  <article class="post">
    <div class="post-heading">
      {% if post.logo %}
      <img src="{{ '/images/post-logos/' | relative_url }}{{ post.logo }}" class="post-logo" alt="">
      {% endif %}
      <time>{{ post.date | date: "%B %d, %Y" }}</time>
      {% if post.author %}
      {% assign author_key = post.author | strip | downcase %}
      <span class="post-author">- by <a href="{{ '/' | relative_url }}?author={{ author_key | url_encode }}" class="post-author-link" data-author="{{ author_key | escape }}">{{ post.author | strip }}</a></span>
      {% endif %}
    </div>
    <div class="post-heading">
      <a href="{{ post.url }}">{{ post.title }}</a>
    </div>
    <p class="post-subtitle">{{ post.subtitle }}</p>
  </article>
  {% endfor %}

  <script src="{{ '/assets/js/author-filter.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
</section>
