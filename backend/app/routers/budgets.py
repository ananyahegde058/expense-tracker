from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"]
)

@router.post("", response_model=schemas.BudgetResponse)
def set_budget(
    budget_in: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    category = db.query(models.Category).filter(models.Category.id == budget_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid Category ID")

    db_budget = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category_id == budget_in.category_id,
        models.Budget.month == budget_in.month,
        models.Budget.year == budget_in.year
    ).first()

    if db_budget:
        db_budget.amount = budget_in.amount
    else:
        db_budget = models.Budget(
            user_id=current_user.id,
            category_id=budget_in.category_id,
            amount=budget_in.amount,
            month=budget_in.month,
            year=budget_in.year
        )
        db.add(db_budget)

    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.get("", response_model=List[schemas.BudgetResponse])
def get_budgets(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.now()
    q_month = month if month is not None else now.month
    q_year = year if year is not None else now.year

    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.month == q_month,
        models.Budget.year == q_year
    ).all()
    return budgets

@router.get("/status", response_model=List[schemas.BudgetStatus])
def get_budgets_status(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.now()
    q_month = month if month is not None else now.month
    q_year = year if year is not None else now.year

    categories = db.query(models.Category).all()

    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.month == q_month,
        models.Budget.year == q_year
    ).all()
    budget_map = {b.category_id: b for b in budgets}

    import calendar
    from datetime import date as d_date

    _, last_day = calendar.monthrange(q_year, q_month)
    start_date = d_date(q_year, q_month, 1)
    end_date = d_date(q_year, q_month, last_day)

    spending_query = db.query(
        models.Expense.category_id,
        func.sum(models.Expense.amount).label("total_spend")
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_date,
        models.Expense.date <= end_date
    ).group_by(models.Expense.category_id).all()

    spending_map = {item[0]: item[1] for item in spending_query}

    status_list = []
    for cat in categories:
        budget_item = budget_map.get(cat.id)
        budget_amt = budget_item.amount if budget_item else 0.0
        spend_amt = spending_map.get(cat.id, 0.0)

        percentage = 0.0
        alert = False
        exceeded_by = 0.0  # NEW

        if budget_amt > 0:
            percentage = round((spend_amt / budget_amt) * 100, 2)
            if percentage >= 80.0:
                alert = True
            if spend_amt > budget_amt:
                exceeded_by = round(spend_amt - budget_amt, 2)

        status_list.append(
            schemas.BudgetStatus(
                category_id=cat.id,
                category_name=cat.name,
                icon=cat.icon,
                color=cat.color,
                budget_amount=budget_amt,
                current_spending=spend_amt,
                percentage=percentage,
                alert=alert,
                exceeded_by=exceeded_by
            )
        )

    return status_list
