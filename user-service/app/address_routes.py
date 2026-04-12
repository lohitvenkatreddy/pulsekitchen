from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import database
from . import address_models as am
from . import address_schemas as asch
from .security import get_token_payload

router = APIRouter(prefix="/api/v1/users/me", tags=["Addresses"])


@router.get("/addresses", response_model=list[asch.AddressResponse])
def list_my_addresses(
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    uid = payload.get("user_id")
    rows = db.query(am.UserAddress).filter(am.UserAddress.user_id == uid).order_by(am.UserAddress.is_default.desc()).all()
    return rows


@router.post("/addresses", response_model=asch.AddressResponse, status_code=status.HTTP_201_CREATED)
def add_address(
    body: asch.AddressCreate,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    uid = payload.get("user_id")
    if body.is_default:
        db.query(am.UserAddress).filter(am.UserAddress.user_id == uid).update({"is_default": False})
    row = am.UserAddress(user_id=uid, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/addresses/{address_id}", response_model=asch.AddressResponse)
def update_address(
    address_id: int,
    body: asch.AddressUpdate,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    uid = payload.get("user_id")
    row = db.query(am.UserAddress).filter(am.UserAddress.id == address_id, am.UserAddress.user_id == uid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    data = body.model_dump(exclude_unset=True)
    if data.get("is_default"):
        db.query(am.UserAddress).filter(am.UserAddress.user_id == uid).update({"is_default": False})
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    uid = payload.get("user_id")
    row = db.query(am.UserAddress).filter(am.UserAddress.id == address_id, am.UserAddress.user_id == uid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(row)
    db.commit()
    return None
