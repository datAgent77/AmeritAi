const fs = require("node:fs")
const path = require("node:path")

const projectRoot = process.cwd()
const isVercel = process.env.VERCEL === "1"
const localDistDir = process.env.NEXT_DIST_DIR || ".next-build"
const distDirs = new Set([isVercel ? ".next" : localDistDir])

for (const dir of distDirs) {
  if (!dir || dir === "." || path.isAbsolute(dir)) continue

  const target = path.join(projectRoot, dir)
  fs.rmSync(target, { recursive: true, force: true })
  console.log(`Removed ${dir}`)
}
