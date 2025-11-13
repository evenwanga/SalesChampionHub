// 开发环境占位符 - 提供空文件以避免 404 错误
// 在开发环境中，window.__ENV__ 不存在，应用会回退到使用 import.meta.env (.env 文件)
// 在生产环境（Docker）中，此文件会被 docker-entrypoint.sh 覆盖并生成真实配置

// 注意：这个文件故意为空（只有注释），不设置 window.__ENV__
// 这样 src/utils/env.ts 会检测到 !window.__ENV__ 并使用 import.meta.env
