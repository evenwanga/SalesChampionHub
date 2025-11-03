package service

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/ledongthuc/pdf"
)

var (
	ErrUnsupportedFormat = errors.New("unsupported file format")
	ErrParsingFailed     = errors.New("parsing failed")
)

// DocumentParser handles parsing of different document formats
type DocumentParser struct {
	maxContentLength int // Maximum content length to extract
}

// NewDocumentParser creates a new document parser
func NewDocumentParser(maxContentLength int) *DocumentParser {
	return &DocumentParser{
		maxContentLength: maxContentLength,
	}
}

// ParseFile parses a document file and extracts its text content
func (p *DocumentParser) ParseFile(filePath string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".txt", ".md":
		return p.parseTextFile(filePath)
	case ".pdf":
		return p.parsePDF(filePath)
	case ".html", ".htm":
		return p.parseHTML(filePath)
	case ".doc", ".docx":
		// For now, return placeholder - would need actual Word parser library
		return p.parseWordPlaceholder(filePath)
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedFormat, ext)
	}
}

// parseTextFile reads plain text files (txt, md)
func (p *DocumentParser) parseTextFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrParsingFailed, err)
	}

	text := string(content)
	if len(text) > p.maxContentLength {
		text = text[:p.maxContentLength]
	}

	return text, nil
}

// parsePDF extracts text from PDF files
func (p *DocumentParser) parsePDF(filePath string) (string, error) {
	file, reader, err := pdf.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: failed to open PDF: %v", ErrParsingFailed, err)
	}
	defer file.Close()

	var content strings.Builder
	totalPages := reader.NumPage()

	for pageNum := 1; pageNum <= totalPages; pageNum++ {
		page := reader.Page(pageNum)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Skip pages that fail to extract
			continue
		}

		content.WriteString(text)
		content.WriteString("\n\n")

		// Check if we've exceeded max length
		if content.Len() > p.maxContentLength {
			result := content.String()
			return result[:p.maxContentLength], nil
		}
	}

	return content.String(), nil
}

// parseHTML extracts text from HTML files (basic implementation)
func (p *DocumentParser) parseHTML(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrParsingFailed, err)
	}

	// Basic HTML tag removal (for production, use proper HTML parser like golang.org/x/net/html)
	text := string(content)
	text = removeHTMLTags(text)

	if len(text) > p.maxContentLength {
		text = text[:p.maxContentLength]
	}

	return text, nil
}

// parseWordPlaceholder is a placeholder for Word document parsing
// In production, you would use a library like https://github.com/unidoc/unioffice
func (p *DocumentParser) parseWordPlaceholder(filePath string) (string, error) {
	// For now, return a message indicating the file needs manual processing
	// In production, integrate proper Word document parser
	return fmt.Sprintf("[Word document: %s - manual processing required or integrate Word parser library]", filepath.Base(filePath)), nil
}

// removeHTMLTags removes basic HTML tags from text
// This is a simple implementation - for production use proper HTML parser
func removeHTMLTags(html string) string {
	// Remove script and style tags and their content
	html = removeTagAndContent(html, "script")
	html = removeTagAndContent(html, "style")

	// Simple tag removal
	inTag := false
	var result strings.Builder

	for _, char := range html {
		if char == '<' {
			inTag = true
			continue
		}
		if char == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result.WriteRune(char)
		}
	}

	return result.String()
}

// removeTagAndContent removes a tag and all its content
func removeTagAndContent(html, tag string) string {
	startTag := "<" + tag
	endTag := "</" + tag + ">"

	for {
		start := strings.Index(strings.ToLower(html), startTag)
		if start == -1 {
			break
		}

		end := strings.Index(strings.ToLower(html[start:]), endTag)
		if end == -1 {
			break
		}

		html = html[:start] + html[start+end+len(endTag):]
	}

	return html
}

// ParseFromReader parses content from an io.Reader (useful for testing)
func (p *DocumentParser) ParseFromReader(reader io.Reader, fileExt string) (string, error) {
	ext := strings.ToLower(fileExt)
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	switch ext {
	case ".txt", ".md":
		content, err := io.ReadAll(reader)
		if err != nil {
			return "", fmt.Errorf("%w: %v", ErrParsingFailed, err)
		}
		text := string(content)
		if len(text) > p.maxContentLength {
			text = text[:p.maxContentLength]
		}
		return text, nil
	default:
		return "", fmt.Errorf("%w: %s (reader parsing only supports text formats)", ErrUnsupportedFormat, ext)
	}
}
