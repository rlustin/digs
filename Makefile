.DEFAULT_GOAL := help

.PHONY: help setup start test lint lintfix download-covers

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies and git hooks
	@echo "Installing dependencies..."
	npm install
	@echo "Installing git hooks..."
	npx lefthook install

download-covers: ## Download album cover images from Discogs (use force=1 to re-download)
	node scripts/download-covers.mjs $(if $(force),--force)

start: download-covers ## Start the Expo dev server
	npx expo start

test: ## Run all tests
	npx jest

lint: ## Lint and type-check the project
	npx expo lint . -- --max-warnings 0
	npx tsc --noEmit

lintfix: ## Auto-fix lint issues
	npx expo lint . -- --fix
