import * as XLSX from 'xlsx'

export interface LinhaImport {
  bloco: string
  unidade: string
  valor_venda: number
  valor_avaliacao?: number | null
}

export interface ResultadoImport {
  validas: LinhaImport[]
  invalidas: { linha: number; motivo: string; raw: any }[]
}

const HEADER_ALIASES: Record<string, string> = {
  bloco: 'bloco', block: 'bloco', lote: 'bloco',
  unidade: 'unidade', unit: 'unidade', apto: 'unidade', apartamento: 'unidade',
  valor: 'valor_venda', valor_venda: 'valor_venda', preco: 'valor_venda', price: 'valor_venda',
  valor_avaliacao: 'valor_avaliacao', avaliacao: 'valor_avaliacao', appraisal: 'valor_avaliacao',
}

function parseValor(v: any): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function normalizeRow(row: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    const key = HEADER_ALIASES[String(k).trim().toLowerCase()]
    if (key) out[key] = v
  }
  return out
}

function parseCSV(text: string): Record<string, any>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const split = (line: string) => {
    const out: string[] = []; let cur = ''; let q = false
    for (const c of line) {
      if (c === '"') { q = !q; continue }
      if (c === sep && !q) { out.push(cur); cur = ''; continue }
      cur += c
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
  const headers = split(lines[0]).map(h => h.toLowerCase())
  return lines.slice(1).map(l => {
    const cols = split(l)
    const row: Record<string, any> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return row
  })
}

export async function lerArquivoValores(file: File): Promise<Record<string, any>[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCSV(await file.text())
  }
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: true })
}

export function validarLinhas(rows: Record<string, any>[]): ResultadoImport {
  const validas: LinhaImport[] = []
  const invalidas: ResultadoImport['invalidas'] = []
  rows.forEach((raw, idx) => {
    const r     = normalizeRow(raw)
    const bloco   = String(r.bloco   ?? '').trim()
    const unidade = String(r.unidade ?? '').trim()
    const valor   = parseValor(r.valor_venda)
    const aval    = parseValor(r.valor_avaliacao)
    if (!bloco || !unidade)          { invalidas.push({ linha: idx + 2, motivo: 'bloco/unidade ausentes', raw }); return }
    if (valor == null && aval == null) return // linha vazia — ignora
    if (valor == null || valor < 0)  { invalidas.push({ linha: idx + 2, motivo: 'valor_venda inválido', raw });   return }
    validas.push({ bloco, unidade, valor_venda: valor, valor_avaliacao: aval })
  })
  return { validas, invalidas }
}

export function gerarTemplate(unidades: { bloco: string; unidade: string }[], format: 'csv' | 'xlsx') {
  const headers = ['bloco', 'unidade', 'valor_venda', 'valor_avaliacao']
  const rows = unidades.map(u => ({ bloco: u.bloco, unidade: u.unidade, valor_venda: '', valor_avaliacao: '' }))
  if (format === 'csv') {
    const csv = [headers.join(','), ...rows.map(r => `${r.bloco},${r.unidade},,`)].join('\n')
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'template-valores.csv')
  } else {
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'valores')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'template-valores.xlsx')
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
