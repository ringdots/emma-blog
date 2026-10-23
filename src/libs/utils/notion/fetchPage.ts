import { NotionAPI } from "notion-client"
import { getBlockCollectionId, getPageContentBlockIds } from "notion-utils"
import { ExtendedRecordMap } from "notion-types"
import { CONFIG } from "site.config"

/**
 * Notion now wraps records as `{ value: { role, value: record } }`.
 * notion-client v6 expects `{ role, value: record }`, so it silently skips
 * collections (empty post list) and image signing. Unwrap them here.
 */
const unwrapTable = (table?: Record<string, any>) => {
  if (!table) return {}
  for (const id of Object.keys(table)) {
    const entry = table[id]
    const inner = entry?.value
    if (inner && typeof inner === "object" && inner.value && !inner.id) {
      table[id] = { ...entry, role: inner.role ?? entry.role, value: inner.value }
    }
  }
  return table
}

const TABLES = ["block", "collection", "collection_view", "notion_user"] as const

const normalize = (recordMap: any) => {
  for (const t of TABLES) recordMap[t] = unwrapTable(recordMap[t])
  return recordMap
}

export const createNotionAPI = () =>
  new NotionAPI({ apiBaseUrl: CONFIG.notionConfig.apiBaseUrl })

export const fetchPage = async (pageId: string): Promise<ExtendedRecordMap> => {
  const api = createNotionAPI()

  let recordMap: any
  try {
    recordMap = await api.getPage(pageId, {
      fetchCollections: false,
      fetchMissingBlocks: false,
      signFileUrls: false,
    })
  } catch (error: any) {
    console.error(
      `[notion] getPage failed for ${pageId} via ${CONFIG.notionConfig.apiBaseUrl}:`,
      error?.response?.statusCode ?? "",
      error?.message
    )
    throw new Error(`[notion] getPage failed: ${error?.message}`)
  }
  normalize(recordMap)
  recordMap.collection_query = recordMap.collection_query ?? {}

  // Fetch blocks referenced by the page but not included in the first chunk
  for (let i = 0; i < 5; i++) {
    const missing = getPageContentBlockIds(recordMap).filter(
      (id) => !recordMap.block[id]
    )
    if (!missing.length) break
    try {
      const res: any = await api.getBlocks(missing)
      recordMap.block = {
        ...recordMap.block,
        ...unwrapTable(res?.recordMap?.block),
      }
    } catch (error: any) {
      console.warn(`[notion] getBlocks failed: ${error?.message}`)
      break
    }
  }

  // Query every database view on the page (this is what lists the posts)
  for (const blockId of getPageContentBlockIds(recordMap)) {
    const block = recordMap.block[blockId]?.value
    if (
      !block ||
      (block.type !== "collection_view" && block.type !== "collection_view_page")
    )
      continue
    const collectionId = getBlockCollectionId(block, recordMap)
    if (!collectionId) continue

    for (const viewId of block.view_ids ?? []) {
      const view = recordMap.collection_view[viewId]?.value
      try {
        const res: any = await api.getCollectionData(collectionId, viewId, view)
        const rm = normalize(res?.recordMap ?? {})
        recordMap.block = { ...recordMap.block, ...rm.block }
        recordMap.collection = { ...recordMap.collection, ...rm.collection }
        recordMap.collection_view = {
          ...recordMap.collection_view,
          ...rm.collection_view,
        }
        recordMap.notion_user = { ...recordMap.notion_user, ...rm.notion_user }
        recordMap.collection_query[collectionId] = {
          ...recordMap.collection_query[collectionId],
          [viewId]: res?.result?.reducerResults,
        }
      } catch (error: any) {
        console.warn(
          `[notion] queryCollection failed for view ${viewId}: ${error?.message}`
        )
      }
    }
  }

  try {
    await api.addSignedUrls({ recordMap })
  } catch (error: any) {
    console.warn(`[notion] addSignedUrls failed: ${error?.message}`)
  }

  return recordMap as ExtendedRecordMap
}
