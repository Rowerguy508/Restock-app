#!/bin/bash
# Poniente Quick Setup
# One-command setup for new developers or fresh installs

set -e

echo -e "\033[0;32m🦞 Poniente Quick Setup\033[0m"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# Check requirements
check_reqs() {
    log "Checking requirements..."
    
    local missing=()
    
    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v git >/dev/null 2>&1 || missing+=("git")
    
    if [ ${#missing[@]} -gt 0 ]; then
        warn "Missing: ${missing[*]}"
        warn "Please install missing tools first."
        exit 1
    fi
    
    log "All requirements met"
}

# Setup API
setup_api() {
    log "Setting up API..."
    cd ~/Restock-app/api
    npm install 2>/dev/null || warn "npm install failed"
    log "API dependencies installed"
}

# Setup CLI tools
setup_cli() {
    log "Setting up CLI tools..."
    chmod +x ~/Restock-app/bin/* 2>/dev/null || warn "chmod failed"
    log "CLI tools ready"
}

# Setup Git config
setup_git() {
    log "Configuring Git..."
    
    # Set user if not set
    if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
        read -p "Enter your name: " name
        git config --global user.name "$name"
    fi
    
    if [ -z "$(git config --global user.email 2>/dev/null)" ]; then
        read -p "Enter your email: " email
        git config --global user.email "$email"
    fi
    
    log "Git configured"
}

# Setup environment file
setup_env() {
    log "Setting up environment..."
    
    if [ ! -f ~/Restock-app/api/.env ]; then
        cp ~/Restock-app/api/.env.example ~/Restock-app/api/.env 2>/dev/null || warn "No .env.example found"
    fi
    
    log "Environment ready"
}

# Run tests
run_tests() {
    log "Running quick tests..."
    
    cd ~/Restock-app/api
    if [ -f tests.js ]; then
        API_URL=https://api-gilt-xi-28.vercel.app node tests.js 2>/dev/null | head -20 || warn "Tests failed or API not accessible"
    else
        warn "No tests found"
    fi
}

# Final message
done_message() {
    echo ""
    echo -e "${GREEN}✅ Setup Complete!${NC}"
    echo ""
    echo "Quick Commands:"
    echo "  cd ~/Restock-app"
    echo "  make status        # Check status"
    echo "  make dev          # Start dev server"
    echo "  make test         # Run tests"
    echo "  make monitor       # System monitor"
    echo ""
    echo "CLI Tools:"
    echo "  ./bin/poniente status"
    echo "  ./bin/monitor all"
    echo "  ./bin/metrics collect"
    echo ""
    echo "Files created:"
    echo "  - API in api/"
    echo "  - CLI tools in bin/"
    echo "  - Config in Makefile"
    echo ""
    echo "Next steps:"
    echo "  1. Configure API keys in api/.env"
    echo "  2. Run 'make deploy' to deploy"
    echo "  3. Configure Stripe/Supabase"
    echo ""
}

# Main
check_reqs
setup_api
setup_cli
setup_git
setup_env
run_tests
done_message
