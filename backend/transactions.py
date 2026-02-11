"""Transaction feature routes for WealthWise backend."""

import os
import re
import io
from datetime import date, datetime
from typing import Any, Dict, List, Optional
import numpy

# Configure Tesseract path in environment BEFORE importing pytesseract
if os.name == 'nt':  # Windows
    os.environ['PATH'] = r'C:\Program Files\Tesseract-OCR;' + os.environ.get('PATH', '')

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from pydantic import BaseModel, field_validator
import pytesseract
from PIL import Image

# Also set pytesseract command directly
if os.name == 'nt':
    pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from auth import get_current_user_id
from database import get_db_connection


router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    amount: float
    txn_type: str
    category: Optional[str] = None
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    txn_date: Optional[date] = None
    source: str = "manual"  # "manual" or "ocr"

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Amount must be greater than zero")
        return value

    @field_validator("txn_type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        allowed = {"income", "expense"}
        if value not in allowed:
            raise ValueError(f"txn_type must be one of {', '.join(sorted(allowed))}")
        return value


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    txn_date: Optional[date] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Optional[float]) -> Optional[float]:
        if value is not None and value <= 0:
            raise ValueError("Amount must be greater than zero")
        return value


# --- Helpers -----------------------------------------------------------------


def _extract_receipt_data(text: str) -> Dict[str, Any]:
    """Extract vendor, amount, and date from OCR text.

    IMPROVED APPROACH:
    - Amount: Look for TOTAL/GRAND TOTAL/NET AMOUNT lines
    - Look for currency symbols (₹, Rs, INR)
    - Category: User must select (not auto-filled)
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    amount = None
    print(f">>> RAW OCR TEXT:\n{text}\n>>> END RAW TEXT")
    print(f">>> Total lines: {len(lines)}")

    # Strict amount extraction: Always prefer GRAND TOTAL if present
    grand_total_found = False
    for i, line in enumerate(lines):
        line_upper = line.upper()
        if "GRAND" in line_upper and "TOTAL" in line_upper:
            grand_total_found = True
            print(f"[OCR DEBUG] GRAND TOTAL line: '{line}'")
            if i + 1 < len(lines):
                print(f"[OCR DEBUG] Next line after GRAND TOTAL: '{lines[i+1]}'")
            # Remove currency symbols and non-numeric chars except dot and comma
            clean_line = re.sub(r"[^0-9.,]", "", line)
            matches = re.findall(r'(\d{1,3}[.,]\d{2})', clean_line)
            if matches:
                amount = float(matches[-1].replace(",", ""))
                print(f">>> GRAND TOTAL FLEX: ₹{amount} from line: {line}")
                break
            # If not found on the same line, check the next line (common in receipts)
            if i + 1 < len(lines):
                clean_next = re.sub(r"[^0-9.,]", "", lines[i + 1])
                matches = re.findall(r'(\d{1,3}[.,]\d{2})', clean_next)
                if matches:
                    amount = float(matches[-1].replace(",", ""))
                    print(f">>> GRAND TOTAL FLEX (next line): ₹{amount} from line: {lines[i+1]}")
                    break
    # Fallback: If not found, look for TOTAL (but not GST or other lines)
    if not amount and not grand_total_found:
        for i, line in enumerate(lines):
            line_upper = line.upper()
            if (
                "TOTAL" in line_upper
                and "GRAND" not in line_upper
                and "GST" not in line_upper
                and "SUB" not in line_upper
            ):
                clean_line = re.sub(r"[^0-9.,]", "", line)
                matches = re.findall(r'(\d{1,5}[.,]\d{2})', clean_line)
                if matches:
                    amount = float(matches[-1].replace(",", ""))  # Always pick the last match
                    print(f">>> TOTAL FLEX (last match): ₹{amount} from line: {line}")
                    break

    # Strict date extraction: Try multiple formats
    date_str = None
    # 1. dd/mm/yyyy
    date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    if date_match:
        date_str = date_match.group(1)
    # 2. dd-mm-yyyy
    if not date_str:
        date_match = re.search(r'(\d{2}-\d{2}-\d{4})', text)
        if date_match:
            date_str = date_match.group(1)
    # 3. Month dd, yyyy (with or without weekday)
    if not date_str:
        date_match = re.search(r'([A-Za-z]+\s+\d{1,2},\s*\d{4})', text)
        if date_match:
            # Try to parse this format
            try:
                dt = datetime.strptime(date_match.group(1), "%B %d, %Y")
                date_str = dt.strftime("%d-%m-%Y")
            except Exception:
                pass
    # 4. Weekday, Month dd, yyyy (e.g., Sunday, January 25, 2026)
    if not date_str:
        date_match = re.search(r'([A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s*\d{4})', text)
        if date_match:
            try:
                dt = datetime.strptime(date_match.group(1), "%A, %B %d, %Y")
                date_str = dt.strftime("%d-%m-%Y")
            except Exception:
                pass
    # Description: Use first non-empty line
    vendor = "Receipt"
    for line in lines:
        if line.strip():
            vendor = line.strip()
            break
    vendor = vendor[:50]

    # Category: Never auto-assign, let user select
    return {
        "vendor": vendor or "Receipt",
        "amount": amount or 0.0,
        "date": date_str if date_str is not None else "",
        "category": None  # User must select category
    }


def _guess_category(text: str) -> str:
    """Guess transaction category based on receipt content."""
    text_lower = text.lower()
    category_keywords = {
        "groceries": ["grocery", "supermarket", "whole foods", "kroger", "safeway", "produce", "dairy", "meat", "noodles", "sugar", "salt", "soap", "bazaar"],
        "shopping": ["mall", "retail", "shop", "store", "amazon", "ebay", "clothes", "apparel", "bazaar", "plaza"],
        "dining": ["restaurant", "cafe", "coffee", "pizza", "burger", "bistro", "bar"],
        "transportation": ["fuel", "gas", "petrol", "uber", "lyft", "taxi", "parking", "toll"],
        "entertainment": ["movie", "cinema", "theater", "concert", "game", "spotify", "netflix"],
        "utilities": ["electric", "water", "internet", "phone", "gas bill", "utility"],
        "health": ["pharmacy", "doctor", "hospital", "medical", "clinic", "health"],
    }
    for category, keywords in category_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category

def _check_budget_warning(user_id: str, category: str, new_amount: float, txn_date: date) -> dict:
    """Check if adding this transaction would exceed budget threshold or limit."""
    if not category:
        return {}

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Find active budget for this category and date
            cur.execute(
                """
                SELECT id, budget_type, amount, alert_threshold, start_date
                FROM budgets
                WHERE user_id = %s AND category = %s
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (user_id, category),
            )
            budget_row = cur.fetchone()

            if not budget_row:
                return {}  # No budget for this category

            budget_id, budget_type, budget_amount, alert_threshold, start_date = budget_row

            # Calculate current spent for this budget period
            if budget_type == "Monthly":
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE user_id = %s
                        AND category = %s
                        AND txn_type = 'expense'
                        AND month = %s
                        AND year = %s;
                    """,
                    (user_id, category, txn_date.month, txn_date.year),
                )
            else:  # Weekly
                from datetime import timedelta
                end_date = start_date + timedelta(days=7)
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE user_id = %s
                        AND category = %s
                        AND txn_type = 'expense'
                        AND txn_date >= %s
                        AND txn_date < %s;
                    """,
                    (user_id, category, start_date, end_date),
                )

            current_spent = float(cur.fetchone()[0])
            new_total = current_spent + new_amount
            percentage = (new_total / float(budget_amount)) * 100

            warning_data = {
                "budget_id": budget_id,
                "budget_amount": float(budget_amount),
                "current_spent": current_spent,
                "new_total": new_total,
                "percentage": round(percentage, 1),
                "alert_threshold": alert_threshold,
            }

            if percentage >= 100:
                warning_data["warning"] = "budget_exceeded"
                warning_data["message"] = f"⚠️ Budget exceeded! You've spent ₹{new_total:.2f} of ₹{budget_amount:.2f} ({percentage:.1f}%)"
            elif percentage >= alert_threshold:
                warning_data["warning"] = "threshold_exceeded"
                warning_data["message"] = f"⚠️ Alert: You've reached {percentage:.1f}% of your {category} budget (₹{new_total:.2f}/₹{budget_amount:.2f})"

            return warning_data
    finally:
        conn.close()


