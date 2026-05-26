import type { MapaBloco, MapaEmpreendimento, MapaUnidade, UnidadeStatus } from '@/types/mapa'

function normStatus(s: any): UnidadeStatus {
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
  let nomeEmpreendimento = ''

  for (const item of items) {
    if (!nomeEmpreendimento && item.nome_empreendimento) {
      nomeEmpreendimento = item.nome_empreendimento
    }

    const fase  = String(item.etapa  ?? item.idetapa  ?? 'Fase 1').trim()
    const bloco = String(item.bloco  ?? item.idbloco  ?? 'Bloco').trim()
    const key   = `${fase}||${bloco}`

    const unidade: MapaUnidade = {
      id:      item.idunidade,
      unidade: String(item.unidade ?? item.idunidade_int ?? item.idunidade ?? '').trim(),
      bloco,
      fase,
      status: normStatus(item.situacao ?? item.status),
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
