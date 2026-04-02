# Config file for constants used in the engine files
from supabase import create_client
from dotenv import load_dotenv
import os

DEBUG = True

BASIC_PENALTY = 1000 # Penalty for both players when they fail to guess
MAX_CAMPUS_DISTANCE = 2000 # UCI is more than 2k meters across, but this is a good median value since a lot of locations will be on the main campus
MAX_POINTS = 5000 # beginning score

NUM_ROUNDS = 5 # Default Game lasts 5 rounds
ROUND_DURATION = 30 # each round lasts 30 seconds
INTER_ROUND_DELAY = 5 # display updated scores for 5 seconds between rounds
TABLE = "Locations"

# 1. Load database credentials and boot up client
load_dotenv()
SUPABASE = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")) 