def _row_to_transaction(row):
    """Convert a DB row to a transaction dict."""
    return {
        "id": row[0],
        "user_id": row[1],
        "amount": row[2],
        "txn_type": row[3],
        "category": row[4],
        "description": row[5],
        "payment_mode": row[6],
        "txn_date": row[7].isoformat() if row[7] else None,
        "month": row[8],
        "year": row[9],
        "source": row[10],
        "created_at": row[11].isoformat() if row[11] else None,
        "updated_at": row[12].isoformat() if row[12] else None,
    }



# --- Routes ------------------------------------------------------------------

# Update transaction endpoint
from fastapi import Body

@router.put("/{txn_id}")
def update_transaction(
    txn_id: int,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user_id)
):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE transactions
                SET amount = %s,
                    category = %s,
                    description = %s,
                    payment_mode = %s,
                    txn_date = %s,
                    updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at;
                """,
                (
                    payload.get("amount"),
                    payload.get("category"),
                    payload.get("description"),
                    payload.get("payment_mode"),
                    payload.get("txn_date"),
                    txn_id,
                    user_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Transaction not found")
            conn.commit()
            return _row_to_transaction(row)
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update transaction: {exc}") from exc
    finally:
        conn.close()


@router.post("/")
def create_transaction(payload: TransactionCreate, user_id: str = Depends(get_current_user_id)):
    # Log received transaction data
    print(f">>> BACKEND: Received transaction - Description: {payload.description}, Amount: {payload.amount}, Source: {payload.source}")
    txn_dt = payload.txn_date or datetime.utcnow().date()
    month = txn_dt.month
    year = txn_dt.year

    # Check budget warning for expenses
    budget_warning = {}
    if payload.txn_type == "expense" and payload.category:
        # Use the authenticated user_id from the dependency, not the payload
        budget_warning = _check_budget_warning(user_id, payload.category, payload.amount, txn_dt)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO transactions (
                    user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id, user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at;
                """,
                (
                    user_id,
                    payload.amount,
                    payload.txn_type,
                    payload.category,
                    payload.description,
                    payload.payment_mode,
                    txn_dt,
                    month,
                    year,
                    payload.source
                )
            )
            row = cur.fetchone()
        conn.commit()

        result = _row_to_transaction(row)

        # Add budget warning to response if present
        if budget_warning:
            result["budget_warning"] = budget_warning

        return result
    except Exception as exc:  # pragma: no cover - runtime guard
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create transaction: {exc}") from exc
    finally:
        conn.close()


