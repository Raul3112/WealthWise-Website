"""Goals feature routes for WealthWise backend."""

from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from auth import get_current_user_id
from database import get_db_connection


router = APIRouter(prefix="/goals", tags=["goals"])


# Pydantic models for request/response validation
class GoalCreate(BaseModel):
	name: str
	category: str  # emergency, travel, education, gadget, home, other
	target_amount: float
	current_amount: float = 0.0
	deadline: date
	notes: Optional[str] = None

	@field_validator("target_amount")
	@classmethod
	def validate_target_amount(cls, value: float) -> float:
		if value <= 0:
			raise ValueError("Target amount must be positive")
		return value

	@field_validator("current_amount")
	@classmethod
	def validate_current_amount(cls, value: float) -> float:
		if value < 0:
			raise ValueError("Current amount cannot be negative")
		return value


class GoalUpdate(BaseModel):
	name: Optional[str] = None
	target_amount: Optional[float] = None
	deadline: Optional[date] = None
	notes: Optional[str] = None

	@field_validator("target_amount")
	@classmethod
	def validate_target_amount(cls, value: Optional[float]) -> Optional[float]:
		if value is not None and value <= 0:
			raise ValueError("Target amount must be positive")
		return value


class AddSavingsRequest(BaseModel):
	amount: float
	notes: Optional[str] = None

	@field_validator("amount")
	@classmethod
	def validate_amount(cls, value: float) -> float:
		if value <= 0:
			raise ValueError("Savings amount must be positive")
		return value


class GoalResponse(BaseModel):
	id: str
	user_id: str
	name: str
	category: str
	target_amount: float
	current_amount: float
	deadline: date
	notes: Optional[str]
	created_at: datetime
	updated_at: datetime

	class Config:
		from_attributes = True


# Helper functions
def _get_available_balance(user_id: str) -> float:
	"""Calculate available balance: Income - Expenses - Goals"""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			total_income = 0
			total_expenses = 0
			total_goals = 0
			
			# Get total income for current month
			cur.execute(
				"""
				SELECT COALESCE(SUM(amount), 0)
				FROM incomes
				WHERE user_id = %s 
				AND month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
				AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
				""",
				(user_id,),
			)
			income_result = cur.fetchone()
			total_income = float(income_result[0]) if income_result and income_result[0] else 0
			
			# Get total expenses for current month
			cur.execute(
				"""
				SELECT COALESCE(SUM(amount), 0)
				FROM transactions
				WHERE user_id = %s AND txn_type = 'expense'
				AND EXTRACT(YEAR FROM txn_date) = EXTRACT(YEAR FROM CURRENT_DATE)
				AND EXTRACT(MONTH FROM txn_date) = EXTRACT(MONTH FROM CURRENT_DATE);
				""",
				(user_id,),
			)
			expense_result = cur.fetchone()
			total_expenses = float(expense_result[0]) if expense_result and expense_result[0] else 0
			
			# Get remaining amount to save for ACTIVE goals only
			# For each active goal, calculate how much is left to save (target - current)
			cur.execute(
				"""
				SELECT COALESCE(SUM(target_amount - current_amount), 0)
				FROM goals
				WHERE user_id = %s AND current_amount < target_amount;
				""",
				(user_id,),
			)
			goals_result = cur.fetchone()
			total_goals_remaining = float(goals_result[0]) if goals_result and goals_result[0] else 0
			
			# Calculate: Income - Expenses - Remaining Goals to Save
			available = total_income - total_expenses - total_goals_remaining
			return max(0, available)  # Return at least 0
	finally:
		conn.close()


# Endpoints
@router.get("")
def get_all_goals(user_id: str = Depends(get_current_user_id)):
	"""Fetch all goals for the current user."""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			cur.execute(
				"""
				SELECT id, user_id, name, category, target_amount, current_amount,
					   deadline, notes, created_at, updated_at
				FROM goals
				WHERE user_id = %s
				ORDER BY deadline ASC;
				""",
				(user_id,),
			)
			rows = cur.fetchall()
			goals = []
			for row in rows:
				goals.append({
					"id": str(row[0]),
					"user_id": row[1],
					"name": row[2],
					"category": row[3],
					"target_amount": float(row[4]),
					"current_amount": float(row[5]),
					"deadline": row[6],
					"notes": row[7],
					"created_at": row[8],
					"updated_at": row[9],
				})
			return {"goals": goals, "available_balance": _get_available_balance(user_id)}
	finally:
		conn.close()


@router.post("")
def create_goal(
	goal_data: GoalCreate,
	user_id: str = Depends(get_current_user_id),
):
	"""Create a new goal."""
	# Validate available balance
	available = _get_available_balance(user_id)
	if goal_data.target_amount > available:
		raise HTTPException(
			status_code=400,
			detail=f"Amount exceeds available balance. Available: ₹{available:.2f}",
		)

	goal_id = str(uuid4())
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			cur.execute(
				"""
				INSERT INTO goals (id, user_id, name, category, target_amount, current_amount, deadline, notes)
				VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
				RETURNING id, user_id, name, category, target_amount, current_amount, deadline, notes, created_at, updated_at;
				""",
				(
					goal_id,
					user_id,
					goal_data.name,
					goal_data.category,
					goal_data.target_amount,
					goal_data.current_amount,
					goal_data.deadline,
					goal_data.notes,
				),
			)
			result = cur.fetchone()
			conn.commit()

			return {
				"id": str(result[0]),
				"user_id": result[1],
				"name": result[2],
				"category": result[3],
				"target_amount": float(result[4]),
				"current_amount": float(result[5]),
				"deadline": result[6],
				"notes": result[7],
				"created_at": result[8],
				"updated_at": result[9],
			}
	except Exception as e:
		conn.rollback()
		raise HTTPException(status_code=400, detail=str(e))
	finally:
		conn.close()


