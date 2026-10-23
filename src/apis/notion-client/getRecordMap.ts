import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI({ apiBaseUrl: CONFIG.notionConfig.apiBaseUrl })
  const recordMap = await api.getPage(pageId)
  return recordMap
}
