import { spawn } from 'child_process'

export function parseExecCommand(exec: string): { command: string; args: string[] } {
  const cleaned = exec.replace(/%[fFuUdDnNickvm]/g, '').trim()
  const args: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === '\\' && i + 1 < cleaned.length && inQuote) {
      current += cleaned[++i]
    } else if (/\s/.test(ch) && !inQuote) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current) args.push(current)

  return { command: args[0] || '', args: args.slice(1) }
}

export function launchApp(execCommand: string): Promise<number> {
  return new Promise((resolve) => {
    const { command, args } = parseExecCommand(execCommand)
    if (!command) {
      resolve(0)
      return
    }
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      })
      child.on('error', () => {
        resolve(0)
      })
      child.unref()
      resolve(child.pid || 0)
    } catch {
      resolve(0)
    }
  })
}