@router.get("/")
def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    payment_mode: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    where_clauses: List[str] = ["user_id = %s"]
    params: List[Any] = [user_id]

    if start_date:
        where_clauses.append("txn_date >= %s")
        params.append(start_date)
    if end_date:
        where_clauses.append("txn_date <= %s")
        params.append(end_date)
    if category:
        where_clauses.append("category = %s")
        params.append(category)
    if payment_mode:
        where_clauses.append("payment_mode = %s")
        params.append(payment_mode)
    if search:
        where_clauses.append("LOWER(description) LIKE %s")
        params.append(f"%{search.lower()}%")

    where_sql = " AND ".join(where_clauses)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at
                FROM transactions
                WHERE {where_sql}
                ORDER BY txn_date DESC, created_at DESC
                LIMIT %s OFFSET %s;
                """,
                (*params, limit, offset),
            )
            rows = cur.fetchall()
        return [_row_to_transaction(row) for row in rows]
    except Exception as exc:  # pragma: no cover - runtime guard
        raise HTTPException(status_code=500, detail=f"Failed to list transactions: {exc}") from exc
    finally:
        conn.close()


@router.get("/summary")
def transaction_summary(
    month: int | None = None,
    year: int | None = None,
    user_id: str = Depends(get_current_user_id),
):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if month is None and year is None:
                # Return all-time totals
                cur.execute(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN txn_type = 'expense' THEN amount END), 0) AS total_expense,
                        COALESCE(SUM(CASE WHEN txn_type = 'income' THEN amount END), 0) AS total_income
                    FROM transactions
                    WHERE user_id = %s;
                    """,
                    (user_id,),
                )
                totals_row = cur.fetchone()

                cur.execute(
                    """
                    SELECT category, COALESCE(SUM(amount), 0) AS total
                    FROM transactions
                    WHERE user_id = %s AND txn_type = 'expense'
                    GROUP BY category
                    ORDER BY total DESC;
                    """,
                    (user_id,),
                )
                category_rows = cur.fetchall()

                return {
                    "user_id": user_id,
                    "total_expense": float(totals_row[0]) if totals_row else 0.0,
                    "total_income": float(totals_row[1]) if totals_row else 0.0,
                    "expenses_by_category": {
                        row[0] or "uncategorized": float(row[1]) for row in category_rows
                    },
                }
            else:
                # Return monthly totals
                current = datetime.utcnow()
                month = month or current.month
                year = year or current.year
                
                cur.execute(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN txn_type = 'expense' THEN amount END), 0) AS total_expense,
                        COALESCE(SUM(CASE WHEN txn_type = 'income' THEN amount END), 0) AS total_income
                    FROM transactions
                    WHERE user_id = %s AND month = %s AND year = %s;
                    """,
                    (user_id, month, year),
                )
                totals_row = cur.fetchone()

                cur.execute(
                    """
                    SELECT category, COALESCE(SUM(amount), 0) AS total
                    FROM transactions
                    WHERE user_id = %s AND txn_type = 'expense' AND month = %s AND year = %s
                    GROUP BY category
                    ORDER BY total DESC;
                    """,
                    (user_id, month, year),
                )
                category_rows = cur.fetchall()

                return {
                    "user_id": user_id,
                    "month": month,
                    "year": year,
                    "total_expense": float(totals_row[0]) if totals_row else 0.0,
                    "total_income": float(totals_row[1]) if totals_row else 0.0,
                    "expenses_by_category": {
                        row[0] or "uncategorized": float(row[1]) for row in category_rows
                    },
                }
    except Exception as exc:  # pragma: no cover - runtime guard
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {exc}") from exc
    finally:
        conn.close()


@router.get("/{txn_id}")
def get_transaction(txn_id: int, user_id: str = Depends(get_current_user_id)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at
                FROM transactions
                WHERE id = %s AND user_id = %s;
                """,
                (txn_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Transaction not found")
            conn.commit()
            return _row_to_transaction(row)
    except Exception as exc:  # pragma: no cover - runtime guard
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update transaction: {exc}") from exc
    finally:
        conn.close()


@router.delete("/{txn_id}")
def delete_transaction(txn_id: int, user_id: str = Depends(get_current_user_id)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM transactions
                WHERE id = %s AND user_id = %s
                RETURNING id;
                """,
                (txn_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Transaction not found")
            conn.commit()
            return {"status": "deleted", "id": row[0]}
    except Exception as exc:  # pragma: no cover - runtime guard
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete transaction: {exc}") from exc
    finally:
        conn.close()

@router.post("/scan-and-create")
async def scan_receipt_and_create(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    Scan a receipt AND create a transaction directly with source='ocr'.
    This is the new simplified flow - no need to fill in forms.
    """
    print(f"\n>>> OCR: SCAN-AND-CREATE endpoint called - File: {file.filename}, User: {user_id}")
    try:
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: JPEG, PNG, PDF. Got: {file.content_type}"
            )
        
        # Read file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Preprocess image
        if image.mode != 'L':
            image = image.convert('L')
        
        from PIL import ImageFilter, ImageEnhance, ImageOps
        
        if image.width < 300 or image.height < 300:
            scale_factor = max(300 / image.width, 300 / image.height)
            new_size = (int(image.width * scale_factor), int(image.height * scale_factor))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        image = image.filter(ImageFilter.GaussianBlur(radius=0.3))
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(3.5)
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.2)
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.5)
        
        # Run OCR
        try:
            extracted_text = pytesseract.image_to_string(image)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"OCR processing failed. Ensure Tesseract is installed: {str(e)}"
            )
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from image. Please ensure receipt is clear and readable."
            )
        
        # Parse extracted text
        receipt_data = _extract_receipt_data(extracted_text)
        print(f">>> OCR: Extracted - Vendor: {receipt_data['vendor']}, Amount: {receipt_data['amount']}, Date: {receipt_data['date']}")
        
        # Create transaction directly with source='ocr'
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Convert ISO date string back to date object
                if isinstance(receipt_data["date"], str):
                    try:
                        # Try dd/mm/yyyy
                        txn_date = datetime.strptime(receipt_data["date"], "%d/%m/%Y").date()
                    except ValueError:
                        try:
                            # Try dd-mm-yyyy
                            txn_date = datetime.strptime(receipt_data["date"], "%d-%m-%Y").date()
                        except ValueError:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Invalid date format in receipt: '{receipt_data['date']}'. Please use dd/mm/yyyy or dd-mm-yyyy."
                            )
                else:
                    txn_date = receipt_data["date"] or datetime.utcnow().date()
                month = txn_date.month
                year = txn_date.year
                
                cur.execute(
                    """
                    INSERT INTO transactions (
                        user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING id, user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year, source, created_at, updated_at;
                    """,
                    (
                        user_id,
                        receipt_data["amount"],
                        "expense",
                        receipt_data["category"],
                        receipt_data["vendor"],
                        "card",
                        txn_date,
                        month,
                        year,
                        "ocr"
                    )
                )
                row = cur.fetchone()
            conn.commit()
            
            result = _row_to_transaction(row)
            print(f">>> OCR: Transaction created with ID={result['id']}, source='{result['source']}'")
            
            return {
                "success": True,
                "transaction": result,
                "message": f"Receipt scanned and transaction created: ₹{receipt_data['amount']} from {receipt_data['vendor']}"
            }
        finally:
            conn.close()
    
    except HTTPException:
        raise
    except Exception as exc:
        print(f">>> OCR: Error in scan-and-create: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(exc)}") from exc


