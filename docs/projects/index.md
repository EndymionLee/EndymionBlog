---
title: 项目
---
<script setup>
import { data as projects } from '../.vitepress/projects.data'
const base = ''
</script>

<div class="projects-page">
  <header class="projects-hero">
    <span>SELECTED WORK</span>
    <h1>项目</h1>
    <p> </p>
  </header>

<div v-if="projects.length" class="project-showcase">
    <a v-for="p of projects" :key="p.url" :href="base + p.url" class="showcase-card">
      <div class="showcase-orb"></div>
      <div class="showcase-top"><span>PROJECT</span></div>
      <div class="showcase-content">
        <h2>{{ p.frontmatter.title }}</h2>
        <p>{{ p.frontmatter.desc || '查看项目详情与开发记录。' }}</p>
      </div>
      <footer>
        <span v-if="p.frontmatter.status" class="project-status">{{ p.frontmatter.status }}</span>
        <span v-for="tag in p.frontmatter.tags" :key="tag" class="project-tag">{{ tag }}</span>
      </footer>
    </a>
  </div>

<div v-else class="empty">暂无项目</div>
</div>
