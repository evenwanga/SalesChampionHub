# Quick Start Guide

**AI Knowledge Base Management Platform - 子项目1**

---

## 🚀 Prerequisites

- Docker Desktop installed and running
- Go 1.21+ installed (automatically installed via Homebrew if needed)
- Sub-project 0 (User Center) running on port 3003

---

## 📦 One-Command Setup

```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# Verify services are healthy
docker-compose ps
```

Expected output:
```
NAME          STATUS
kb-postgres   Up (healthy)
kb-redis      Up (healthy)
```

---

## 🔧 Configuration

Configuration is loaded from `.env` file:

```bash
# Database
DB_HOST=localhost
DB_PORT=5434
DB_NAME=knowledge_platform
DB_USER=admin
DB_PASSWORD=kb_admin_pass_2024

# Redis
REDIS_HOST=localhost
REDIS_PORT=6381
REDIS_PASSWORD=kb_redis_pass_2024

# Sub-Project 0 Integration
USER_CENTER_API=http://localhost:3003
USER_CENTER_API_KEY=d77b773ada0b34d318342f09968a896eb095b4a7cd9d94d3046001ac7ebddb14

# Logto OIDC
LOGTO_ENDPOINT=http://localhost:3001
LOGTO_M2M_APP_ID=rd0j6xvios5fa68ymbjeg
LOGTO_M2M_APP_SECRET=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l

# Server
SERVER_PORT=8080
SERVER_MODE=debug

# Query Limits
MAX_KB_QUERY_LIMIT=4
```

---

## 🏃 Running the Application

### Build and Run

```bash
# Build the server
go build -o bin/server ./cmd/server

# Run the server
./bin/server
```

### Run Directly (Development)

```bash
go run cmd/server/main.go
```

---

## 🧪 Verify Installation

### Check Database Schema

```bash
# Connect to PostgreSQL
docker exec -it kb-postgres psql -U admin -d knowledge_platform

# List tables
\dt

# Check extensions
\dx

# Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

# Exit
\q
```

### Check Redis

```bash
# Connect to Redis
docker exec -it kb-redis redis-cli -a kb_redis_pass_2024

# Test connection
PING

# Exit
exit
```

---

## 📊 Database Schema Overview

**Core Tables:**
1. `knowledge_bases` - Global knowledge base resources
2. `knowledge_base_mounts` - Three-level mounting (tenant/org/user)
3. `documents` - Document metadata
4. `document_chunks` - Document chunks for RAG
5. `vectors` - Embeddings (1024 dimensions)
6. `query_logs` - Query analytics

**Security:**
- Row-Level Security (RLS) enabled on documents, chunks, and vectors
- Three-level access control (tenant → organization → user)
- Database-level security enforcement

---

## 🔒 Three-Level Mounting

The platform supports three levels of knowledge base mounting:

### Tenant Level
All users in the tenant can access the knowledge base.

### Organization Level
Only users in the specific organization can access.

### User Level
Only the specific user can access.

**User's Accessible KBs = Tenant KBs ∪ Organization KBs ∪ User KBs**

**Query Limit**: Maximum 4 knowledge bases per query

---

## 🔗 Sub-Project 0 Integration

This project **completely depends** on sub-project 0 for:

- ✅ User authentication (JWT token verification)
- ✅ Permission authorization (RBAC)
- ✅ Tenant management
- ✅ User management
- ✅ Organization structure (for three-level mounting)
- ✅ Audit logging

**No local storage** of tenant/user/organization data.

---

## 📁 Project Structure

```
01-ai-knowledge-base/
├── cmd/server/              # Main application
├── internal/
│   ├── api/                 # API handlers (Week 2)
│   ├── middleware/          # Authentication middleware (Week 2)
│   ├── models/              # Data models ✅
│   ├── repository/          # Database layer (Week 2)
│   ├── service/             # Business logic (Week 2)
│   └── usercenter/          # Sub-project 0 client ✅
├── pkg/config/              # Configuration ✅
├── migrations/init/         # Database migrations ✅
├── docker-compose.yml       # Local environment ✅
├── .env                     # Environment variables ✅
└── bin/                     # Compiled binaries
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
go mod tidy

# Build
go build -o bin/server ./cmd/server

# Run
./bin/server

# Test
go test ./...

# Format code
go fmt ./...

# Lint
go vet ./...

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Clean up volumes (⚠️ destroys data)
docker-compose down -v
```

---

## 📝 API Endpoints (Week 2+)

Coming in Week 2:

```
# Knowledge Bases
POST   /api/v1/knowledge-bases          # Create KB
GET    /api/v1/knowledge-bases          # List KBs
GET    /api/v1/knowledge-bases/:id      # Get KB details
PUT    /api/v1/knowledge-bases/:id      # Update KB
DELETE /api/v1/knowledge-bases/:id      # Delete KB

# Mounting (Three-Level)
POST   /api/v1/mounts/tenant            # Tenant-level mount
POST   /api/v1/mounts/organization      # Organization-level mount
POST   /api/v1/mounts/user              # User-level mount
GET    /api/v1/user/accessible-kbs      # Get user's accessible KBs

# Documents
POST   /api/v1/documents                # Upload document
GET    /api/v1/documents                # List documents
DELETE /api/v1/documents/:id            # Delete document

# Search & Query
POST   /api/v1/query/search             # Semantic search (max 4 KBs)
POST   /api/v1/query/rag                # RAG Q&A (max 4 KBs)
```

---

## 🎯 Week 1 Status

✅ **COMPLETE**

- [x] Go 1.25.3 installed
- [x] PostgreSQL 16 + pgvector running
- [x] Redis 7 running
- [x] Database schema with RLS
- [x] Three-level mounting support
- [x] Sub-project 0 client implemented
- [x] Configuration management
- [x] Project structure complete
- [x] Integration tests passing

**Next**: Week 2 - Authentication middleware + Repository layer

---

## 🐛 Troubleshooting

### Port Already in Use

If ports 5434 or 6381 are already taken:

```bash
# Edit docker-compose.yml to use different ports
# Update .env accordingly
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Sub-Project 0 API 401 Error

This is expected if:
- Sub-project 0 is not running
- API key in `.env` is incorrect
- Sub-project 0 API has changed

**Solution**: Verify `USER_CENTER_API_KEY` with sub-project 0 team.

---

## 📚 Documentation

- **Architecture Overview**: `README.md`
- **Requirements & Evaluation**: `需求回顾与评估报告.md`
- **Technical Design**: `docs/technical-design.md`
- **Mounting Strategy**: `docs/知识库挂载策略设计.md`
- **Week 1 Report**: `WEEK1_COMPLETION_REPORT.md`
- **Development Checklist**: `开发准备清单.md`

---

## 📞 Support

For questions or issues:
- Check documentation in `docs/` directory
- Review architecture decisions in `架构调整总结.md`
- See Week 1 completion report for current status

---

**Last Updated**: 2025-11-01
**Version**: v3.1
**Status**: Week 1 Complete ✅
