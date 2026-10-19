// TEMPORARY read-only export function. Delete after migration.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-token',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const TABLES = [
  'settings', 'team_members', 'user_roles', 'whatsapp_instances', 'x9_permissions',
  'monitored_groups', 'group_members', 'tickets', 'messages', 'ticket_demands', 'sla_notifications',
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const expected = Deno.env.get('EXPORT_TOKEN')
  const provided = req.headers.get('x-export-token') ?? ''
  if (!expected || !safeEqual(provided, expected)) return json({ error: 'Unauthorized' }, 401)
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const url = new URL(req.url)
  const table = url.searchParams.get('table') ?? ''
  const page = Number(url.searchParams.get('page') ?? '0')
  const pageSizeRaw = Number(url.searchParams.get('page_size') ?? '1000')
  const since = url.searchParams.get('since')

  if (!Number.isInteger(page) || page < 0) return json({ error: 'invalid page' }, 400)
  if (!Number.isInteger(pageSizeRaw) || pageSizeRaw < 1) return json({ error: 'invalid page_size' }, 400)
  const pageSize = Math.min(pageSizeRaw, 1000)
  if (since && isNaN(Date.parse(since))) return json({ error: 'invalid since' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    if (table === 'auth_users') {
      const { data, error } = await supabase.auth.admin.listUsers({ page: page + 1, perPage: pageSize })
      if (error) throw error
      const rows = data.users.map((u) => ({
        id: u.id, email: u.email, created_at: u.created_at, raw_user_meta_data: u.user_metadata,
      }))
      const total = (data as { total?: number }).total ?? rows.length
      return json({ table, page, page_size: pageSize, total, rows })
    }

    if (!TABLES.includes(table)) return json({ error: 'invalid table' }, 400)

    const tsCol = table === 'sla_notifications' ? 'notified_at' : 'created_at'
    const from = page * pageSize
    let q = supabase.from(table).select('*', { count: 'exact' })
    if (since) q = q.gte(tsCol, since)
    const { data, error, count } = await q
      .order(tsCol, { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error

    return json({ table, page, page_size: pageSize, total: count ?? 0, rows: data ?? [] })
  } catch (e) {
    console.error('export-data error', e)
    return json({ error: 'Internal error' }, 500)
  }
})
