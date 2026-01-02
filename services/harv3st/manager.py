import sys
import argparse
from app.main_server import start_server
from app.scraper import run_scraper

def main():
    parser = argparse.ArgumentParser(description="Harv3st - Lead Generation Tool")
    parser.add_argument('mode', choices=['server', 'scraper'], help="Mode to run: 'server' for backend, 'scraper' for bot")
    parser.add_argument('--query', type=str, help="Search query for the scraper (e.g. 'Gyms in Miami')")
    
    args = parser.parse_args()
    
    if args.mode == 'server':
        start_server()
    elif args.mode == 'scraper':
        q = args.query
        if not q:
            q = input("Enter search query: ")
        run_scraper(q)

if __name__ == "__main__":
    main()
