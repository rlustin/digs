.DEFAULT_GOAL := help

.PHONY: help install start test lint lintfix

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "Installing dependencies..."
	npm install

start: ## Start the Expo dev server
	npx expo start

test: ## Run all tests
	npx jest

lint: ## Lint and type-check the project
	npx expo lint .
	npx tsc --noEmit

lintfix: ## Auto-fix lint issues
	npx expo lint . -- --fix
