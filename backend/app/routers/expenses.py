from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"]
)

@router.post("", response_model=schemas.ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify category exists
    category = db.query(models.Category).filter(models.Category.id == expense_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid Category ID")

    new_expense = models.Expense(
        user_id=current_user.id,
        category_id=expense_in.category_id,
        amount=expense_in.amount,
        date=expense_in.date,
        notes=expense_in.notes
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("", response_model=schemas.ExpensesListResponse)
def get_expenses(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[int] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Expense).filter(models.Expense.user_id == current_user.id)

    # Filtering
    if start_date:
        query = query.filter(models.Expense.date >= start_date)
    if end_date:
        query = query.filter(models.Expense.date <= end_date)
    if category_id:
        query = query.filter(models.Expense.category_id == category_id)
    if min_amount is not None:
        query = query.filter(models.Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Expense.amount <= max_amount)
    if search:
        query = query.filter(models.Expense.notes.ilike(f"%{search}%"))

    # Get total count before pagination
    total = query.count()

    # Pagination and sorting (newest first)
    expenses = query.order_by(models.Expense.date.desc(), models.Expense.id.desc()).offset(offset).limit(limit).all()

    return {"expenses": expenses, "total": total}

@router.put("/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_in: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id, 
        models.Expense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Expense not found or unauthorized"
        )

    # If updating category, check if it exists
    if expense_in.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == expense_in.category_id).first()
        if not category:
            raise HTTPException(status_code=400, detail="Invalid Category ID")
        expense.category_id = expense_in.category_id

    # Update other fields if provided
    if expense_in.amount is not None:
        expense.amount = expense_in.amount
    if expense_in.date is not None:
        expense.date = expense_in.date
    if expense_in.notes is not None:
        expense.notes = expense_in.notes

    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id, 
        models.Expense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Expense not found or unauthorized"
        )

    db.delete(expense)
    db.commit()
    return None
