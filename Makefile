.DEFAULT_GOAL := dev

.PHONY: dev scraper scrape scrape-docker playwright-install

playwright-install:
	cd backend && npx playwright install chromium

scraper: scrape

scrape:
	docker compose up -d postgres
	cd backend && npx playwright install chromium
	cd backend && npm run scraper:run

scrape-docker:
	docker compose --profile scraper run --rm scraper

ifeq ($(OS),Windows_NT)

dev:
	start "Docker Compose" cmd /k "docker compose up --build -d"
	start "Backend NestJS" cmd /k "cd backend && npm run start:dev"
	start "Frontend Vite" cmd /k "cd frontend && npm run dev"

else

TERMINAL := $(shell \
	if command -v kitty >/dev/null 2>&1; then echo kitty; \
	elif command -v gnome-terminal >/dev/null 2>&1; then echo gnome-terminal; \
	else echo xterm; fi)

ifeq ($(TERMINAL),kitty)

dev:
	kitty --title "Docker Compose" sh -c 'docker compose up --build -d; exec "$$SHELL"' &
	kitty --title "Backend NestJS" sh -c 'cd backend && npm run start:dev; exec "$$SHELL"' &
	kitty --title "Frontend Vite" sh -c 'cd frontend && npm run dev; exec "$$SHELL"' &

else ifeq ($(TERMINAL),gnome-terminal)

dev:
	gnome-terminal --title="Docker Compose" -- bash -c 'docker compose up --build -d; exec "$$SHELL"' &
	gnome-terminal --title="Backend NestJS" -- bash -c 'cd backend && npm run start:dev; exec "$$SHELL"' &
	gnome-terminal --title="Frontend Vite" -- bash -c 'cd frontend && npm run dev; exec "$$SHELL"' &

else

dev:
	xterm -T "Docker Compose" -e sh -c 'docker compose up --build -d; exec "$$SHELL"' &
	xterm -T "Backend NestJS" -e sh -c 'cd backend && npm run start:dev; exec "$$SHELL"' &
	xterm -T "Frontend Vite" -e sh -c 'cd frontend && npm run dev; exec "$$SHELL"' &

endif
endif