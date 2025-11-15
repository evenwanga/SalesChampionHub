import { describe, expect, it, vi, beforeEach } from 'vitest'
import searchService from './searchService'
import api from './api'

vi.mock('./api', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
  }
})

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> }

const buildEmbeddingResponse = (value = 0.1) => ({
  data: {
    data: {
      embedding: Array(1024).fill(value),
    },
  },
})

describe('searchService.buildQueryPayload', () => {
  beforeEach(() => {
    mockedApi.post.mockReset()
  })

  it('throws when query is empty', async () => {
    await expect(
      searchService.buildQueryPayload({ type: 'search', query: '   ', kbIds: [] })
    ).rejects.toThrow('请输入查询内容')
  })

  it('builds search payload with sanitized query and min score', async () => {
    mockedApi.post.mockResolvedValue(buildEmbeddingResponse())

    const payload = await searchService.buildQueryPayload({
      type: 'search',
      query: ' hello ',
      kbIds: ['kb-1'],
      topK: 5,
      minScore: 0.6,
      searchType: 'semantic',
    })

    expect(mockedApi.post).toHaveBeenCalledWith('/embedding', { text: 'hello' })
    expect(payload).toMatchObject({
      query_text: 'hello',
      kb_ids: ['kb-1'],
      top_k: 5,
      min_score: 0.6,
      search_type: 'semantic',
    })
  })

  it('surface friendly message when embedding API fails', async () => {
    mockedApi.post.mockRejectedValue(new Error('network down'))

    await expect(
      searchService.buildQueryPayload({ type: 'search', query: ' question ', kbIds: ['kb'] })
    ).rejects.toThrow('生成查询向量时出现问题，请稍后再试')
  })
})
