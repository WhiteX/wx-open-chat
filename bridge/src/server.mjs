import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)

const app = express()
app.use(express.json({ limit: '2mb' }))

const cfg = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '0.0.0.0',
  token: process.env.BRIDGE_TOKEN || '',
  allowedType: process.env.ALLOWED_TARGET_TYPE || '',
  allowedGroupId: process.env.ALLOWED_GROUP_ID || '',
  allowedTopicId: process.env.ALLOWED_TOPIC_ID || '',
  upstreamUrl: process.env.UPSTREAM_URL || '',
  upstreamToken: process.env.UPSTREAM_TOKEN || '',
  echoMode: String(process.env.ECHO_MODE || 'true') === 'true',
  localAdapterMode: String(process.env.LOCAL_ADAPTER_MODE || 'false') === 'true',
  redactLogs: String(process.env.REDACT_LOGS || 'true') === 'true',
  openclawBin: process.env.OPENCLAW_BIN || 'openclaw',
  openclawThinking: process.env.OPENCLAW_THINKING || '',
  openclawSessionMain: process.env.OPENCLAW_SESSION_MAIN || '',
  openclawStandaloneSession: process.env.OPENCLAW_STANDALONE_SESSION || 'wx-open-chat-main',
  openclawSessionGroupDefault: process.env.OPENCLAW_SESSION_GROUP_DEFAULT || '',
  openclawSessionTopicDefault: process.env.OPENCLAW_SESSION_TOPIC_DEFAULT || '',
  routeMapJsonPath: process.env.OPENCLAW_ROUTE_MAP_JSON || '',
  routeMapInline: process.env.OPENCLAW_ROUTE_MAP || '',
}

function mask(v) {
  if (!v || !cfg.redactLogs) return v || ''
  const s = String(v)
  if (s.length <= 4) return '****'
  return `${s.slice(0, 2)}***${s.slice(-2)}`
}

function unauthorized(res) {
  return res.status(401).json({ error: 'unauthorized' })
}

function validateAuth(req, res) {
  if (!cfg.token) return true
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) {
    unauthorized(res)
    return false
  }
  const token = auth.slice(7)
  if (token !== cfg.token) {
    unauthorized(res)
    return false
  }
  return true
}

function validateBody(body) {
  if (!body || typeof body !== 'object') return 'invalid body'
  if (!body.message || typeof body.message !== 'string') return 'message is required'

  const route = body.route || { type: 'main' }
  if (!route.type || !['main', 'group', 'topic'].includes(route.type)) {
    return 'route.type must be main|group|topic'
  }
  if (route.type === 'group' && !route.groupId) return 'groupId required for group route'
  if (route.type === 'topic' && (!route.groupId || !route.topicId)) {
    return 'groupId and topicId required for topic route'
  }
  return null
}

function validateAllowedRoute(route) {
  if (!cfg.allowedType) return null
  if (route.type !== cfg.allowedType) return `route.type must be ${cfg.allowedType}`
  if (cfg.allowedGroupId && String(route.groupId || '') !== String(cfg.allowedGroupId)) {
    return 'groupId not allowed'
  }
  if (cfg.allowedTopicId && String(route.topicId || '') !== String(cfg.allowedTopicId)) {
    return 'topicId not allowed'
  }
  return null
}

function routeKey(route) {
  if (route.type === 'main') return 'main'
  if (route.type === 'group') return `group:${route.groupId}`
  return `topic:${route.groupId}:${route.topicId}`
}

function loadRouteMap() {
  let map = {}

  if (cfg.routeMapInline) {
    try {
      map = { ...map, ...JSON.parse(cfg.routeMapInline) }
    } catch {
      console.warn('[bridge] invalid OPENCLAW_ROUTE_MAP JSON')
    }
  }

  if (cfg.routeMapJsonPath) {
    try {
      const raw = fs.readFileSync(cfg.routeMapJsonPath, 'utf8')
      map = { ...map, ...JSON.parse(raw) }
    } catch {
      console.warn('[bridge] failed to read OPENCLAW_ROUTE_MAP_JSON')
    }
  }

  return map
}

function resolveSessionId(route) {
  const map = loadRouteMap()
  const key = routeKey(route)

  if (map[key]) return String(map[key])

  if (route.type === 'main' && cfg.openclawSessionMain) return cfg.openclawSessionMain
  if (route.type === 'main') return cfg.openclawStandaloneSession
  if (route.type === 'group' && cfg.openclawSessionGroupDefault) return cfg.openclawSessionGroupDefault
  if (route.type === 'topic' && cfg.openclawSessionTopicDefault) return cfg.openclawSessionTopicDefault

  return ''
}

