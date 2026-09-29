from fastapi import APIRouter

from app.api.v1.endpoints import forms, fields, public, responses

api_router = APIRouter()

api_router.include_router(forms.router, prefix="/forms", tags=["Forms"])
api_router.include_router(fields.router, prefix="/forms", tags=["Form Fields"])
api_router.include_router(responses.router, prefix="/forms", tags=["Responses & Analytics"])
api_router.include_router(public.router, prefix="/public", tags=["Public Respondent"])
