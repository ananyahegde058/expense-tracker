from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

@router.get("/spending-by-category", response_model=List[schemas.SpendingByCategory])
def get_spending_by_category(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.now()
    q_month = month if month is not None else now.month
    q_year = year if year is not None else now.year
    
    import calendar
    from datetime import date
    _, last_day = calendar.monthrange(q_year, q_month)
    start_date = date(q_year, q_month, 1)
    end_date = date(q_year, q_month, last_day)

    query_results = db.query(
        models.Expense.category_id,
        models.Category.name,
        models.Category.icon,
        models.Category.color,
        func.sum(models.Expense.amount).label("total")
    ).join(
        models.Category, models.Expense.category_id == models.Category.id
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_date,
        models.Expense.date <= end_date
    ).group_by(
        models.Expense.category_id,
        models.Category.name,
        models.Category.icon,
        models.Category.color
    ).all()

    total_month_spend = sum(res[4] for res in query_results)

    results = []
    for category_id, name, icon, color, total in query_results:
        percentage = round((total / total_month_spend) * 100, 2) if total_month_spend > 0 else 0
        results.append(
            schemas.SpendingByCategory(
                category_id=category_id,
                category_name=name,
                icon=icon,
                color=color,
                total=round(total, 2),
                percentage=percentage
            )
        )
    return results

@router.get("/monthly-trends", response_model=List[schemas.MonthlyTrend])
def get_monthly_trends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.now()
    trends = []
    
    # Construct last 6 months list
    months_list = []
    curr_year = now.year
    curr_month = now.month
    for _ in range(6):
        months_list.append((curr_year, curr_month))
        curr_month -= 1
        if curr_month == 0:
            curr_month = 12
            curr_year -= 1
    months_list.reverse() # Show oldest to newest
    
    import calendar
    from datetime import date
    start_year, start_month = months_list[0]
    end_year, end_month = months_list[-1]
    _, last_day = calendar.monthrange(end_year, end_month)
    
    start_date = date(start_year, start_month, 1)
    end_date = date(end_year, end_month, last_day)
    
    # Query all expenses in this range
    expenses = db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_date,
        models.Expense.date <= end_date
    ).all()
    
    # Group in python (database agnostic)
    spend_map = {}
    for exp in expenses:
        key = (exp.date.year, exp.date.month)
        spend_map[key] = spend_map.get(key, 0.0) + exp.amount
        
    for y, m in months_list:
        trends.append(
            schemas.MonthlyTrend(
                year=y,
                month=m,
                total=round(spend_map.get((y, m), 0.0), 2)
            )
        )
    return trends

@router.get("/insights", response_model=List[schemas.InsightItem])
def get_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.now()
    curr_month, curr_year = now.month, now.year
    
    prev_month = curr_month - 1
    prev_year = curr_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
        
    import calendar
    from datetime import date
    
    _, last_day_curr = calendar.monthrange(curr_year, curr_month)
    start_curr = date(curr_year, curr_month, 1)
    end_curr = date(curr_year, curr_month, last_day_curr)
    
    _, last_day_prev = calendar.monthrange(prev_year, prev_month)
    start_prev = date(prev_year, prev_month, 1)
    end_prev = date(prev_year, prev_month, last_day_prev)

    # Current month total spend
    curr_spend = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_curr,
        models.Expense.date <= end_curr
    ).scalar() or 0.0

    # Previous month total spend
    prev_spend = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_prev,
        models.Expense.date <= end_prev
    ).scalar() or 0.0

    insights = []

    # 1. MoM Insight
    if prev_spend > 0:
        diff_pct = round(((curr_spend - prev_spend) / prev_spend) * 100, 1)
        if diff_pct > 0:
            insights.append(
                schemas.InsightItem(
                    type="warning",
                    message=f"You spent {diff_pct}% more this month compared to last month (${curr_spend:.2f} vs ${prev_spend:.2f})."
                )
            )
        elif diff_pct < 0:
            insights.append(
                schemas.InsightItem(
                    type="success",
                    message=f"Great job! You spent {abs(diff_pct)}% less this month compared to last month (${curr_spend:.2f} vs ${prev_spend:.2f})."
                )
            )
        else:
            insights.append(
                schemas.InsightItem(
                    type="info",
                    message=f"Your spending is identical to last month (${curr_spend:.2f})."
                )
            )
    else:
        insights.append(
            schemas.InsightItem(
                type="info",
                message=f"This month's total spending is ${curr_spend:.2f}. Start tracking regularly to see month-over-month comparisons!"
            )
        )

    # 2. Top Spending Category
    top_cat = db.query(
        models.Category.name,
        func.sum(models.Expense.amount).label("total")
    ).join(
        models.Category, models.Expense.category_id == models.Category.id
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= start_curr,
        models.Expense.date <= end_curr
    ).group_by(models.Category.name).order_by(func.sum(models.Expense.amount).desc()).first()

    if top_cat:
        insights.append(
            schemas.InsightItem(
                type="info",
                message=f"Your top spending category this month is '{top_cat[0]}' with ${top_cat[1]:.2f} spent."
            )
        )

    # 3. Budget alerts (active warnings)
    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.month == curr_month,
        models.Budget.year == curr_year
    ).all()

    for budget in budgets:
        cat_spend = db.query(func.sum(models.Expense.amount)).filter(
            models.Expense.user_id == current_user.id,
            models.Expense.category_id == budget.category_id,
            models.Expense.date >= start_curr,
            models.Expense.date <= end_curr
        ).scalar() or 0.0

        if budget.amount > 0:
            pct = round((cat_spend / budget.amount) * 100, 1)
            if pct >= 100.0:
                insights.append(
                    schemas.InsightItem(
                        type="warning",
                        message=f"🚨 BUDGET EXCEEDED: You have exceeded your budget for '{budget.category.name}' (${cat_spend:.2f} spent of ${budget.amount:.2f} budget)."
                    )
                )
            elif pct >= 80.0:
                insights.append(
                    schemas.InsightItem(
                        type="warning",
                        message=f"⚠️ Budget Warning: You have used {pct:.1f}% of your '{budget.category.name}' budget (${cat_spend:.2f} spent of ${budget.amount:.2f} budget)."
                    )
                )

    return insights
