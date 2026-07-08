---
layout: page
---

<script setup>
import { data as posts } from './.vitepress/posts.data'
const base = '/EndymionBlog'
</script>

<div class="hero-wrap">
  <div class="hero-text">
    <h1 class="hero-name">Endymion</h1>
    <p class="hero-tagline">记录学习、项目开发与技术实践</p>
  </div>
  <img :src="base + '/images/avatar.jpg'" class="hero-avatar" />
</div>

<div class="section">
  <h2 class="section-title">近期文章</h2>

  <div v-if="posts.length === 0" class="empty">暂无文章</div>

  <div v-else class="post-grid">
    <a v-for="post of posts" :key="post.url" :href="base + post.url" class="post-card">
      <div class="cat">{{ post.url.split('/')[1] || 'note' }}</div>
      <div class="title">{{ post.frontmatter.title }}</div>
      <div class="date">{{ post.frontmatter.date || '' }}</div>
    </a>
  </div>
</div>

<style>
.hero-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
}
.hero-name {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}
.hero-tagline {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  margin: 6px 0 0;
}
.hero-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hero-avatar:hover {
  transform: scale(1.25);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}
.section {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px 48px;
}
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 48px 0 20px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
}
.empty {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 48px 0;
}
.post-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .post-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-wrap { flex-direction: column; text-align: center; gap: 16px; }
}
@media (max-width: 480px) {
  .post-grid { grid-template-columns: 1fr; }
}
.post-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.post-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.cat {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  flex: 1;
}
.date {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  margin-top: 8px;
}
</style>
