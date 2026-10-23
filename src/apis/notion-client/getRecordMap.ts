import { fetchPage } from "src/libs/utils/notion/fetchPage"

export const getRecordMap = async (pageId: string) => {
  return fetchPage(pageId)
}
