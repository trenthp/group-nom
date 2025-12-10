#!/usr/bin/env python3
"""
Overture Maps Places Import Script for Group Nom

This script downloads restaurant data from Overture Maps Foundation,
processes it with H3 geospatial indexing, and loads it into Neon Postgres.

Usage:
    python import-overture.py --release 2025-01 --states CA,TX,NY
    python import-overture.py --release 2025-01 --nationwide

Requirements:
    pip install -r requirements.txt

Environment Variables:
    DATABASE_URL - Neon Postgres connection string
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from typing import Optional

import duckdb
import h3
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Overture Maps S3 paths
OVERTURE_S3_BASE = "s3://overturemaps-us-west-2/release"
OVERTURE_THEME = "places"

# Restaurant-related categories to include
RESTAURANT_CATEGORIES = [
    'restaurant',
    'cafe',
    'coffee_shop',
    'bar',
    'pub',
    'brewery',
    'bakery',
    'food_truck',
    'fast_food_restaurant',
    'pizza_restaurant',
    'italian_restaurant',
    'mexican_restaurant',
    'chinese_restaurant',
    'japanese_restaurant',
    'thai_restaurant',
    'indian_restaurant',
    'vietnamese_restaurant',
    'korean_restaurant',
    'french_restaurant',
    'greek_restaurant',
    'mediterranean_restaurant',
    'american_restaurant',
    'steakhouse',
    'seafood_restaurant',
    'bbq_restaurant',
    'burger_restaurant',
    'sushi_restaurant',
    'vegetarian_restaurant',
    'vegan_restaurant',
    'diner',
    'buffet_restaurant',
    'food_court',
    'ice_cream_shop',
    'dessert_shop',
    'juice_bar',
    'tea_house',
    'wine_bar',
]

# US State codes for filtering
US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR'
]


class OvertureImporter:
    def __init__(self, database_url: str, release: str, batch_size: int = 5000):
        self.database_url = database_url
        self.release = release
        self.batch_size = batch_size
        self.duck = None
        self.pg_conn = None
        self.import_log_id = None

    def connect(self):
        """Initialize database connections."""
        logger.info("Connecting to databases...")

        # DuckDB for reading Parquet files
        self.duck = duckdb.connect()
        self.duck.execute("INSTALL httpfs; LOAD httpfs;")
        self.duck.execute("SET s3_region='us-west-2';")

        # Postgres for writing
        self.pg_conn = psycopg2.connect(self.database_url)
        self.pg_conn.autocommit = False

        logger.info("Database connections established")

    def close(self):
        """Close database connections."""
        if self.duck:
            self.duck.close()
        if self.pg_conn:
            self.pg_conn.close()

    def start_import_log(self):
        """Create import log entry."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                INSERT INTO import_logs (overture_release, status)
                VALUES (%s, 'running')
                RETURNING id
            """, (self.release,))
            self.import_log_id = cur.fetchone()[0]
            self.pg_conn.commit()
        logger.info(f"Started import log: {self.import_log_id}")

    def finish_import_log(self, records_processed: int, records_inserted: int,
                          records_updated: int, status: str = 'completed',
                          error_message: Optional[str] = None):
        """Update import log with results."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                UPDATE import_logs SET
                    completed_at = NOW(),
                    records_processed = %s,
                    records_inserted = %s,
                    records_updated = %s,
                    status = %s,
                    error_message = %s
                WHERE id = %s
            """, (records_processed, records_inserted, records_updated,
                  status, error_message, self.import_log_id))
            self.pg_conn.commit()

    def build_category_filter(self) -> str:
        """Build SQL filter for restaurant categories."""
        patterns = [f"'%{cat}%'" for cat in RESTAURANT_CATEGORIES]
        conditions = [f"LOWER(category) LIKE {p}" for p in patterns]
        return " OR ".join(conditions)

    def get_overture_path(self) -> str:
        """Get the S3 path for Overture places data."""
        return f"{OVERTURE_S3_BASE}/{self.release}/theme={OVERTURE_THEME}/type=place/*"

    def query_overture(self, states: Optional[list] = None) -> str:
        """
        Build DuckDB query for Overture places data.

        Overture schema (simplified):
        - id: unique identifier (GERS ID)
        - names: struct with primary name
        - categories: struct with primary and alternate categories
        - addresses: array of address structs
        - geometry: point geometry (WKT)
        """
        path = self.get_overture_path()
        category_filter = self.build_category_filter()

        # State filter if specified
        state_filter = ""
        if states:
            state_list = ",".join([f"'{s}'" for s in states])
            state_filter = f"AND addresses[1].region IN ({state_list})"

        query = f"""
        SELECT
            id as gers_id,
            names.primary as name,
            addresses[1].freeform as address,
            addresses[1].locality as city,
            addresses[1].region as state,
            addresses[1].postcode as postal_code,
            addresses[1].country as country,
            ST_Y(geometry) as lat,
            ST_X(geometry) as lng,
            categories.primary as primary_category,
            categories.alternate as alt_categories
        FROM read_parquet('{path}', filename=true, hive_partitioning=true)
        WHERE addresses[1].country = 'US'
            AND ({category_filter})
            {state_filter}
            AND names.primary IS NOT NULL
            AND ST_Y(geometry) IS NOT NULL
            AND ST_X(geometry) IS NOT NULL
        """

        return query

    def compute_h3_index(self, lat: float, lng: float, resolution: int) -> int:
        """Compute H3 index for a coordinate."""
        try:
            return h3.latlng_to_cell(lat, lng, resolution)
        except Exception:
            return None

    def normalize_categories(self, primary: str, alternates: list) -> tuple:
        """Normalize category data into array and primary."""
        categories = []
        if primary:
            categories.append(primary.lower().replace(' ', '_'))
        if alternates:
            for alt in alternates:
                if alt:
                    categories.append(alt.lower().replace(' ', '_'))
        return categories, categories[0] if categories else None

    def process_batch(self, rows: list) -> list:
        """Process a batch of rows, adding H3 indexes."""
        processed = []
        for row in rows:
            try:
                gers_id, name, address, city, state, postal_code, country, lat, lng, primary_cat, alt_cats = row

                # Compute H3 indexes
                h3_res8 = self.compute_h3_index(lat, lng, 8)
                h3_res9 = self.compute_h3_index(lat, lng, 9)

                # Normalize categories
                categories, primary_category = self.normalize_categories(
                    primary_cat,
                    alt_cats if alt_cats else []
                )

                processed.append((
                    gers_id,
                    name[:255] if name else None,  # Truncate long names
                    address[:500] if address else None,
                    city[:100] if city else None,
                    state,
                    postal_code,
                    country,
                    lat,
                    lng,
                    h3_res8,
                    h3_res9,
                    categories,
                    primary_category,
                    self.release  # overture_update_date
                ))
            except Exception as e:
                logger.warning(f"Error processing row {gers_id}: {e}")
                continue

        return processed

    def upsert_batch(self, batch: list) -> tuple:
        """Upsert a batch of restaurants into Postgres."""
        if not batch:
            return 0, 0

        insert_query = """
            INSERT INTO restaurants (
                gers_id, name, address, city, state, postal_code, country,
                lat, lng, h3_index_res8, h3_index_res9, categories,
                primary_category, overture_update_date
            ) VALUES %s
            ON CONFLICT (gers_id) DO UPDATE SET
                name = EXCLUDED.name,
                address = EXCLUDED.address,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                postal_code = EXCLUDED.postal_code,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                h3_index_res8 = EXCLUDED.h3_index_res8,
                h3_index_res9 = EXCLUDED.h3_index_res9,
                categories = EXCLUDED.categories,
                primary_category = EXCLUDED.primary_category,
                overture_update_date = EXCLUDED.overture_update_date,
                updated_at = NOW()
        """

        with self.pg_conn.cursor() as cur:
            execute_values(cur, insert_query, batch, page_size=1000)
            # Can't easily distinguish inserts from updates with ON CONFLICT
            # Just return total as "processed"
            return len(batch), 0

        self.pg_conn.commit()

    def run(self, states: Optional[list] = None):
        """Run the full import process."""
        logger.info(f"Starting Overture import for release {self.release}")
        if states:
            logger.info(f"Filtering to states: {', '.join(states)}")
        else:
            logger.info("Importing nationwide (all US states)")

        self.connect()
        self.start_import_log()

        total_processed = 0
        total_inserted = 0
        total_updated = 0

        try:
            # Build and execute query
            query = self.query_overture(states)
            logger.info("Querying Overture Maps data...")
            logger.debug(f"Query: {query}")

            # Execute query and fetch in batches
            result = self.duck.execute(query)

            # Process in batches
            batch = []
            with tqdm(desc="Processing restaurants", unit=" rows") as pbar:
                while True:
                    rows = result.fetchmany(self.batch_size)
                    if not rows:
                        break

                    # Process batch
                    processed = self.process_batch(rows)
                    batch.extend(processed)

                    # Upsert when batch is full
                    if len(batch) >= self.batch_size:
                        inserted, updated = self.upsert_batch(batch)
                        self.pg_conn.commit()
                        total_inserted += inserted
                        total_processed += len(batch)
                        pbar.update(len(batch))
                        batch = []

                # Final batch
                if batch:
                    inserted, updated = self.upsert_batch(batch)
                    self.pg_conn.commit()
                    total_inserted += inserted
                    total_processed += len(batch)
                    pbar.update(len(batch))

            logger.info(f"Import complete: {total_processed} records processed")
            self.finish_import_log(total_processed, total_inserted, total_updated)

        except Exception as e:
            logger.error(f"Import failed: {e}")
            self.pg_conn.rollback()
            self.finish_import_log(total_processed, total_inserted, total_updated,
                                  status='failed', error_message=str(e))
            raise

        finally:
            self.close()

        return total_processed


def main():
    parser = argparse.ArgumentParser(
        description='Import Overture Maps restaurant data into Group Nom database'
    )
    parser.add_argument(
        '--release',
        required=True,
        help='Overture release version (e.g., 2025-01-22.0)'
    )
    parser.add_argument(
        '--states',
        help='Comma-separated list of state codes (e.g., CA,TX,NY). Omit for nationwide.'
    )
    parser.add_argument(
        '--nationwide',
        action='store_true',
        help='Import all US restaurants (overrides --states)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=5000,
        help='Batch size for database operations (default: 5000)'
    )
    parser.add_argument(
        '--database-url',
        default=os.getenv('DATABASE_URL'),
        help='Database connection string (or set DATABASE_URL env var)'
    )

    args = parser.parse_args()

    if not args.database_url:
        logger.error("DATABASE_URL is required. Set it as an environment variable or use --database-url")
        sys.exit(1)

    states = None
    if args.states and not args.nationwide:
        states = [s.strip().upper() for s in args.states.split(',')]
        # Validate states
        invalid = [s for s in states if s not in US_STATES]
        if invalid:
            logger.error(f"Invalid state codes: {', '.join(invalid)}")
            sys.exit(1)

    importer = OvertureImporter(
        database_url=args.database_url,
        release=args.release,
        batch_size=args.batch_size
    )

    try:
        count = importer.run(states=states)
        logger.info(f"Successfully imported {count} restaurants")
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
