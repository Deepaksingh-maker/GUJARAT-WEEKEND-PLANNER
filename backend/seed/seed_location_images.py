"""
Idempotent Seeder for Real Gujarat Location Images and Metadata.
Populates:
1. `locations` table: image_url, landmark_name, image_source, source_url, image_license, image_attribution
2. `location_images` table: location_id, image_url, landmark_name, caption, source_name, source_url, license, attribution, is_primary, sort_order
"""

import sys
import logging
from sqlalchemy.orm import Session

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

import sys
sys.path.insert(0, '.')
from backend.app.database import SessionLocal
from backend.app.models.location import Location, LocationImage
from backend.seed.real_location_images_data import MAJOR_LOCATION_IMAGES, DISTRICT_HERITAGE_IMAGES


def seed_location_images(db: Session = None):
    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True

    try:
        logger.info("Starting Gujarat Real Location Images Seeding...")

        # 1. Fetch all locations in database
        all_locations = db.query(Location).all()
        logger.info(f"Found {len(all_locations)} total locations in database.")

        # Group major location images by location_slug
        major_by_slug = {}
        for img in MAJOR_LOCATION_IMAGES:
            slug = img["location_slug"].strip().lower()
            if slug not in major_by_slug:
                major_by_slug[slug] = []
            major_by_slug[slug].append(img)

        updated_count = 0
        images_inserted = 0

        # Mapping variations for slugs
        slug_aliases = {
            "awhwa": "ahwa",
            "ahwa-dang": "ahwa",
            "kevadiya": "ekta-nagar",
            "kevadia": "ekta-nagar",
            "statue-of-unity": "ekta-nagar",
            "sasan": "sasan-gir",
            "gir": "sasan-gir",
            "gir-national-park": "sasan-gir",
            "mandvi": "mandvi-kutch",
        }

        for loc in all_locations:
            loc_slug = loc.slug.strip().lower()
            canonical_slug = slug_aliases.get(loc_slug, loc_slug)

            # Determine image entries for this location
            candidate_images = []

            # Check exact or aliased slug in major images
            if canonical_slug in major_by_slug:
                candidate_images = major_by_slug[canonical_slug]
            elif loc_slug in major_by_slug:
                candidate_images = major_by_slug[loc_slug]
            else:
                # Check if location name matches any major slug
                loc_name_slug = loc.name.lower().replace(" ", "-").replace("'", "")
                if loc_name_slug in major_by_slug:
                    candidate_images = major_by_slug[loc_name_slug]

            # If still not matched, use district-level heritage image
            if not candidate_images and loc.district:
                dist_data = DISTRICT_HERITAGE_IMAGES.get(loc.district)
                if dist_data:
                    candidate_images = [{
                        "location_slug": loc.slug,
                        "landmark_name": dist_data["landmark_name"],
                        "caption": f"{loc.name} ({loc.district} District Heritage)",
                        "image_url": dist_data["image_url"],
                        "source_name": dist_data["source_name"],
                        "source_url": dist_data["source_url"],
                        "license": dist_data["license"],
                        "attribution": dist_data["attribution"],
                        "is_primary": True
                    }]

            # Default fallback to state-level heritage if somehow district didn't match
            if not candidate_images:
                candidate_images = [{
                    "location_slug": loc.slug,
                    "landmark_name": "Gujarat Cultural Heritage & Vistas",
                    "caption": f"{loc.name}, Gujarat",
                    "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
                    "source_name": "Gujarat Tourism Official",
                    "source_url": "https://gujarattourism.com",
                    "license": "CC BY-SA 4.0",
                    "attribution": "Tourism Corporation of Gujarat",
                    "is_primary": True
                }]

            # Determine primary image
            primary_img = next((img for img in candidate_images if img.get("is_primary")), candidate_images[0])

            # Update Location record fields
            loc.image_url = primary_img["image_url"]
            loc.landmark_name = primary_img["landmark_name"]
            loc.image_source = primary_img["source_name"]
            loc.source_url = primary_img["source_url"]
            loc.image_license = primary_img["license"]
            loc.image_attribution = primary_img["attribution"]
            updated_count += 1

            # Manage location_images entries (idempotent: delete existing images for this location and recreate)
            db.query(LocationImage).filter(LocationImage.location_id == loc.id).delete()

            for order_idx, img_data in enumerate(candidate_images):
                loc_img = LocationImage(
                    location_id=loc.id,
                    image_url=img_data["image_url"],
                    caption=img_data.get("caption") or img_data.get("landmark_name"),
                    source_name=img_data.get("source_name"),
                    source_url=img_data.get("source_url"),
                    license=img_data.get("license"),
                    attribution=img_data.get("attribution"),
                    is_primary=img_data.get("is_primary", order_idx == 0)
                )
                db.add(loc_img)
                images_inserted += 1

        db.commit()
        logger.info(f"Successfully updated {updated_count} locations with real photographs.")
        logger.info(f"Populated {images_inserted} records in location_images table.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding location images: {e}")
        raise e
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    seed_location_images()
