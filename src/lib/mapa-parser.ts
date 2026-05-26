import type { MapaBloco, MapaEmpreendimento, MapaUnidade, UnidadeStatus } from '@/types/mapa'

/** Normaliza bloco para "BL 01", "BL 02" etc.
 *  "1" → "BL 01" | "Bloco 2" → "BL 02" | "BL01" → "BL 01" | sem número → retorna original */
export function normBloco(v: any): string {
  const s = String(v ?? '').trim()
  const m = s.match(/\d+/)
  if (!m) return s
  return `BL ${m[0].padStart(2, '0')}`
}

function normStatus(s: any): UnidadeStatus {
  // Remove acentos (ex: "disponível" → "disponivel") antes de comparar
  const v = String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  if (v.includes('dispon'))                        return 'disponivel'
  if (v.includes('reserv'))                        return 'reservada'
  if (v.includes('vend'))                          return 'vendida'
  if (v.includes('bloq'))                          return 'bloqueada'
  if (v.includes('proc') || v.includes('distrat')) return 'em_processo'
  return 'desconhecido'
}

const toNum = (v: any): number | undefined => {
  if (v == null || v === '' || v === 0) return undefined
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) || n <= 0 ? undefined : n
}

const toStr = (v: any): string | undefined => {
  const s = String(v ?? '').trim()
  return s && s !== '0' ? s : undefined
}

export function parseMapa(raw: any, idEmpreendimento: string): MapaEmpreendimento {
  const items: any[] = Array.isArray(raw) ? raw : (raw?.dados ?? [])
  const blocoMap = new Map<string, MapaBloco>()
  // Deduplicação: o CVCRM às vezes repete os mesmos itens em todas as páginas.
  // Usamos idunidade como chave primária; como fallback, bloco+unidade.
  const seenIds = new Set<string>()
  let nomeEmpreendimento = ''

  for (const item of items) {
    // Deduplica por idunidade (ou bloco+unidade se idunidade ausente)
    const uid = String(item.idunidade ?? '').trim()
    const dedupeKey = uid || `${item.bloco}::${item.unidade}`
    if (seenIds.has(dedupeKey)) continue
    seenIds.add(dedupeKey)

    if (!nomeEmpreendimento && item.nome_empreendimento) {
      nomeEmpreendimento = item.nome_empreendimento
    }

    // Fase: '' se não houver dado (sem fallback para 'Fase 1')
    const fase  = String(item.etapa ?? item.fase ?? item.nome_etapa ?? item.idetapa ?? '').trim()
    // Bloco normalizado na origem
    const bloco = normBloco(item.bloco ?? item.nome_bloco ?? item.idbloco ?? item.bl ?? '')
    const key   = `${fase}||${bloco}`

    // Remove prefixo de bloco duplicado do campo unidade.
    // CVCRM retorna diferentes formatos dependendo do empreendimento:
    //   "BL 01 - APT 101"  (com espaço antes e depois do hífen)
    //   "BL 01 - 101"      (mesmo formato)
    //   "BL 01 -101"       (sem espaço depois do hífen — Prime Caxias, Seleto Inhaúma)
    // Regex captura todos os casos: prefixo "BL XX" seguido de " -" com qualquer espaçamento.
    let unidadeStr = String(item.unidade ?? item.idunidade_int ?? item.idunidade ?? '').trim()
    unidadeStr = unidadeStr.replace(/^BL\s*\d+\s*-\s*/i, '').trim()

    const unidade: MapaUnidade = {
      id:      item.idunidade,
      unidade: unidadeStr,
      bloco,
      fase,
      status: normStatus(item.situacao ?? item.status ?? item.situacao_unidade ?? item.status_unidade),
      area_total:     toNum(item.area_total     ?? item.areaTotal     ?? item.area         ?? item.area_util   ?? item.metragem),
      area_privativa: toNum(item.area_privativa ?? item.areaPrivativa ?? item.area_priv    ?? item.areaPriv    ?? item.area_interna),
      area_comum:     toNum(item.area_comum     ?? item.areaComum     ?? item.area_externa ?? item.areaExterna),
      fracao_ideal:   toNum(item.fracao_ideal   ?? item.fracaoIdeal   ?? item.fracao),
      vagas:          toNum(item.vagas          ?? item.vaga          ?? item.garagem      ?? item.qtd_vagas   ?? item.num_vagas),
      tipo:           toStr(item.tipo           ?? item.tipologia     ?? item.tipo_imovel  ?? item.planta      ?? item.modelo),
      descricao:      toStr(item.descricao      ?? item.observacao    ?? item.obs),
      raw: item,
    }

    if (!blocoMap.has(key)) blocoMap.set(key, { fase, bloco, unidades: [] })
    blocoMap.get(key)!.unidades.push(unidade)
  }

  const blocos = Array.from(blocoMap.values()).sort((a, b) => {
    const f = a.fase.localeCompare(b.fase, 'pt-BR', { numeric: true })
    return f !== 0 ? f : a.bloco.localeCompare(b.bloco, 'pt-BR', { numeric: true })
  })

  const totais = blocos.reduce(
    (acc, b) => {
      for (const u of b.unidades) {
        acc[u.status] = (acc[u.status] ?? 0) + 1
        acc.total++
      }
      return acc
    },
    { disponivel: 0, reservada: 0, vendida: 0, bloqueada: 0, em_processo: 0, desconhecido: 0, total: 0 } as any
  )

  return { id_empreendimento: idEmpreendimento, nome: nomeEmpreendimento, blocos, totais }
}