function pickReply(obj) {
  if (!obj || typeof obj !== 'object') return ''

  const candidateKeys = ['reply', 'text', 'message', 'content', 'output', 'response']
  for (const k of candidateKeys) {
    if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k]
  }

  // OpenClaw CLI common shape: { result: { payloads: [{ text }] } }
  if (obj.result?.payloads && Array.isArray(obj.result.payloads)) {
    const firstText = obj.result.payloads.find((p) => typeof p?.text === 'string' && p.text.trim())?.text
    if (firstText) return firstText
  }

  const nestedKeys = ['result', 'data', 'assistant', 'agent', 'turn', 'lastMessage']
  for (const k of nestedKeys) {
    const nested = obj[k]
    if (nested && typeof nested === 'object') {
      const nestedReply = pickReply(nested)
      if (nestedReply) return nestedReply
    }
  }

  return ''
}

function buildAgentMessage(payload) {
  const activeFilePath = payload?.context?.activeFilePath || ''
  const vaultName = payload?.context?.vaultName || ''
  const vaultPath = payload?.context?.vaultPath || ''
  const selectedText = payload?.context?.selectedText || ''
  const activeFileExcerpt = payload?.context?.activeFileExcerpt || ''

  return [
    'WX Open Chat bridge context:',
    `- vaultName: ${vaultName}`,
    `- vaultPath: ${vaultPath}`,
    `- activeFilePath: ${activeFilePath}`,
    selectedText ? `- selectedText:\n${selectedText}` : '- selectedText: <none>',
    activeFileExcerpt ? `- activeFileExcerpt:\n${activeFileExcerpt}` : '- activeFileExcerpt: <none>',
    '',
    'Execution policy (important):',
    '- If the user asks to modify notes/files, you must actually perform the edit using tools.',
    '- Prefer editing the active file when user says "this/current document".',
    '- Do not claim completion unless the file was changed and re-read for verification.',
    '- After successful edit, include a final line: EDIT_APPLIED:<path>.',
    '- If no edit was requested, include final line: NO_EDIT.',
    '',
    'User message:',
    payload.message,
  ].join('\n')
}

async function callOpenClawLocalAdapter(payload) {
  const sessionId = resolveSessionId(payload.route)
  if (!sessionId) {
    throw new Error(
      'no session mapping for route; set OPENCLAW_SESSION_* or OPENCLAW_ROUTE_MAP(_JSON)'
    )
  }

  const agentMessage = buildAgentMessage(payload)

  const args = ['agent', '--session-id', sessionId, '--message', agentMessage, '--json']
  if (cfg.openclawThinking) {
    args.push('--thinking', cfg.openclawThinking)
  }

  const { stdout } = await execFileAsync(cfg.openclawBin, args, {
    timeout: 120000,
    maxBuffer: 1024 * 1024,
  })

  let parsed = {}
  try {
    parsed = JSON.parse(stdout || '{}')
  } catch {
    parsed = { raw: stdout }
  }

  const reply = pickReply(parsed)

  return {
    reply: reply || '[bridge] openclaw returned no parseable reply',
    meta: {
      mode: 'local-adapter',
      sessionId: cfg.redactLogs ? mask(sessionId) : sessionId,
    },
  }
}

async function forwardUpstream(payload) {
  if (!cfg.upstreamUrl) {
    return { reply: '[bridge] no upstream configured' }
  }

  const headers = { 'Content-Type': 'application/json' }
  if (cfg.upstreamToken) headers.Authorization = `Bearer ${cfg.upstreamToken}`

  const resp = await fetch(cfg.upstreamUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new Error(`upstream ${resp.status}: ${t.slice(0, 300)}`)
  }

  const data = await resp.json().catch(() => ({}))
  return {
    reply: data.reply || data.text || data.message || '[bridge] upstream returned empty response',
  }
}

app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    echoMode: cfg.echoMode,
    localAdapterMode: cfg.localAdapterMode,
    upstreamConfigured: Boolean(cfg.upstreamUrl),
  })
})

app.post('/v1/chat', async (req, res) => {
  if (!validateAuth(req, res)) return

  const err = validateBody(req.body)
  if (err) return res.status(400).json({ error: err })

  const effectiveRoute = req.body.route || { type: 'main' }

  const routeErr = validateAllowedRoute(effectiveRoute)
  if (routeErr) return res.status(403).json({ error: routeErr })

  req.body.route = effectiveRoute
  const route = effectiveRoute
  console.log(
    `[bridge] req route=${route.type} group=${mask(route.groupId)} topic=${mask(route.topicId)} vault=${req.body?.context?.vaultName || ''}`
  )

  try {
    if (cfg.echoMode) {
      return res.json({
        reply: `Echo (${route.type}): ${req.body.message}`,
      })
    }

    if (cfg.localAdapterMode) {
      const localReply = await callOpenClawLocalAdapter(req.body)
      return res.json(localReply)
    }

    const upstreamReply = await forwardUpstream(req.body)
    return res.json(upstreamReply)
  } catch (e) {
    console.error('[bridge] error', e?.message || e)
    return res.status(502).json({ error: 'bridge_upstream_error' })
  }
})

app.listen(cfg.port, cfg.host, () => {
  console.log(`[bridge] wx-open-chat bridge listening on ${cfg.host}:${cfg.port}`)
})
