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

<div class="home-shell">
  <section class="home-hero">
    <div class="hero-copy">
      <span class="hero-kicker">ENDYMION / ENGINEERING NOTES</span>
      <h1>技术学习笔记<br><em>与项目记录</em></h1>
      <p>Agent设计、算法设计、后端开发 学习笔记和项目记录</p>
      <div class="hero-actions">
        <a class="hero-primary" href="#latest">阅读最新文章</a>
        <a class="hero-secondary" href="/projects/">查看项目</a>
      </div>
    </div>
    <a class="profile-card" href="/about" aria-label="关于 Endymion">
      <img :src="base + '/images/avatar.jpg'" class="hero-avatar" />
      <span>Endymion</span>
      <small>Builder · Learner</small>
    </a>
  </section>

  <section v-if="projects.length" class="featured-projects">
    <header class="mini-heading"><span>IN PROGRESS / BUILT</span><a href="/projects/">全部项目</a></header>
    <div class="featured-project-grid">
      <a v-for="project in projects.slice(0, 2)" :key="project.url" :href="base + project.url" class="featured-project">
        <div><span>SELECTED PROJECT</span><h2>{{ project.frontmatter.title }}</h2><p>{{ project.frontmatter.desc || '查看项目详情与开发记录。' }}</p></div>
        <footer><span v-for="tag in project.frontmatter.tags?.slice(0, 3)" :key="tag">{{ tag }}</span></footer>
      </a>
    </div>
  </section>
</div>

<main id="latest" class="content-section">
  <header class="section-heading">
    <div>
      <span>RECENTLY PUBLISHED</span>
      <h2>最新内容</h2>
    </div>
    <p>{{ all.length }} 篇记录，持续更新中</p>
  </header>

  <div v-if="posts.length === 0" class="empty">暂无文章</div>

  <div v-else class="content-grid">
    <template v-for="item of paged" :key="item.url">
      <a v-if="item.isProject" :href="base + item.url" class="content-card project-card">
        <div class="project-glow"></div>
        <div class="card-topline"><span class="card-kind">SELECTED PROJECT</span></div>
        <div class="card-body">
          <h3>{{ item.frontmatter.title }}</h3>
          <p v-if="item.frontmatter.desc">{{ item.frontmatter.desc }}</p>
        </div>
        <div class="project-meta">
          <span v-if="item.frontmatter.status">{{ item.frontmatter.status }}</span>
          <span v-for="tag in item.frontmatter.tags?.slice(0, 2)" :key="tag">{{ tag }}</span>
        </div>
      </a>
      <a v-else :href="base + item.url" class="content-card article-card">
        <div class="card-topline"><span class="card-kind">ARTICLE</span></div>
        <div class="card-body">
          <h3>{{ item.frontmatter.title }}</h3>
        </div>
        <time>{{ item.frontmatter.date || '技术笔记' }}</time>
      </a>
    </template>
  </div>

  <div v-if="totalPages > 1" class="pagination">
    <button @click="prev" :disabled="page === 1" class="page-btn">上一页</button>
    <span class="page-info">{{ page }} / {{ totalPages }}</span>
    <button @click="next" :disabled="page === totalPages" class="page-btn">下一页</button>
  </div>
</main>
