"""Reports & Analytics feature routes for WealthWise backend."""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from decimal import Decimal
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user_id
from database import get_db_connection


router = APIRouter(prefix="/reports", tags=["reports"])


# ======================== Response Models ========================

class CategoryBreakdown(BaseModel):
    category: str
    total_amount: float
    percentage: float
    transaction_count: int
    average_transaction: float


class MonthlyTrend(BaseModel):
    month: str
    income: float
    expense: float
    net_savings: float


class BudgetPerformance(BaseModel):
    category: str
    budget_amount: float
    actual_spent: float
    percentage_used: float
    status: str  # "On Track", "Near Limit", "Exceeded"


class GoalProgress(BaseModel):
    goal_id: str
    goal_name: str
    category: str
    target_amount: float
    current_amount: float
    progress_percentage: float
    deadline: date
    months_remaining: int


class PaymentModeBreakdown(BaseModel):
    mode: str
    amount: float
    percentage: float
    transaction_count: int


class SavingsAnalysis(BaseModel):
    month: str
    total_income: float
    total_expense: float
    net_savings: float
    savings_rate_percentage: float


# ======================== Helper Functions ========================

def _get_month_range(year: int, month: int) -> tuple:
    """Get start and end date for a given month."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def _format_month_year(year: int, month: int) -> str:
    """Format month and year as 'Jan 2026'."""
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return f"{months[month - 1]} {year}"


def _get_last_n_months(n: int = 12) -> List[tuple]:
    """Get last N months as (year, month) tuples."""
    today = date.today()
    months = []
    for i in range(n - 1, -1, -1):
        current_date = today.replace(day=1) - timedelta(days=i*30)
        months.append((current_date.year, current_date.month))
    return months


def _calculate_months_remaining(deadline: date) -> int:
    """Calculate months remaining until deadline."""
    today = date.today()
    if deadline <= today:
        return 0
    months = (deadline.year - today.year) * 12 + (deadline.month - today.month)
    return max(0, months)


def _get_top_transactions(user_id: str, limit: int = 10, txn_type: str = "expense") -> List[Dict]:
    """Get top N transactions by amount."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, amount, category, description, txn_date, payment_mode
                FROM transactions
                WHERE user_id = %s AND txn_type = %s
                ORDER BY amount DESC
                LIMIT %s;
                """,
                (user_id, txn_type, limit),
            )
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "amount": float(row[1]),
                    "category": row[2],
                    "description": row[3],
                    "date": str(row[4]),
                    "payment_mode": row[5],
                }
                for row in rows
            ]
    finally:
        conn.close()


def _detect_recurring_expenses(user_id: str, min_occurrences: int = 2) -> List[Dict]:
    """Detect recurring expenses based on description patterns."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get all expenses with description
            cur.execute(
                """
                SELECT description, category, amount, COUNT(*) as count
                FROM transactions
                WHERE user_id = %s AND txn_type = 'expense' AND description IS NOT NULL
                GROUP BY description, category, amount
                HAVING COUNT(*) >= %s
                ORDER BY COUNT(*) DESC;
                """,
                (user_id, min_occurrences),
            )
            rows = cur.fetchall()
            return [
                {
                    "description": row[0],
                    "category": row[1],
                    "average_amount": float(row[2]),
                    "frequency": row[3],
                }
                for row in rows
            ]
    finally:
        conn.close()


