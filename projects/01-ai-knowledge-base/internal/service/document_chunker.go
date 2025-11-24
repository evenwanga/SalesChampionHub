package service

import (
	"strings"
	"unicode/utf8"
)

// DocumentChunker splits text into chunks for embedding
type DocumentChunker struct {
	chunkSize   int // Size of each chunk in characters
	overlapSize int // Overlap between chunks in characters
}

// NewDocumentChunker creates a new document chunker
func NewDocumentChunker(chunkSize, overlapSize int) *DocumentChunker {
	return &DocumentChunker{
		chunkSize:   chunkSize,
		overlapSize: overlapSize,
	}
}

// ChunkText splits text into overlapping chunks with intelligent paragraph boundary detection
func (c *DocumentChunker) ChunkText(text string) []string {
	if text == "" {
		return []string{}
	}

	// Clean and normalize text
	text = strings.TrimSpace(text)
	text = normalizeWhitespace(text)

	textLen := utf8.RuneCountInString(text)

	// If text is smaller than chunk size, return as single chunk
	if textLen <= c.chunkSize {
		return []string{text}
	}

	// Try paragraph-based chunking first for better semantic coherence
	paragraphChunks := c.chunkByParagraphs(text)
	if len(paragraphChunks) > 0 && c.validateChunks(paragraphChunks) {
		return paragraphChunks
	}

	// Fall back to standard overlapping chunking
	var chunks []string
	runes := []rune(text)
	start := 0

	for start < len(runes) {
		// Calculate end position
		end := start + c.chunkSize
		if end > len(runes) {
			end = len(runes)
		}

		// Try to find a good breaking point (sentence or paragraph boundary)
		if end < len(runes) {
			end = c.findBreakPoint(runes, start, end)
		}

		// Extract chunk
		chunk := string(runes[start:end])
		chunk = strings.TrimSpace(chunk)

		if chunk != "" {
			chunks = append(chunks, chunk)
		}

		// Move to next chunk with overlap
		if end >= len(runes) {
			break
		}
		start = end - c.overlapSize
		if start < 0 {
			start = 0
		}
	}

	return chunks
}

// chunkByParagraphs attempts to chunk text based on paragraph boundaries
func (c *DocumentChunker) chunkByParagraphs(text string) []string {
	// Split by double newlines (paragraph boundaries)
	paragraphs := strings.Split(text, "\n\n")
	if len(paragraphs) <= 1 {
		return nil // Not enough paragraphs, use standard chunking
	}

	var chunks []string
	var currentChunk strings.Builder
	var currentLen int

	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			continue
		}

		paraLen := utf8.RuneCountInString(para)

		// If single paragraph exceeds chunk size, split it
		if paraLen > c.chunkSize {
			// Flush current chunk if not empty
			if currentChunk.Len() > 0 {
				chunks = append(chunks, currentChunk.String())
				currentChunk.Reset()
				currentLen = 0
			}
			// Split oversized paragraph
			subChunks := c.splitOversizedParagraph(para)
			chunks = append(chunks, subChunks...)
			continue
		}

		// Try to add paragraph to current chunk
		if currentLen+paraLen+2 <= c.chunkSize {
			// Add to current chunk
			if currentChunk.Len() > 0 {
				currentChunk.WriteString("\n\n")
				currentLen += 2
			}
			currentChunk.WriteString(para)
			currentLen += paraLen
		} else {
			// Current chunk is full, start new chunk
			if currentChunk.Len() > 0 {
				chunks = append(chunks, currentChunk.String())
			}
			currentChunk.Reset()
			currentChunk.WriteString(para)
			currentLen = paraLen
		}
	}

	// Add remaining chunk
	if currentChunk.Len() > 0 {
		chunks = append(chunks, currentChunk.String())
	}

	return chunks
}

// splitOversizedParagraph splits a paragraph that exceeds chunk size
func (c *DocumentChunker) splitOversizedParagraph(para string) []string {
	var chunks []string
	runes := []rune(para)
	start := 0

	for start < len(runes) {
		end := start + c.chunkSize
		if end > len(runes) {
			end = len(runes)
		}

		// Find sentence boundary
		if end < len(runes) {
			end = c.findBreakPoint(runes, start, end)
		}

		chunk := string(runes[start:end])
		chunk = strings.TrimSpace(chunk)
		if chunk != "" {
			chunks = append(chunks, chunk)
		}

		// Move with smaller overlap for paragraph splits
		start = end - (c.overlapSize / 2)
		if start < 0 {
			start = 0
		}
	}

	return chunks
}

