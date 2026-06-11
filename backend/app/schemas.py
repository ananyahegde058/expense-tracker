from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Email verification
class EmailVerifyRequest(BaseModel):
    token: str

# Password reset
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

# Category Schemas
class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Expense Schemas
class ExpenseCreate(BaseModel):
    category_id: int
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    date: date
    notes: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[date] = None  # type: ignore
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    date: date
    notes: Optional[str] = None
    created_at: datetime
    category: CategoryResponse

    model_config = ConfigDict(from_attributes=True)

class ExpensesListResponse(BaseModel):
    expenses: List[ExpenseResponse]
    total: int

# Budget Schemas
class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)

class BudgetUpdate(BaseModel):
    amount: float = Field(..., gt=0)

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    month: int
    year: int
    category: CategoryResponse

    model_config = ConfigDict(from_attributes=True)

class BudgetStatus(BaseModel):
    category_id: int
    category_name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    budget_amount: float
    current_spending: float
    percentage: float
    alert: bool
    exceeded_by: float  # NEW: how much over budget

# Analytics Schemas
class SpendingByCategory(BaseModel):
    category_id: int
    category_name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    total: float
    percentage: float

class MonthlyTrend(BaseModel):
    year: int
    month: int
    total: float

class InsightItem(BaseModel):
    type: str  # 'info', 'warning', 'success'
    message: str