@router.get("/{goal_id}")
def get_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
	"""Fetch a specific goal by ID."""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			cur.execute(
				"""
				SELECT id, user_id, name, category, target_amount, current_amount,
					   deadline, notes, created_at, updated_at
				FROM goals
				WHERE id = %s AND user_id = %s;
				""",
				(goal_id, user_id),
			)
			row = cur.fetchone()
			if not row:
				raise HTTPException(status_code=404, detail="Goal not found")

			return {
				"id": str(row[0]),
				"user_id": row[1],
				"name": row[2],
				"category": row[3],
				"target_amount": float(row[4]),
				"current_amount": float(row[5]),
				"deadline": row[6],
				"notes": row[7],
				"created_at": row[8],
				"updated_at": row[9],
			}
	finally:
		conn.close()


@router.patch("/{goal_id}")
def update_goal(
	goal_id: str,
	goal_data: GoalUpdate,
	user_id: str = Depends(get_current_user_id),
):
	"""Update a goal."""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			# Check goal exists
			cur.execute(
				"SELECT id FROM goals WHERE id = %s AND user_id = %s;",
				(goal_id, user_id),
			)
			if not cur.fetchone():
				raise HTTPException(status_code=404, detail="Goal not found")

			# Build dynamic update query
			updates = []
			params = []
			if goal_data.name is not None:
				updates.append("name = %s")
				params.append(goal_data.name)
			if goal_data.target_amount is not None:
				updates.append("target_amount = %s")
				params.append(goal_data.target_amount)
			if goal_data.deadline is not None:
				updates.append("deadline = %s")
				params.append(goal_data.deadline)
			if goal_data.notes is not None:
				updates.append("notes = %s")
				params.append(goal_data.notes)

			if not updates:
				raise HTTPException(status_code=400, detail="No fields to update")

			updates.append("updated_at = CURRENT_TIMESTAMP")
			params.extend([goal_id, user_id])

			query = f"""
				UPDATE goals
				SET {', '.join(updates)}
				WHERE id = %s AND user_id = %s
				RETURNING id, user_id, name, category, target_amount, current_amount, deadline, notes, created_at, updated_at;
			"""

			cur.execute(query, params)
			result = cur.fetchone()
			conn.commit()

			return {
				"id": str(result[0]),
				"user_id": result[1],
				"name": result[2],
				"category": result[3],
				"target_amount": float(result[4]),
				"current_amount": float(result[5]),
				"deadline": result[6],
				"notes": result[7],
				"created_at": result[8],
				"updated_at": result[9],
			}
	except HTTPException:
		raise
	except Exception as e:
		conn.rollback()
		raise HTTPException(status_code=400, detail=str(e))
	finally:
		conn.close()


@router.delete("/{goal_id}")
def delete_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
	"""Delete a goal."""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			cur.execute(
				"DELETE FROM goals WHERE id = %s AND user_id = %s;",
				(goal_id, user_id),
			)
			if cur.rowcount == 0:
				raise HTTPException(status_code=404, detail="Goal not found")
			conn.commit()
			return {"message": "Goal deleted successfully"}
	except HTTPException:
		raise
	except Exception as e:
		conn.rollback()
		raise HTTPException(status_code=400, detail=str(e))
	finally:
		conn.close()


@router.post("/{goal_id}/savings")
def add_savings_to_goal(
	goal_id: str,
	savings_data: AddSavingsRequest,
	user_id: str = Depends(get_current_user_id),
):
	"""Add savings to a goal."""
	conn = get_db_connection()
	try:
		with conn.cursor() as cur:
			# Get current goal details
			cur.execute(
				"SELECT current_amount, target_amount FROM goals WHERE id = %s AND user_id = %s;",
				(goal_id, user_id),
			)
			row = cur.fetchone()
			if not row:
				raise HTTPException(status_code=404, detail="Goal not found")

			current_amount, target_amount = row
			new_amount = float(current_amount) + savings_data.amount

			# Validate it doesn't exceed target
			if new_amount > target_amount:
				raise HTTPException(
					status_code=400,
					detail=f"Amount would exceed target. Remaining: ₹{target_amount - float(current_amount):.2f}",
				)

			# Update goal's current_amount
			cur.execute(
				"""
				UPDATE goals
				SET current_amount = %s, updated_at = CURRENT_TIMESTAMP
				WHERE id = %s AND user_id = %s
				RETURNING id, user_id, name, category, target_amount, current_amount, deadline, notes, created_at, updated_at;
				""",
				(new_amount, goal_id, user_id),
			)
			result = cur.fetchone()
			conn.commit()

			return {
				"id": str(result[0]),
				"user_id": result[1],
				"name": result[2],
				"category": result[3],
				"target_amount": float(result[4]),
				"current_amount": float(result[5]),
				"deadline": result[6],
				"notes": result[7],
				"created_at": result[8],
				"updated_at": result[9],
				"message": f"₹{savings_data.amount:.2f} added to {result[2]}",
			}
	except HTTPException:
		raise
	except Exception as e:
		conn.rollback()
		raise HTTPException(status_code=400, detail=str(e))
	finally:
		conn.close()
