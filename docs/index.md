---
layout: page
---
<script setup>
import { ref, computed } from 'vue'
import { data as posts } from './.vitepress/posts.data'
import { data as projects } from './.vitepress/projects.data'
const base = ''
const perPage = 9
const page = ref(1)
const all = computed(() => {
  const p = posts.map(i => ({ ...i, isProject: false }))
  const pr = projects.map(i => ({ ...i, isProject: true }))
  return [...p, ...pr]
})
const totalPages = computed(() => Math.ceil(all.value.length / perPage))
const paged = computed(() => all.value.slice((page.value - 1) * perPage, page.value * perPage))
function prev() { if (page.value > 1) page.value-- }
function next() { if (page.value < totalPages.value) page.value++ }
</script>

<div class="hero-wrap">
  <div class="hero-text">
    <h1 class="hero-name">Endymion</h1>
    <p class="hero-tagline">记录学习、项目开发与技术实践</p>
  </div>
  <a href="/about"><img :src="base + '/images/avatar.jpg'" class="hero-avatar" /></a>
</div>

<div class="section">
  <h2 class="section-title">近期文章</h2>

  <div v-if="posts.length === 0" class="empty">暂无文章</div>

  <div v-else class="post-grid">
    <template v-for="item of paged" :key="item.url">
      <a v-if="item.isProject" :href="base + item.url" class="post-card project-card">
        <div class="title">{{ item.frontmatter.title }}</div>
        <div class="date" v-if="item.frontmatter.tags?.length">#{{ item.frontmatter.tags[0] }}</div>
      </a>
      <a v-else :href="base + item.url" class="post-card">
        <div class="title">{{ item.frontmatter.title }}</div>
        <div class="date">{{ item.frontmatter.date || '' }}</div>
      </a>
    </template>
  </div>

  <div v-if="totalPages > 1" class="pagination">
    <button @click="prev" :disabled="page === 1" class="page-btn">上一页</button>
    <span class="page-info">{{ page }} / {{ totalPages }}</span>
    <button @click="next" :disabled="page === totalPages" class="page-btn">下一页</button>
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
.hero-name { font-size:2.2rem; font-weight:700; margin:0; line-height:1.2; }
.hero-tagline { font-size:1rem; color:var(--vp-c-text-2); margin:6px 0 0; }
.hero-avatar { width:90px; height:90px; border-radius:50%; object-fit:cover; flex-shrink:0; transition:transform .15s ease,box-shadow .15s ease; }
.hero-avatar:hover { transform:scale(1.25); box-shadow:0 8px 30px rgba(0,0,0,.1); }
.section { max-width:960px; margin:0 auto; padding:0 24px 48px; }
.section-title { font-size:1.1rem; font-weight:600; margin:48px 0 20px; letter-spacing:.04em; color:var(--vp-c-text-2); }
.empty { text-align:center; color:var(--vp-c-text-3); padding:48px 0; }

/* 文章卡片 */
.post-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
@media (max-width:768px) { .post-grid { grid-template-columns:repeat(2,1fr); } .hero-wrap { flex-direction:column; text-align:center; gap:16px; } }
@media (max-width:480px) { .post-grid { grid-template-columns:1fr; } }
.post-card { display:flex; flex-direction:column; padding:20px; border-radius:12px; border:1px solid var(--vp-c-divider); text-decoration:none; color:inherit; transition:border-color .2s,box-shadow .2s; }
.post-card:hover { border-color:var(--vp-c-brand-1); box-shadow:0 4px 16px rgba(0,0,0,.06); }
.title { font-size:.95rem; font-weight:600; line-height:1.5; flex:1; }
.date { font-size:.8rem; color:var(--vp-c-text-3); margin-top:8px; }
.pagination { display:flex; justify-content:center; align-items:center; gap:16px; margin-top:32px; }
.page-btn { padding:6px 16px; border:1px solid var(--vp-c-divider); border-radius:8px; background:var(--vp-c-bg-soft); color:var(--vp-c-text-1); cursor:pointer; font-size:.9rem; transition:border-color .2s; }
.page-btn:hover:not(:disabled) { border-color:var(--vp-c-brand-1); }
.page-btn:disabled { opacity:.4; cursor:default; }
.page-info { font-size:.85rem; color:var(--vp-c-text-2); }

/* 项目卡片（荧光边框） */
.project-card { border-color:var(--vp-c-brand-1) !important; box-shadow:0 0 10px rgba(99,102,241,0.12) !important; }
</style>
