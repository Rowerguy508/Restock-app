# Poniente Makefile

.PHONY: all dev build deploy test lint clean status monitor logs

# Colors
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# Configuration
API_DIR := api
FRONTEND_DIR := restocka-manager
VERCEL_TOKEN ?= $(shell cat ~/.vercel-token 2>/dev/null)
GITHUB_TOKEN ?= $(shell cat ~/.openclaw/.github_token 2>/dev/null)

# Default target
all: status

# Status
status:
	@echo -e "$(GREEN)🦞 Poniente Status$(NC)"
	@echo ""
	@echo "API:"
	@curl -s https://api-gilt-xi-28.vercel.app/health 2>/dev/null | head -c 200 || echo "  API not responding"
	@echo ""
	@echo "Git:"
	@git status --short | head -5

# Development
dev:
	@echo -e "$(GREEN)Starting development server...$(NC)"
	@cd $(API_DIR) && npm run dev

# Build
build:
	@echo -e "$(GREEN)Building for production...$(NC)"
	@cd $(API_DIR) && npm install

# Deploy
deploy:
	@echo -e "$(GREEN)Deploying to Vercel...$(NC)"
	@cd $(API_DIR) && vercel --prod

# Deploy with custom token
deploy-token:
	@echo -e "$(GREEN)Deploying with custom token...$(NC)"
	@echo "$(VERCEL_TOKEN)" | xargs -0 -I{} vercel --token {} --prod

# Test
test:
	@echo -e "$(GREEN)Running tests...$(NC)"
	@node $(API_DIR)/tests.js

# Lint
lint:
	@echo -e "$(GREEN)Running linter...$(NC)"
	@cd $(API_DIR) && npx eslint . 2>/dev/null || echo "Linting not configured"

# Clean
clean:
	@echo -e "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(API_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf .next
	@echo -e "$(GREEN)Clean complete$(NC)"

# Monitor
monitor:
	@echo -e "$(GREEN)Running system monitor...$(NC)"
	@bash bin/monitor all

# Logs
logs:
	@echo -e "$(GREEN)Recent logs...$(NC)"
	@tail -50 ~/.openclaw/claude/LOGS/run.log 2>/dev/null || echo "No logs found"

# Git
git-push:
	@echo -e "$(GREEN)Pushing to GitHub...$(NC)"
	@git add -A
	@git commit -m "Update: $$(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Nothing to commit"
	@echo "$(GITHUB_TOKEN)" | xargs -0 -I{} git push https://x-access-token:{}@github.com/Rowerguy508/Restock-app.git main

# Docker
docker-build:
	@echo -e "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build

docker-up:
	@echo -e "$(GREEN)Starting Docker services...$(NC)"
	@docker-compose up -d

docker-down:
	@echo -e "$(GREEN)Stopping Docker services...$(NC)"
	@docker-compose down

docker-logs:
	@echo -e "$(GREEN)Docker logs...$(NC)"
	@docker-compose logs -f

# Help
help:
	@echo -e "$(GREEN)🦞 Poniente Makefile$(NC)"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  status      - Show system status"
	@echo "  dev         - Start development server"
	@echo "  build       - Install dependencies"
	@echo "  deploy      - Deploy to Vercel"
	@echo "  test        - Run API tests"
	@echo "  lint        - Run linter"
	@echo "  monitor     - Run system monitor"
	@echo "  logs        - Show recent logs"
	@echo "  git-push    - Commit and push to GitHub"
	@echo "  docker-*    - Docker operations"
	@echo "  help        - Show this help"
