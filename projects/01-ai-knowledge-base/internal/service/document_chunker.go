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

// ChunkText splits text into overlapping chunks
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
