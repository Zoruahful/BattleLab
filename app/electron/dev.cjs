const { spawn } = require('node:child_process')
const electronPath = require('electron')

const vitePort = process.env.BATTLELAB_DEV_PORT || '5173'
const viteUrl = `http://localhost:${vitePort}`

function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
}

function waitForVite(url, timeoutMs = 30000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          resolve()
          return
        }
      } catch {
        // Vite is still starting.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for Vite at ${url}`))
        return
      }

      setTimeout(check, 250)
    }

    void check()
  })
}

const vite = run('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', vitePort])

waitForVite(viteUrl)
  .then(() => {
    const electron = run(electronPath, ['electron/main.cjs'], {
      env: {
        ...process.env,
        BATTLELAB_DEV_SERVER_URL: viteUrl,
      },
    })

    electron.on('exit', (code) => {
      vite.kill()
      process.exit(code ?? 0)
    })
  })
  .catch((error) => {
    console.error(error)
    vite.kill()
    process.exit(1)
  })
