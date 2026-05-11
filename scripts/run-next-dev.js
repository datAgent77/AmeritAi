const { spawn } = require("node:child_process")
const net = require("node:net")

const nextBin = require.resolve("next/dist/bin/next")
const env = {
  ...process.env,
}

const args = process.argv.slice(2)

function extractPort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--port" || a === "-p") {
      const next = argv[i + 1]
      const parsed = Number(next)
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed)
    }
    if (typeof a === "string" && a.startsWith("--port=")) {
      const parsed = Number(a.slice("--port=".length))
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed)
    }
    if (typeof a === "string" && a.startsWith("-p=")) {
      const parsed = Number(a.slice("-p=".length))
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed)
    }
  }
  return null
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once("error", (err) => {
      resolve(false)
    })
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, "0.0.0.0")
  })
}

async function pickPort(start, end) {
  for (let port = start; port <= end; port++) {
    const ok = await canListen(port)
    if (ok) return port
  }
  return null
}

async function main() {
  const existingPort = extractPort(args)
  let effectiveArgs = args

  if (!existingPort) {
    const port = await pickPort(3000, 3010)
    if (port) {
      effectiveArgs = ["--port", String(port), ...args]
    }
  }

  const child = spawn(process.execPath, [nextBin, "dev", ...effectiveArgs], {
    stdio: "inherit",
    env,
  })

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })

  child.on("error", (error) => {
    console.error(error)
    process.exit(1)
  })
}

main()
