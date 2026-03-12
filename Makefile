.DEFAULT_GOAL := help

.PHONY: help setup start test lint lintfix download-covers fetch-collection screenshots build-preview build-production submit-production

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

fetch-collection: ## Fetch Discogs collection for screenshot fixtures
	DISCOGS_TOKEN=$$(op read 'op://Private/Digs Discogs API/personal_access_token' --account=my.1password.eu) \
	node screenshots/fetch-collection.mjs

screenshots: ## Generate App Store screenshots
	node screenshots/seed-db.mjs
	bash screenshots/take-screenshots.sh

build-preview: ## Build iOS preview locally (secrets from 1Password)
	EXPO_PUBLIC_DISCOGS_KEY=$$(op read 'op://Private/Digs Discogs API/consumer_key' --account=my.1password.eu) \
	EXPO_PUBLIC_DISCOGS_SECRET=$$(op read 'op://Private/Digs Discogs API/consumer_secret' --account=my.1password.eu) \
	npx eas build --platform ios --profile preview --local

build-production: ## Build iOS production locally (secrets from 1Password)
	EXPO_PUBLIC_DISCOGS_KEY=$$(op read 'op://Private/Digs Discogs API/consumer_key' --account=my.1password.eu) \
	EXPO_PUBLIC_DISCOGS_SECRET=$$(op read 'op://Private/Digs Discogs API/consumer_secret' --account=my.1password.eu) \
	npx eas build --platform ios --profile production --local

submit-production: ## Submit production build to App Store Connect (use path=build.ipa)
	npx eas submit --platform ios --path $(path)
