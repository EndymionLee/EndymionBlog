---
title: 项目
---

<script setup>
import { ref } from 'vue'
import { data as projects } from '../.vitepress/projects.data'
const base = ''

const open = ref({})
function toggle(name) { open.value[name] = !open.value[name] }
</script>

# 项目

<div v-for="p of projects" :key="p.url" style="margin-bottom:0.5rem;border:1px solid var(--vp-c-divider);border-radius:8px;overflow:hidden">
  <a :href="base + p.url" style="display:block;padding:0.8rem 1rem;text-decoration:none;color:inherit;transition:background .2s" @mouseenter="e => e.currentTarget.style.background = 'var(--vp-c-bg-soft)'" @mouseleave="e => e.currentTarget.style.background = ''">
    <div style="font-weight:600">{{ p.frontmatter.title }}</div>
    <div v-if="p.frontmatter.desc" style="font-size:0.85rem;color:var(--vp-c-text-2);margin-top:4px">{{ p.frontmatter.desc }}</div>
    <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
      <span v-for="tag in p.frontmatter.tags" :key="tag" style="font-size:0.75rem;padding:1px 6px;border-radius:4px;background:var(--vp-c-brand-soft);color:var(--vp-c-brand-1)">{{ tag }}</span>
    </div>
  </a>
</div>

<div v-if="projects.length === 0" style="color:var(--vp-c-text-2);padding:2rem 0">暂无项目</div>
