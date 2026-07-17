from fastapi import APIRouter
from .notes import router as notes_router
from .formula import router as formula_router
from .flashcards import router as flashcards_router
from .mcq import router as mcq_router
from exports.export import router as export_router

router = APIRouter()
router.include_router(notes_router)
router.include_router(formula_router)
router.include_router(flashcards_router)
router.include_router(mcq_router)
router.include_router(export_router)
