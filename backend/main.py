"""FastAPI entrypoint for WealthWise backend."""

import os
import sys

# Configure Tesseract path BEFORE any imports that use it
if os.name == 'nt':  # Windows
	os.environ['PATH'] = r'C:\Program Files\Tesseract-OCR;' + os.environ.get('PATH', '')
	import pytesseract
	pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from database import get_db_connection
from income import router as income_router
from transactions import router as transactions_router
from budgets import router as budgets_router
from goals import router as goals_router
from reports import router as reports_router
from profile import router as profile_router


app = FastAPI(title="WealthWise Backend")

# CORS for frontend apps - MUST be added before routes
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],  # Allow all origins in development
	allow_credentials=False,
	allow_methods=["*"],
	allow_headers=["*"],
	expose_headers=["*"],
	max_age=3600,
)

# Register routers
app.include_router(income_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(goals_router)
app.include_router(reports_router)
app.include_router(profile_router)


@app.get("/")
def read_root():
	"""Lightweight root endpoint to verify server is running."""
	return {"status": "ok"}


@app.get("/test-profile")
def test_profile():
	"""Test endpoint without auth."""
	return {
		"user_id": "test",
		"name": "Test User",
		"email": "test@test.com"
	}


@app.get("/health/db")
def health_check_db():
	"""Health check that validates database connectivity."""
	try:
		conn = get_db_connection()
		with conn.cursor() as cur:
			cur.execute("SELECT 1;")
			cur.fetchone()
		conn.close()
		return {"status": "ok", "db": "ok"}
	except Exception as exc:  # pragma: no cover - simple runtime check
		raise HTTPException(status_code=500, detail=f"DB check failed: {exc}") from exc


if __name__ == "__main__":
	# For local runs without using `uvicorn main:app --reload`
	import uvicorn

	uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
