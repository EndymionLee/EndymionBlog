# EndymionLee's Blog

EndymionLee 的个人技术博客。

## 技术栈

- **框架**: [VitePress](https://vitepress.dev)
- **部署**: GitHub Pages + GitHub Actions

## 本地开发

```bash
npm install
npm run dev     # 启动开发
npm run build   # 构建
npm run preview # 预览
```

## 部署

```bash
git remote add origin git@github.com:EndymionLee/EndymionBlog.git
git branch -M main
git push
```

push 到 main 分支后，GitHub Actions 自动构建部署。

然后在 GitHub 仓库 Settings → Pages → Source 选 **GitHub Actions**。
