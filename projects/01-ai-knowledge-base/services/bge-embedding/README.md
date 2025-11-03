# BGE Embedding Service

Chinese text embedding service using BAAI's BGE-large-zh-v1.5 model.

## Features

- **High-Quality Embeddings**: 1024-dimensional vectors optimized for Chinese text
- **FastAPI**: Modern, fast REST API
- **Batch Processing**: Process multiple texts in a single request
- **Docker Support**: Easy deployment with Docker/Docker Compose
- **Health Checks**: Built-in health monitoring

## API Endpoints

### Generate Embeddings

```http
POST /embeddings
Content-Type: application/json

{
  "texts": ["文本1", "文本2"],
  "normalize": true
}
```

**Response:**
```json
{
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "model": "BAAI/bge-large-zh-v1.5",
  "dimension": 1024,
  "processing_time_ms": 45
}
```

### Embed Single Text

```http
POST /embed?text=你好世界
```

**Response:**
```json
{
  "embedding": [0.1, 0.2, ...],
  "dimension": 1024,
  "model": "BAAI/bge-large-zh-v1.5"
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model": "BAAI/bge-large-zh-v1.5",
  "dimension": 1024,
  "device": "cpu"
}
```

## Docker Deployment

### Build Image

```bash
docker build -t bge-embedding:latest .
```

### Run Container

```bash
docker run -d \
  --name bge-embedding \
  -p 8000:8000 \
  -v bge-model-cache:/root/.cache/huggingface \
  bge-embedding:latest
```

### Using Docker Compose

The service is integrated into the main project's docker-compose.yml:

```bash
# Start all services including BGE
docker-compose up -d

# View BGE service logs
docker-compose logs -f bge-embedding
```

## Configuration

### Environment Variables

- `TRANSFORMERS_CACHE`: Model cache directory (default: `/root/.cache/huggingface`)

### Resource Requirements

- **Memory**: Minimum 2GB, Recommended 4GB
- **Disk**: ~2GB for model download
- **CPU**: Multi-core recommended for faster inference

## Model Information

- **Model**: BAAI/bge-large-zh-v1.5
- **Language**: Chinese
- **Dimension**: 1024
- **Max Input Length**: 512 tokens
- **Use Case**: General-purpose Chinese text embedding

## Performance

- **First Request**: ~30-60s (model loading)
- **Subsequent Requests**:
  - Single text: ~50-100ms
  - Batch (10 texts): ~200-400ms

## Testing

```bash
# Health check
curl http://localhost:8100/health

# Generate embedding
curl -X POST http://localhost:8100/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["人工智能知识库", "语义搜索系统"],
    "normalize": true
  }'
```

## Integration

The BGE service is automatically integrated with the main API server when using Docker Compose. The API server will:

1. Wait for BGE service to be healthy
2. Use BGE for document processing and vector generation
3. Fall back to mock service if BGE is unavailable

## Troubleshooting

### Model Download Issues

If model download fails:
1. Check network connection to Hugging Face
2. Manually download model and mount to `/root/.cache/huggingface`

### Out of Memory

If container runs out of memory:
1. Increase Docker memory limit
2. Process texts in smaller batches
3. Consider using smaller BGE model variant

### Slow Performance

To improve performance:
1. Use GPU-enabled base image if GPU available
2. Increase batch size for bulk operations
3. Enable model caching with persistent volume
