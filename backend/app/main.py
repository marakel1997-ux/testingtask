from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.api import auth, public, wishlists
from app.core.config import settings

app = FastAPI(title=settings.app_name)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(wishlists.router, prefix=settings.api_v1_prefix)
app.include_router(public.router, prefix=settings.api_v1_prefix)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.exception_handler(ValidationError)
async def validation_exception_handler(_, exc: ValidationError):
    return JSONResponse(status_code=422, content={'detail': exc.errors()})


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(_, __):
    return JSONResponse(status_code=409, content={'detail': 'Database integrity error'})
