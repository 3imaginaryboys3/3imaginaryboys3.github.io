---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

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
    <h3>Music of the Week</h3>
    <div class="music-player">
      {% for track in site.data.music %}
      <div class="album-art">
        <img src="{{ track.cover }}" alt="{{ track.title }} album cover" width="150" height="150">
      </div>
      <div class="track-info">
        <h4>{{ track.title }}</h4>
        <p>{{ track.artist }}</p>
        <audio controls>
          <source src="{{ track.audio }}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      </div>
      {% endfor %}
    </div>
  </section>

  <h2>Blog</h2>
  {% assign visible_posts = site.posts | where: "show", true | sort: "date" | reverse %}
  {% for post in visible_posts %}
  <article class="post"> 
    <h3-post>
    {% if post.logo %}
    <img src="{{ '/images/post-logos/' | relative_url }}{{ post.logo }}"  
        class="post-logo">
    {% endif %} 
    <time>{{ post.date | date: "%B %d, %Y" }}</time>
    {% if post.author %}
    <author-text>- by {{ post.author }}</author-text>
    {% endif %}
    <a href="{{ post.url }}">{{ post.title }}</a></h3-post>
    <p-post>{{ post.subtitle }} </p-post>
  </article>
  {% endfor %}
</section>