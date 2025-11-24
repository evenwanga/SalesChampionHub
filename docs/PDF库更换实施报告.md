# PDF解析库更换实施报告

## 📋 实施概述

**实施日期**: 2025年1月
**方案**: 方案1 - 更换PDF解析库
**目标**: 解决中文PDF文档解析乱码问题

## ✅ 已完成的更改

### 1. 依赖库更换

**移除的库:**
- `github.com/ledongthuc/pdf v0.0.0-20250511090121-5959a4027728`

**新增的库:**
- `github.com/gen2brain/go-fitz v1.24.15`

**原因:**
- `go-fitz` 是基于 MuPDF 的 Go 绑定，对中文支持更好
- 支持 CID 字体（常用于中文PDF）
- 自动处理字符编码转换

### 2. 代码修改

**文件**: `projects/01-ai-knowledge-base/internal/service/document_parser.go`

**主要变更:**

1. **导入语句更新**
```go
// 旧代码
import "github.com/ledongthuc/pdf"

// 新代码
import "github.com/gen2brain/go-fitz"
```

2. **PDF解析方法重写**
```go
// 旧实现（ledongthuc/pdf）
func (p *DocumentParser) parsePDF(filePath string) (string, error) {
    file, reader, err := pdf.Open(filePath)
    // ... 逐页提取文本
    text, err := page.GetPlainText(nil)
    // ...
}

// 新实现（go-fitz）
func (p *DocumentParser) parsePDF(filePath string) (string, error) {
    doc, err := fitz.New(filePath)
    // ... 逐页提取文本
    text, err := doc.Text(pageNum)
    // ...
}
```

**关键改进:**
- ✅ 使用 `fitz.New()` 直接打开PDF文件
- ✅ 使用 `doc.Text(pageNum)` 提取页面文本（索引从0开始）
- ✅ go-fitz 自动处理字符编码，减少乱码问题
- ✅ 保留了UTF-8验证和清理逻辑作为安全措施

### 3. 依赖更新

**文件**: `projects/01-ai-knowledge-base/go.mod`

- 移除了 `github.com/ledongthuc/pdf` 依赖
- 添加了 `github.com/gen2brain/go-fitz v1.24.15`
- 自动添加了相关依赖：
  - `github.com/ebitengine/purego v0.8.4`
  - `github.com/jupiterrider/ffi v0.5.0`

## 🔍 技术细节

### go-fitz 库特点

1. **基于 MuPDF**
   - MuPDF 是一个轻量级、高性能的 PDF 渲染库
   - 对中文和多种字符编码有良好支持

2. **API 简化**
   - `fitz.New(filePath)` - 打开文档
   - `doc.NumPage()` - 获取页数
   - `doc.Text(pageNum)` - 提取页面文本
   - `doc.Close()` - 关闭文档

3. **字符编码处理**
   - 自动识别PDF中的字符编码
   - 正确处理CID字体映射
   - 输出UTF-8编码的文本

### 代码兼容性

- ✅ 保持了原有的函数签名
- ✅ 保留了UTF-8验证和清理逻辑
- ✅ 错误处理机制保持一致
- ✅ 最大内容长度限制逻辑不变

## 🧪 测试建议

### 1. 功能测试

**测试用例:**
- [ ] 上传包含中文的PDF文档
- [ ] 验证提取的文本是否正确显示中文
- [ ] 检查是否还有乱码问题
- [ ] 测试多页PDF文档
- [ ] 测试不同编码的PDF（UTF-8, GBK等）

**测试命令:**
```bash
# 编译项目
cd projects/01-ai-knowledge-base
go build ./cmd/server

# 运行服务并测试上传
# 使用测试脚本或API客户端上传PDF文档
```

### 2. 性能测试

- [ ] 测试大文件处理时间
- [ ] 测试内存使用情况
- [ ] 对比新旧库的性能差异

### 3. 回归测试

- [ ] 确保其他文档格式（Excel, HTML等）仍然正常工作
- [ ] 确保文档分块功能正常
- [ ] 确保向量化功能正常
- [ ] 确保搜索功能正常

## ⚠️ 注意事项

### 1. 系统依赖

`go-fitz` 依赖于 MuPDF C 库，在某些环境中可能需要：

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install libmupdf-dev

# CentOS/RHEL
sudo yum install mupdf-devel
```

**macOS:**
```bash
brew install mupdf
```

**Docker:**
如果使用 Docker，需要在 Dockerfile 中安装依赖：
```dockerfile
RUN apt-get update && apt-get install -y libmupdf-dev
```

### 2. CGO 要求

`go-fitz` 需要启用 CGO，确保编译时：
```bash
CGO_ENABLED=1 go build
```

### 3. 向后兼容性

- 旧文档的解析结果不会自动更新
- 需要重新上传或重新处理文档才能使用新库
- 建议提供文档重新处理功能

## 📊 预期效果

### 解决的问题

1. ✅ **中文乱码问题**
   - go-fitz 能正确识别和处理中文PDF的字符编码
   - 支持CID字体映射
   - 自动进行编码转换

2. ✅ **字符编码识别**
   - 自动检测PDF中的字符编码
   - 正确处理多种编码格式（UTF-8, GBK, GB18030等）

3. ✅ **字体支持**
   - 支持嵌入字体
   - 支持CID字体（复合字体）
   - 支持TrueType字体

### 性能影响

- **内存使用**: 可能略有增加（MuPDF库）
- **处理速度**: 预期相当或更快
- **准确性**: 显著提升（特别是中文文档）

## 🔄 后续步骤

1. **测试验证** (优先级: 高)
   - 上传测试PDF文档
   - 验证中文显示是否正确
   - 检查是否还有乱码

2. **文档更新** (优先级: 中)
   - 更新API文档
   - 更新部署文档（系统依赖说明）
   - 更新用户文档

3. **监控和优化** (优先级: 中)
   - 监控PDF解析错误率
   - 收集用户反馈
   - 根据实际情况优化

4. **旧文档处理** (优先级: 低)
   - 提供文档重新处理功能
   - 批量重新处理旧文档（可选）

## 📝 回滚方案

如果新库出现问题，可以回滚到旧库：

1. **恢复代码**
```bash
git checkout HEAD~1 -- internal/service/document_parser.go
git checkout HEAD~1 -- go.mod
```

2. **恢复依赖**
```bash
go mod tidy
```

3. **重新编译**
```bash
go build ./cmd/server
```

## ✅ 实施检查清单

- [x] 更新依赖库
- [x] 修改PDF解析代码
- [x] 代码编译通过
- [x] 无linter错误
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 文档更新完成
- [ ] 部署到测试环境
- [ ] 生产环境部署

## 📚 参考资源

- [go-fitz GitHub仓库](https://github.com/gen2brain/go-fitz)
- [MuPDF官方文档](https://mupdf.com/)
- [PDF字符编码说明](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf)

---

**实施状态**: ✅ 代码更改完成，等待测试验证