def _detect_spending_anomalies(user_id: str) -> List[Dict]:
    """Detect unusual spending patterns (high/low spikes)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get monthly spending totals
            cur.execute(
                """
                SELECT 
                    EXTRACT(YEAR FROM txn_date)::INTEGER as year,
                    EXTRACT(MONTH FROM txn_date)::INTEGER as month,
                    SUM(amount) as total
                FROM transactions
                WHERE user_id = %s AND txn_type = 'expense'
                GROUP BY EXTRACT(YEAR FROM txn_date), EXTRACT(MONTH FROM txn_date)
                ORDER BY EXTRACT(YEAR FROM txn_date), EXTRACT(MONTH FROM txn_date);
                """,
                (user_id,),
            )
            rows = cur.fetchall()
            
            if len(rows) < 2:
                return []
            
            # Calculate average and standard deviation
            amounts = [float(row[2]) for row in rows]
            avg = sum(amounts) / len(amounts)
            variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
            std_dev = variance ** 0.5
            
            # Flag anomalies (> 1.5 standard deviations)
            anomalies = []
            for i, row in enumerate(rows):
                amount = float(row[2])
                if abs(amount - avg) > 1.5 * std_dev:
                    anomaly_type = "High Spending" if amount > avg else "Low Spending"
                    anomalies.append({
                        "month": _format_month_year(row[0], row[1]),
                        "amount": amount,
                        "average": avg,
                        "type": anomaly_type,
                        "deviation_percentage": round(((amount - avg) / avg * 100), 2),
                    })
            
            return anomalies
    finally:
        conn.close()


# ======================== L1: Core Analytics Endpoints ========================

@router.get("/trends/income-vs-expense")
def get_income_vs_expense_trends(
    months: int = Query(12, ge=1, le=60),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 1: Get income vs expense trends for last N months (line chart data).
    """
    month_list = _get_last_n_months(months)
    trends = []
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            for year, month in month_list:
                # Get income for month
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM incomes
                    WHERE user_id = %s AND month = %s AND year = %s;
                    """,
                    (user_id, month, year),
                )
                income = float(cur.fetchone()[0])
                
                # Get expenses for month
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE user_id = %s AND txn_type = 'expense'
                    AND EXTRACT(MONTH FROM txn_date) = %s
                    AND EXTRACT(YEAR FROM txn_date) = %s;
                    """,
                    (user_id, month, year),
                )
                expense = float(cur.fetchone()[0])
                
                trends.append({
                    "month": _format_month_year(year, month),
                    "income": income,
                    "expense": expense,
                    "net_savings": income - expense,
                })
        
        return trends
    finally:
        conn.close()


