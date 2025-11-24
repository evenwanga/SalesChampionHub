"""
BGE Embedding Service
FastAPI service for generating text embeddings using BGE-large-zh model
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import torch
from transformers import AutoTokenizer, AutoModel
import logging
import time
import sys

# Ensure UTF-8 encoding for proper Chinese character handling
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with UTF-8 support
app = FastAPI(
    title="BGE Embedding Service",
    description="Text embedding service using BGE-large-zh model (1024 dimensions)",
    version="1.0.0"
)

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and tokenizer
model = None
tokenizer = None
MODEL_NAME = "BAAI/bge-large-zh-v1.5"
EMBEDDING_DIM = 1024

class EmbedRequest(BaseModel):
    """Request model for embedding generation"""
    texts: List[str]
    normalize: bool = True

class EmbedResponse(BaseModel):
    """Response model for embedding generation"""
    embeddings: List[List[float]]
    model: str
    dimension: int
    processing_time_ms: int

@app.on_event("startup")
async def load_model():
    """Load BGE model and tokenizer on startup"""
    global model, tokenizer

    try:
        logger.info(f"Loading BGE model: {MODEL_NAME}")
        start_time = time.time()

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        # Load model
        model = AutoModel.from_pretrained(MODEL_NAME)

        # Use GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device)
        model.eval()

        load_time = time.time() - start_time
        logger.info(f"✅ Model loaded successfully in {load_time:.2f}s")
        logger.info(f"📱 Using device: {device}")
        logger.info(f"📏 Embedding dimension: {EMBEDDING_DIM}")

    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise

def mean_pooling(model_output, attention_mask):
    """Perform mean pooling on token embeddings"""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "BGE Embedding Service",
        "model": MODEL_NAME,
        "dimension": EMBEDDING_DIM,
        "status": "healthy" if model is not None else "loading"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "dimension": EMBEDDING_DIM,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.post("/embeddings", response_model=EmbedResponse)
async def generate_embeddings(request: EmbedRequest):
    """
    Generate embeddings for input texts

    Args:
        request: EmbedRequest containing list of texts

    Returns:
        EmbedResponse with embeddings and metadata
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per request")

    try:
        start_time = time.time()

        # Ensure texts are properly encoded as UTF-8 strings
        # FastAPI should handle this automatically, but we verify here
        texts_utf8 = []
        for text in request.texts:
            # Ensure the text is a proper UTF-8 string
            if isinstance(text, bytes):
                text = text.decode('utf-8', errors='replace')
            texts_utf8.append(str(text))
        
        # Log first few characters of first text for debugging (if Chinese)
        if texts_utf8 and len(texts_utf8[0]) > 0:
            sample_text = texts_utf8[0][:50]  # First 50 chars
            logger.info(f"Processing text sample: {sample_text} (length: {len(texts_utf8[0])})")

        # Tokenize texts with proper UTF-8 encoding
        encoded_input = tokenizer(
            texts_utf8,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        )

        # Move to same device as model
        device = next(model.parameters()).device
        encoded_input = {k: v.to(device) for k, v in encoded_input.items()}

        # Generate embeddings
        with torch.no_grad():
            model_output = model(**encoded_input)
            embeddings = mean_pooling(model_output, encoded_input['attention_mask'])

            # Normalize if requested
            if request.normalize:
                embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        # Convert to list of lists
        embeddings_list = embeddings.cpu().tolist()

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(f"Generated {len(embeddings_list)} embeddings in {processing_time}ms")

        return EmbedResponse(
            embeddings=embeddings_list,
            model=MODEL_NAME,
            dimension=EMBEDDING_DIM,
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def embed_single(text: str):
    """
    Simplified endpoint for embedding a single text

    Args:
        text: Single text to embed

    Returns:
        Dictionary with embedding vector
    """
    request = EmbedRequest(texts=[text])
    response = await generate_embeddings(request)
    return {
        "embedding": response.embeddings[0],
        "dimension": response.dimension,
        "model": response.model
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
