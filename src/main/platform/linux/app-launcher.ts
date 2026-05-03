import { spawn } from 'child_process'

export function parseExecCommand(exec: string): { command: string; args: string[] } {
  // Remove field codes (%f, %F, %u, %U, %i, %c, %k, etc.)
  const cleaned = exec.replace(/%[fFuUdDnNickvm]/g, '').trim()
  const parts = cleaned.split(/\s+/)
  return { command: parts[0], args: parts.slice(1) }
}

export function launchApp(execCommand: string): number {
  const { command, args } = parseExecCommand(execCommand)
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  })
  child.unref()
  return child.pid || 0
}