@router.get("/breakdown/category-spending")
def get_category_spending_breakdown(
    year: int = Query(None, description="Filter by year"),
    month: int = Query(None, description="Filter by month (1-12)"),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 1: Get detailed category-wise spending breakdown.
    If month/year not provided, returns all-time breakdown.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "user_id = %s AND txn_type = 'expense'"
            params = [user_id]
            
            if year and month:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s AND EXTRACT(MONTH FROM txn_date) = %s"
                params.extend([year, month])
            elif year:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s"
                params.append(year)
            
            cur.execute(
                f"""
                SELECT 
                    category,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count,
                    AVG(amount) as average_amount
                FROM transactions
                WHERE {where_clause}
                GROUP BY category
                ORDER BY total_amount DESC;
                """,
                tuple(params),
            )
            
            rows = cur.fetchall()
            
            # Calculate total for percentages
            total = sum(float(row[1]) for row in rows)
            
            breakdown = [
                {
                    "category": row[0],
                    "total_amount": float(row[1]),
                    "percentage": round((float(row[1]) / total * 100), 2) if total > 0 else 0,
                    "transaction_count": row[2],
                    "average_transaction": round(float(row[3]), 2),
                }
                for row in rows
            ]
            
            return {"breakdown": breakdown, "total_spent": total}
    finally:
        conn.close()


@router.get("/breakdown/payment-mode")
def get_payment_mode_breakdown(
    year: int = Query(None),
    month: int = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 1: Get payment mode distribution (Cash/Card/UPI/Bank Transfer).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "user_id = %s AND txn_type = 'expense'"
            params = [user_id]
            
            if year and month:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s AND EXTRACT(MONTH FROM txn_date) = %s"
                params.extend([year, month])
            elif year:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s"
                params.append(year)
            
            cur.execute(
                f"""
                SELECT 
                    payment_mode,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count
                FROM transactions
                WHERE {where_clause}
                GROUP BY payment_mode
                ORDER BY total_amount DESC;
                """,
                tuple(params),
            )
            
            rows = cur.fetchall()
            total = sum(float(row[1]) for row in rows)
            
            breakdown = [
                {
                    "mode": row[0] or "Not Specified",
                    "amount": float(row[1]),
                    "percentage": round((float(row[1]) / total * 100), 2) if total > 0 else 0,
                    "transaction_count": row[2],
                }
                for row in rows
            ]
            
            return breakdown
    finally:
        conn.close()


@router.get("/goals/progress")
def get_goals_progress(user_id: str = Depends(get_current_user_id)):
    """
    LEVEL 1: Get detailed goal progress tracking.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, category, target_amount, current_amount, deadline
                FROM goals
                WHERE user_id = %s
                ORDER BY deadline ASC;
                """,
                (user_id,),
            )
            rows = cur.fetchall()
            
            goals = []
            for row in rows:
                target = float(row[3])
                current = float(row[4])
                progress_pct = (current / target * 100) if target > 0 else 0
                
                goals.append({
                    "goal_id": str(row[0]),
                    "goal_name": row[1],
                    "category": row[2],
                    "target_amount": target,
                    "current_amount": current,
                    "progress_percentage": round(progress_pct, 2),
                    "deadline": str(row[5]),
                    "months_remaining": _calculate_months_remaining(row[5]),
                })
            
            return {"goals": goals}
    finally:
        conn.close()


@router.get("/budgets/performance")
def get_budgets_performance(
    year: int = Query(None),
    month: int = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 1: Get budget vs actual performance for the selected period.
    Only shows budgets that were active during the selected month/year.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Build query to filter budgets by the selected period
            budget_query = """
                SELECT id, category, amount, budget_type, start_date, alert_threshold
                FROM budgets
                WHERE user_id = %s
            """
            budget_params = [user_id]
            
            # Filter budgets: only include those where start_date is on or before the selected month
            if year and month:
                # Convert selected month to a date (first day of the month)
                budget_query += """
                    AND EXTRACT(YEAR FROM start_date) = %s 
                    AND EXTRACT(MONTH FROM start_date) = %s
                """
                budget_params.extend([year, month])
            
            budget_query += ";"
            
            cur.execute(budget_query, tuple(budget_params))
            budgets = cur.fetchall()
            
            performance = []
            
            for budget in budgets:
                budget_id, category, budget_amount, budget_type, start_date, alert_threshold = budget
                budget_amount_value = float(budget_amount) if budget_amount is not None else 0.0
                
                # Use category for spending
                spending_category = category
                
                # Get actual spending
                if month and year:
                    cur.execute(
                        """
                        SELECT COALESCE(SUM(amount), 0)
                        FROM transactions
                        WHERE user_id = %s AND txn_type = 'expense' AND category = %s
                        AND EXTRACT(MONTH FROM txn_date) = %s
                        AND EXTRACT(YEAR FROM txn_date) = %s;
                        """,
                        (user_id, spending_category, month, year),
                    )
                else:
                    cur.execute(
                        """
                        SELECT COALESCE(SUM(amount), 0)
                        FROM transactions
                        WHERE user_id = %s AND txn_type = 'expense' AND category = %s;
                        """,
                        (user_id, spending_category),
                    )
                
                actual_spent = float(cur.fetchone()[0])
                percentage_used = (actual_spent / budget_amount_value * 100) if budget_amount_value > 0 else 0
                
                # Determine status
                if actual_spent > budget_amount:
                    status = "Exceeded"
                elif percentage_used >= alert_threshold:
                    status = "Near Limit"
                else:
                    status = "On Track"
                
                performance.append({
                    "budget_id": str(budget_id),
                    "category": category,
                    "budget_amount": budget_amount_value,
                    "actual_spent": actual_spent,
                    "percentage_used": round(percentage_used, 2),
                    "status": status,
                    "alert_threshold": alert_threshold,
                })
            
            return performance
    finally:
        conn.close()


# ======================== L2: Advanced Analytics Endpoints ========================

@router.get("/trends/savings-rate")
def get_savings_rate_trend(
    months: int = Query(12, ge=1, le=60),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Get savings rate (% of income saved) for last N months.
    """
    month_list = _get_last_n_months(months)
    trends = []
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            for year, month in month_list:
                # Get income
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM incomes
                    WHERE user_id = %s AND month = %s AND year = %s;
                    """,
                    (user_id, month, year),
                )
                income = float(cur.fetchone()[0])
                
                # Get expenses
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE user_id = %s AND txn_type = 'expense'
                    AND EXTRACT(MONTH FROM txn_date) = %s
                    AND EXTRACT(YEAR FROM txn_date) = %s;
                    """,
                    (user_id, month, year),
                )
                expense = float(cur.fetchone()[0])
                
                net_savings = income - expense
                savings_rate = (net_savings / income * 100) if income > 0 else 0
                
                trends.append({
                    "month": _format_month_year(year, month),
                    "income": income,
                    "expense": expense,
                    "net_savings": net_savings,
                    "savings_rate_percentage": round(savings_rate, 2),
                })
        
        return trends
    finally:
        conn.close()


@router.get("/breakdown/top-transactions")
def get_top_transactions_report(
    limit: int = Query(10, ge=1, le=50),
    txn_type: str = Query("expense", description="'expense' or 'income'"),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Get top N transactions by amount.
    """
    if txn_type not in ["expense", "income"]:
        raise HTTPException(status_code=400, detail="txn_type must be 'expense' or 'income'")
    
    return {
        "type": txn_type,
        "transactions": _get_top_transactions(user_id, limit, txn_type),
    }


@router.get("/trends/monthly-comparison")
def get_monthly_comparison(
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Get month-over-month comparison (current vs previous months).
    """
    today = date.today()
    current_month = today.month
    current_year = today.year
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            comparison = []
            
            for offset in range(3):  # Current month + 2 previous months
                if offset == 0:
                    month, year = current_month, current_year
                else:
                    target_date = today.replace(day=1) - timedelta(days=offset*30)
                    month, year = target_date.month, target_date.year
                
                # Get income
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM incomes
                    WHERE user_id = %s AND month = %s AND year = %s;
                    """,
                    (user_id, month, year),
                )
                income = float(cur.fetchone()[0])
                
                # Get expenses
                cur.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE user_id = %s AND txn_type = 'expense'
                    AND EXTRACT(MONTH FROM txn_date) = %s
                    AND EXTRACT(YEAR FROM txn_date) = %s;
                    """,
                    (user_id, month, year),
                )
                expense = float(cur.fetchone()[0])
                
                comparison.append({
                    "month": _format_month_year(year, month),
                    "income": income,
                    "expense": expense,
                    "net_savings": income - expense,
                })
            
            return comparison
    finally:
        conn.close()


@router.get("/patterns/recurring-expenses")
def get_recurring_expenses_report(
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Detect recurring expenses (same description/category/amount).
    """
    return {
        "recurring_expenses": _detect_recurring_expenses(user_id),
    }


@router.get("/patterns/spending-anomalies")
def get_spending_anomalies_report(
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Detect unusual spending patterns (high/low spikes).
    """
    return {
        "anomalies": _detect_spending_anomalies(user_id),
    }


@router.get("/summary/detailed")
def get_detailed_summary(
    year: int = Query(None),
    month: int = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    """
    LEVEL 2: Get comprehensive summary with all key metrics.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "user_id = %s AND txn_type = 'expense'"
            params = [user_id]
            
            if year and month:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s AND EXTRACT(MONTH FROM txn_date) = %s"
                params.extend([year, month])
            elif year:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s"
                params.append(year)
            
            # Total expenses
            cur.execute(
                f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE {where_clause};",
                tuple(params),
            )
            total_expense = float(cur.fetchone()[0])
            
            # Total income
            if year and month:
                cur.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE user_id = %s AND month = %s AND year = %s;",
                    (user_id, month, year),
                )
            else:
                cur.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE user_id = %s;",
                    (user_id,),
                )
            total_income = float(cur.fetchone()[0])
            
            # Transaction count
            cur.execute(
                f"SELECT COUNT(*) FROM transactions WHERE {where_clause};",
                tuple(params),
            )
            txn_count = cur.fetchone()[0]
            
            # Average transaction
            avg_txn = (total_expense / txn_count) if txn_count > 0 else 0
            
            # Number of categories
            cur.execute(
                f"SELECT COUNT(DISTINCT category) FROM transactions WHERE {where_clause};",
                tuple(params),
            )
            category_count = cur.fetchone()[0]
            
            return {
                "total_income": total_income,
                "total_expense": total_expense,
                "net_savings": total_income - total_expense,
                "savings_percentage": round((total_income - total_expense) / total_income * 100, 2) if total_income > 0 else 0,
                "transaction_count": txn_count,
                "average_transaction": round(avg_txn, 2),
                "category_count": category_count,
            }
    finally:
        conn.close()


# ======================== Export Endpoints ========================

@router.get("/export/csv")
def export_to_csv(
    year: int = Query(None),
    month: int = Query(None),
    report_type: str = Query("transactions", description="transactions, budgets, or goals"),
    user_id: str = Depends(get_current_user_id),
):
    """
    EXPORT: Generate CSV data for download with normalized categories and cleaned descriptions.
    Returns CSV-formatted data.
    """
    import csv
    import io
    
    if report_type not in ["transactions", "budgets", "goals"]:
        raise HTTPException(status_code=400, detail="Invalid report_type")
    
    # Validate January date range
    if year and month:
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Invalid month. Must be between 1 and 12.")
        if month == 1 and year < 2000:
            raise HTTPException(status_code=400, detail="Invalid year for January.")
    
    # Category normalization map
    category_map = {
        'food': 'Food', 'restaurant': 'Food', 'groceries': 'Food',
        'transport': 'Transport', 'travel': 'Transport', 'taxi': 'Transport', 'uber': 'Transport',
        'healthcare': 'Healthcare', 'medical': 'Healthcare', 'doctor': 'Healthcare',
        'entertainment': 'Entertainment', 'movie': 'Entertainment', 'games': 'Entertainment',
        'shopping': 'Shopping', 'clothes': 'Shopping', 'fashion': 'Shopping',
        'bills': 'Bills', 'utilities': 'Bills', 'electricity': 'Bills',
        'education': 'Education', 'school': 'Education', 'course': 'Education',
        'personal': 'Personal', 'gifts': 'Personal',
    }
    
    def normalize_category(cat_name):
        """Normalize category name to standard format."""
        if not cat_name:
            return "Uncategorized"
        
        cat_name = str(cat_name).strip()
        cat_lower = cat_name.lower()
        
        # Check if it's in our mapping
        normalized = category_map.get(cat_lower, cat_name.title())
        
        # Skip event-specific categories (containing numbers)
        if any(char.isdigit() for char in cat_name):
            normalized = 'Personal'
        
        return normalized
    
    def clean_description(desc):
        """Clean and standardize description/merchant names."""
        if not desc:
            return "N/A"
        
        desc = str(desc).strip()
        
        # Remove placeholder descriptions
        if desc.lower() in ['no description', 'none', '-', '', 'n/a', 'na']:
            return "N/A"
        
        # Standardize merchant names - remove extra spaces
        desc = ' '.join(desc.split())
        
        return desc
    
    conn = get_db_connection()
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        if report_type == "transactions":
            writer.writerow(["Date", "Category", "Amount", "Type", "Description", "Payment Mode"])
            
            where_clause = "user_id = %s"
            params = [user_id]
            
            if year and month:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s AND EXTRACT(MONTH FROM txn_date) = %s"
                params.extend([year, month])
            
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT txn_date, category, amount, txn_type, description, payment_mode
                    FROM transactions
                    WHERE {where_clause}
                    ORDER BY txn_date DESC;
                    """,
                    tuple(params),
                )
                for row in cur.fetchall():
                    # Normalize category and clean description
                    normalized_cat = normalize_category(row[1])
                    cleaned_desc = clean_description(row[4])
                    
                    # Write cleaned row
                    writer.writerow([
                        row[0],  # Date
                        normalized_cat,  # Normalized category
                        row[2],  # Amount
                        row[3],  # Type
                        cleaned_desc,  # Cleaned description
                        row[5] if row[5] else "N/A",  # Payment mode
                    ])
        
        elif report_type == "budgets":
            writer.writerow(["Category", "Budget Type", "Amount", "Start Date", "Alert Threshold %"])
            
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT category, budget_type, amount, start_date, alert_threshold
                    FROM budgets
                    WHERE user_id = %s
                    ORDER BY created_at DESC;
                    """,
                    (user_id,),
                )
                for row in cur.fetchall():
                    # Normalize budget category
                    normalized_cat = normalize_category(row[0])
                    writer.writerow([
                        normalized_cat,
                        row[1],
                        row[2],
                        row[3],
                        row[4]
                    ])
        
        elif report_type == "goals":
            writer.writerow(["Goal Name", "Category", "Target Amount", "Current Amount", "Progress %", "Deadline"])
            
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT name, category, target_amount, current_amount, deadline
                    FROM goals
                    WHERE user_id = %s
                    ORDER BY deadline ASC;
                    """,
                    (user_id,),
                )
                for row in cur.fetchall():
                    progress = (float(row[3]) / float(row[2]) * 100) if float(row[2]) > 0 else 0
                    normalized_cat = normalize_category(row[1])
                    
                    writer.writerow([
                        row[0],  # Goal name
                        normalized_cat,  # Normalized category
                        row[2],  # Target amount
                        row[3],  # Current amount
                        f"{progress:.2f}%",  # Progress
                        row[4]  # Deadline
                    ])
        
        return {"csv": output.getvalue()}
    finally:
        conn.close()


@router.get("/export/summary-data")
def get_export_summary_data(
    year: int = Query(None),
    month: int = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    """
    EXPORT: Get all data needed for PDF/Excel export in structured format.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            where_clause = "user_id = %s"
            params = [user_id]
            
            if year and month:
                where_clause += " AND EXTRACT(YEAR FROM txn_date) = %s AND EXTRACT(MONTH FROM txn_date) = %s"
                params.extend([year, month])
            
            # Summary stats
            cur.execute(
                f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE {where_clause} AND txn_type = 'expense';",
                tuple(params),
            )
            total_expense = float(cur.fetchone()[0])
            
            if year and month:
                cur.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE user_id = %s AND month = %s AND year = %s;",
                    (user_id, month, year),
                )
            else:
                cur.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE user_id = %s;",
                    (user_id,),
                )
            total_income = float(cur.fetchone()[0])
            
            # Category breakdown - normalize and clean
            cur.execute(
                f"""
                SELECT category, SUM(amount)
                FROM transactions
                WHERE {where_clause} AND txn_type = 'expense' AND category IS NOT NULL AND category != ''
                GROUP BY category
                ORDER BY SUM(amount) DESC;
                """,
                tuple(params),
            )
            
            # Normalize category names
            category_map = {
                'food': 'Food', 'restaurant': 'Food', 'groceries': 'Food',
                'transport': 'Transport', 'travel': 'Transport', 'taxi': 'Transport', 'uber': 'Transport',
                'healthcare': 'Healthcare', 'medical': 'Healthcare', 'doctor': 'Healthcare',
                'entertainment': 'Entertainment', 'movie': 'Entertainment', 'games': 'Entertainment',
                'shopping': 'Shopping', 'clothes': 'Shopping', 'fashion': 'Shopping',
                'bills': 'Bills', 'utilities': 'Bills', 'electricity': 'Bills',
                'education': 'Education', 'school': 'Education', 'course': 'Education',
                'personal': 'Personal', 'gifts': 'Personal',
            }
            
            categories_raw = cur.fetchall()
            category_totals = defaultdict(float)
            
            for row in categories_raw:
                cat_name = str(row[0]).strip()
                amount = float(row[1])
                
                # Normalize category name
                cat_lower = cat_name.lower()
                normalized = category_map.get(cat_lower, cat_name.title())
                
                # Skip event-specific categories (containing numbers or special patterns)
                if any(char.isdigit() for char in cat_name):
                    normalized = 'Personal'
                
                category_totals[normalized] += amount
            
            categories = [
                {"name": cat, "amount": amt}
                for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
            ]
            
            # Recent transactions - limit to 10, clean descriptions
            cur.execute(
                f"""
                SELECT txn_date, category, amount, txn_type, description
                FROM transactions
                WHERE {where_clause} AND category IS NOT NULL AND category != ''
                ORDER BY txn_date DESC
                LIMIT 10;
                """,
                tuple(params),
            )
            
            transactions = []
            for row in cur.fetchall():
                cat_name = str(row[1]).strip()
                cat_lower = cat_name.lower()
                normalized_cat = category_map.get(cat_lower, cat_name.title())
                
                if any(char.isdigit() for char in cat_name):
                    normalized_cat = 'Personal'
                
                desc = str(row[4]) if row[4] else "N/A"
                if desc.lower() in ['no description', 'none', '-', '']:
                    desc = "N/A"
                
                transactions.append({
                    "date": str(row[0]),
                    "category": normalized_cat,
                    "amount": float(row[2]),
                    "type": row[3],
                    "description": desc[:50],  # Truncate long descriptions
                })
            
            # Budgets
            cur.execute(
                """
                SELECT category, amount
                FROM budgets
                WHERE user_id = %s;
                """,
                (user_id,),
            )
            budgets = [{"category": row[0], "amount": float(row[1])} for row in cur.fetchall()]
            
            return {
                "summary": {
                    "total_income": total_income,
                    "total_expense": total_expense,
                    "net_savings": total_income - total_expense,
                },
                "categories": categories,
                "transactions": transactions,
                "budgets": budgets,
                "report_date": str(date.today()),
                "report_period": f"{_format_month_year(year, month)}" if year and month else "All Time",
            }
    finally:
        conn.close()
