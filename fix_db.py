from database import engine, SessionLocal, AvatarProfile
from sqlalchemy import text, inspect

# Check columns
inspector = inspect(engine)
cols = [c['name'] for c in inspector.get_columns('avatar_profiles')]
print('Current columns:', cols)

# Add local_filename column if missing
if 'local_filename' not in cols:
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE avatar_profiles ADD COLUMN local_filename VARCHAR'))
        conn.commit()
    print('Added local_filename column!')
else:
    print('Column already exists')

# Update existing record
db = SessionLocal()
p = db.query(AvatarProfile).filter_by(user_id=1, relation_type='brother').first()
if p:
    p.local_filename = 'user_1_brother.jpg'
    db.commit()
    print('Updated! image_url:', p.image_url)
else:
    print('No profile found')
db.close()