// validateChunks checks if paragraph-based chunks are reasonable
func (c *DocumentChunker) validateChunks(chunks []string) bool {
	if len(chunks) == 0 {
		return false
	}

	// Check if chunks are reasonably sized
	for _, chunk := range chunks {
		chunkLen := utf8.RuneCountInString(chunk)
		// Allow some variance (50% smaller is OK, but not too small)
		if chunkLen < c.chunkSize/4 && len(chunks) > 1 {
			return false // Chunks are too small, use standard chunking
		}
	}

	return true
}

// findBreakPoint finds a good place to break the text (sentence or paragraph boundary)
func (c *DocumentChunker) findBreakPoint(runes []rune, start, end int) int {
	// Look backwards from end for a good breaking point
	searchStart := end - 100 // Look back up to 100 characters
	if searchStart < start {
		searchStart = start
	}

	// First, try to find paragraph break
	for i := end - 1; i >= searchStart; i-- {
		if i+1 < len(runes) && runes[i] == '\n' && runes[i+1] == '\n' {
			return i + 1
		}
	}

	// Then try to find sentence break
	for i := end - 1; i >= searchStart; i-- {
		if isSentenceEnd(runes, i) {
			return i + 1
		}
	}

	// Finally, try to find word boundary
	for i := end - 1; i >= searchStart; i-- {
		if isWordBoundary(runes[i]) {
			return i + 1
		}
	}

	// If no good break point found, just use the original end
	return end
}

// isSentenceEnd checks if the position is the end of a sentence
func isSentenceEnd(runes []rune, pos int) bool {
	if pos < 0 || pos >= len(runes) {
		return false
	}

	char := runes[pos]

	// Check for sentence-ending punctuation
	if char == '.' || char == '!' || char == '?' || char == '。' || char == '！' || char == '？' {
		// Make sure it's followed by space or end of text
		if pos+1 >= len(runes) {
			return true
		}
		nextChar := runes[pos+1]
		return nextChar == ' ' || nextChar == '\n' || nextChar == '\t'
	}

	return false
}

// isWordBoundary checks if the character is a word boundary
func isWordBoundary(char rune) bool {
	return char == ' ' || char == '\n' || char == '\t' || char == ',' || char == ';' || char == '，' || char == '、'
}

// normalizeWhitespace normalizes whitespace in text
func normalizeWhitespace(text string) string {
	// First, clean invalid UTF-8 characters
	text = cleanInvalidUTF8(text)

	// Replace multiple spaces with single space
	text = strings.Join(strings.Fields(text), " ")

	// Normalize line breaks
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")

	// Remove excessive line breaks (more than 2 consecutive)
	for strings.Contains(text, "\n\n\n") {
		text = strings.ReplaceAll(text, "\n\n\n", "\n\n")
	}

	return text
}

// cleanInvalidUTF8 removes invalid UTF-8 characters and null bytes that PostgreSQL cannot store
func cleanInvalidUTF8(text string) string {
	// Convert to runes to handle UTF-8 properly
	runes := []rune(text)
	cleaned := make([]rune, 0, len(runes))

	for _, r := range runes {
		// Skip null bytes (0x00) - PostgreSQL cannot store these
		if r == 0 {
			continue
		}

		// Skip other control characters except newline, tab, and carriage return
		if r < 32 && r != '\n' && r != '\t' && r != '\r' {
			continue
		}

		// Skip invalid Unicode characters
		if r == utf8.RuneError {
			continue
		}

		// Skip Unicode replacement character (often indicates encoding issues)
		if r == '\uFFFD' {
			continue
		}

		cleaned = append(cleaned, r)
	}

	return string(cleaned)
}

// ChunkWithMetadata splits text and includes metadata about each chunk
type ChunkWithMetadata struct {
	Content    string
	Index      int
	Length     int
	StartPos   int
	EndPos     int
	IsComplete bool // Whether this chunk contains complete sentences
}

// ChunkTextWithMetadata splits text into chunks with metadata
func (c *DocumentChunker) ChunkTextWithMetadata(text string) []ChunkWithMetadata {
	chunks := c.ChunkText(text)
	result := make([]ChunkWithMetadata, len(chunks))

	currentPos := 0
	for i, chunk := range chunks {
		chunkLen := utf8.RuneCountInString(chunk)
		result[i] = ChunkWithMetadata{
			Content:    chunk,
			Index:      i,
			Length:     chunkLen,
			StartPos:   currentPos,
			EndPos:     currentPos + chunkLen,
			IsComplete: c.isCompleteChunk(chunk),
		}
		currentPos += chunkLen - c.overlapSize
	}

	return result
}

// isCompleteChunk checks if a chunk contains complete sentences
func (c *DocumentChunker) isCompleteChunk(chunk string) bool {
	chunk = strings.TrimSpace(chunk)
	if chunk == "" {
		return false
	}

	lastChar := rune(chunk[len(chunk)-1])
	return lastChar == '.' || lastChar == '!' || lastChar == '?' || lastChar == '。' || lastChar == '！' || lastChar == '？'
}
