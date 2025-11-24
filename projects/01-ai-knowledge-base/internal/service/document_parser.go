package service

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/gen2brain/go-fitz"
	"github.com/xuri/excelize/v2"
	"golang.org/x/net/html"
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
	case ".xlsx", ".xls":
		return p.parseExcel(filePath)
	case ".pptx", ".ppt":
		return p.parsePowerPoint(filePath)
	case ".doc", ".docx":
		// For now, return placeholder - would need actual Word parser library
		return p.parseWordPlaceholder(filePath)
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedFormat, ext)
	}
}

// parseTextFile reads plain text files (txt, md) with UTF-8 encoding support
func (p *DocumentParser) parseTextFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrParsingFailed, err)
	}

	// Ensure content is valid UTF-8 for proper Chinese character handling
	// Go's string() conversion assumes UTF-8, but we validate here
	text := string(content)
	
	// Validate UTF-8 encoding
	if !isValidUTF8(text) {
		// If not valid UTF-8, try to clean it up
		// This handles cases where file might have encoding issues
		text = cleanInvalidUTF8(text)
	}

	if len(text) > p.maxContentLength {
		text = text[:p.maxContentLength]
	}

	return text, nil
}

// isValidUTF8 checks if a string is valid UTF-8
func isValidUTF8(s string) bool {
	for _, r := range s {
		if r == utf8.RuneError {
			return false
		}
	}
	return true
}

// Note: cleanInvalidUTF8 is defined in document_chunker.go and shared across the package

// parsePDF extracts text from PDF files with UTF-8 encoding support
// Uses go-fitz (MuPDF binding) for better Chinese character support
func (p *DocumentParser) parsePDF(filePath string) (string, error) {
	doc, err := fitz.New(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: failed to open PDF: %v", ErrParsingFailed, err)
	}
	defer doc.Close()

	var content strings.Builder
	totalPages := doc.NumPage()

	for pageNum := 0; pageNum < totalPages; pageNum++ {
		// Extract text from page
		text, err := doc.Text(pageNum)
		if err != nil {
			// Log error but continue with other pages
			continue
		}

		// Clean and validate UTF-8 encoding for proper Chinese character handling
		// go-fitz should handle encoding correctly, but we validate to be safe
		if !isValidUTF8(text) {
			text = cleanInvalidUTF8(text)
		}

		// Trim whitespace and add to content
		text = strings.TrimSpace(text)
		if text != "" {
			content.WriteString(text)
			content.WriteString("\n\n")
		}

		// Check if we've exceeded max length
		if content.Len() > p.maxContentLength {
			result := content.String()
			return result[:p.maxContentLength], nil
		}
	}

	result := content.String()
	
	// Final UTF-8 validation and cleaning of the complete content
	if !isValidUTF8(result) {
		result = cleanInvalidUTF8(result)
	}

	return result, nil
}

// parseHTML extracts text from HTML files using proper HTML parser
func (p *DocumentParser) parseHTML(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrParsingFailed, err)
	}
	defer file.Close()

	doc, err := html.Parse(file)
	if err != nil {
		return "", fmt.Errorf("%w: failed to parse HTML: %v", ErrParsingFailed, err)
	}

	var text strings.Builder
	var extractText func(*html.Node)
	extractText = func(n *html.Node) {
		if n.Type == html.TextNode {
			// Skip script and style content
			if n.Parent != nil && (n.Parent.Data == "script" || n.Parent.Data == "style") {
				return
			}
			text.WriteString(n.Data)
			text.WriteString(" ")
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if text.Len() > p.maxContentLength {
				return
			}
			extractText(c)
		}
	}

	extractText(doc)
	result := text.String()

	// Clean up whitespace
	result = strings.Join(strings.Fields(result), " ")

	if len(result) > p.maxContentLength {
		result = result[:p.maxContentLength]
	}

	return result, nil
}

// parseExcel extracts text from Excel files (.xlsx, .xls)
func (p *DocumentParser) parseExcel(filePath string) (string, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return "", fmt.Errorf("%w: failed to open Excel file: %v", ErrParsingFailed, err)
	}
	defer f.Close()

	var content strings.Builder

	// Get all sheet names
	sheets := f.GetSheetList()

	for _, sheetName := range sheets {
		content.WriteString(fmt.Sprintf("\n[Sheet: %s]\n", sheetName))

		// Get all rows
		rows, err := f.GetRows(sheetName)
		if err != nil {
			continue
		}

		for rowIdx, row := range rows {
			if content.Len() > p.maxContentLength {
				break
			}

			// Format row data
			var rowData []string
			for _, cell := range row {
				if cell != "" {
					rowData = append(rowData, cell)
				}
			}

			if len(rowData) > 0 {
				content.WriteString(fmt.Sprintf("Row %d: %s\n", rowIdx+1, strings.Join(rowData, " | ")))
			}
		}

		if content.Len() > p.maxContentLength {
			break
		}
	}

	result := content.String()
	if len(result) > p.maxContentLength {
		result = result[:p.maxContentLength]
	}

	return result, nil
}

// parsePowerPoint extracts text from PowerPoint files (.pptx)
// Note: Basic implementation - extracts text but not presenter notes or detailed formatting
func (p *DocumentParser) parsePowerPoint(filePath string) (string, error) {
	// PowerPoint parsing is complex and requires unioffice or similar library
	// For .pptx files (which are ZIP archives), we could extract XML and parse
	// For now, returning a placeholder that indicates manual processing needed

	// Check if it's a .pptx file (Office Open XML format)
	ext := strings.ToLower(filepath.Ext(filePath))
	if ext == ".pptx" {
		// .pptx files are ZIP archives containing XML files
		// This is a simplified implementation
		return fmt.Sprintf("[PowerPoint file: %s - Content extraction requires unioffice library. "+
			"To fully support .pptx parsing, integrate github.com/unidoc/unioffice package.]",
			filepath.Base(filePath)), nil
	}

	// .ppt files (binary format) are even more complex
	return fmt.Sprintf("[PowerPoint file: %s - Binary .ppt format requires specialized library]",
		filepath.Base(filePath)), nil
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
		
		// Validate and clean UTF-8 encoding
		if !isValidUTF8(text) {
			text = cleanInvalidUTF8(text)
		}
		
		if len(text) > p.maxContentLength {
			text = text[:p.maxContentLength]
		}
		return text, nil
	default:
		return "", fmt.Errorf("%w: %s (reader parsing only supports text formats)", ErrUnsupportedFormat, ext)
	}
}
