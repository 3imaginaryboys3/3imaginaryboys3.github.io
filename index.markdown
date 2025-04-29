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

  <h2>Blog</h2>
  {% for post in site.posts %}
  <article class="post">
    <time>{{ post.date | date: "%B %d, %Y" }}</time>
    {% if post.writer %}
    <author-text>- written by {{ post.author }}</author-text>
    {% endif %} 
    <h3>
    {% if post.logo %}
    <img src="{{ '/images/post-logos/' | relative_url }}{{ post.logo }}"  
        class="post-logo">
    {% endif %} 
    <a href="{{ post.url }}">{{ post.title }}</a></h3>
    <p>{{ post.subtitle }} </p>
  </article>
  {% endfor %}
</section>