@router.post("/scan-receipt")
async def scan_receipt(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    Scan a receipt image using Tesseract OCR.
    Extracts vendor name, amount, date, and guesses category.
    """
    print(f"\n>>> SCAN RECEIPT CALLED - File: {file.filename}, User: {user_id}")
    try:
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: JPEG, PNG, PDF. Got: {file.content_type}"
            )
        
        print(f"File type OK: {file.content_type}")
        
        # Read file
        contents = await file.read()
        print(f"File size: {len(contents)} bytes")
        
        image = Image.open(io.BytesIO(contents))
        print(f"Image size: {image.size}, Format: {image.format}")
        
        # Preprocess image for better OCR accuracy
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Apply additional preprocessing for better handwriting recognition
        from PIL import ImageFilter, ImageEnhance, ImageOps
        
        # Resize if image is very small (improves OCR accuracy)
        if image.width < 300 or image.height < 300:
            scale_factor = max(300 / image.width, 300 / image.height)
            new_size = (int(image.width * scale_factor), int(image.height * scale_factor))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"Image resized to {new_size}")
        
        # Apply slight blur to reduce noise FIRST (before contrast)
        image = image.filter(ImageFilter.GaussianBlur(radius=0.3))
        
        # Increase contrast - critical for handwritten text visibility
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(3.5)  # Increased to 3.5x for better handwriting clarity
        
        # Enhance brightness for faded/light ink
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.2)  # Increased to 1.2 for better visibility
        
        # Enhance sharpness for crisp text edges (after contrast/brightness)
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.5)  # Slightly reduced to prevent over-sharpening
        
        # Apply a small median filter to clean up noise while preserving edges
        image = image.filter(ImageFilter.MedianFilter(size=3))
        
        # Optional: Apply adaptive histogram equalization-like effect
        # by normalizing the image distribution
        img_array = numpy.array(image)
        p2, p98 = numpy.percentile(img_array, (2, 98))
        img_array = numpy.clip((img_array - p2) / (p98 - p2) * 255, 0, 255).astype(numpy.uint8)
        image = Image.fromarray(img_array)
        print(f"Applied adaptive normalization for better contrast")
        
        # Extract text using Tesseract OCR with optimized settings
        try:
            # Use PSM (Page Segmentation Mode) 6 for mixed text blocks
            # Use OEM (OCR Engine Mode) 3 for legacy + LSTM (better for handwriting)
            extracted_text = pytesseract.image_to_string(
                image,
                config='--psm 6 --oem 3'
            )
            print(f"OCR completed")
            print(f">>> RAW OCR TEXT:\n{extracted_text}\n>>> END RAW TEXT")
        except Exception as e:
            print(f"OCR ERROR: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"OCR processing failed. Ensure Tesseract is installed: {str(e)}"
            )
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from image. Please ensure receipt is clear and readable."
            )
        
        # Parse extracted text to get structured data
        receipt_data = _extract_receipt_data(extracted_text)
        
        # DEBUG: Log what was extracted
        print(f"\n=== OCR DEBUG ===")
        print(f"Extracted Text:\n{extracted_text}")
        print(f"\nParsed Data: {receipt_data}")
        print(f"=== END DEBUG ===\n")
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "parsed_data": {
                "vendor": receipt_data["vendor"],
                "amount": receipt_data["amount"],
                "date": receipt_data["date"],
                "category": receipt_data["category"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - runtime guard
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(exc)}") from exc