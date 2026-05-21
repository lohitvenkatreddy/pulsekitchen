from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from restaurant_service.app import models

engine = create_engine('postgresql://postgres:postgres@localhost:5432/pop_db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

items = db.query(models.MenuItem).all()
for item in items:
    print(item.id, item.name, item.is_available)
