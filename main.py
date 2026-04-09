#!/usr/bin/env python3
"""
=============================================================
  BUSINESS OUTREACH AUTOMATOR - Romania
  Gaseste afaceri fara website si trimite emailuri captivante
=============================================================

Utilizare:
  python main.py                    # Ruleaza campania completa
  python main.py --dry-run          # Simuleaza fara a trimite
  python main.py --preview 5        # Preview 5 emailuri generate
  python main.py --stats            # Afiseaza statistici
  python main.py --find-only        # Doar gaseste leads, nu trimite
  python main.py --city "Cluj-Napoca" --category restaurant  # Un singur oras/categorie
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from colorama import Fore, Style, init as colorama_init

# Adaugam src/ in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from find_businesses import find_all_targets, find_businesses_without_website, save_leads_to_csv
from find_emails import enrich_leads_with_emails
from generate_email import generate_email, preview_email
from send_email import send_campaign, print_daily_stats, get_emails_sent_today

load_dotenv()
colorama_init()

# Configurare logging
Path("logs").mkdir(exist_ok=True)
Path("data").mkdir(exist_ok=True)

log_file = f"logs/campaign_{datetime.now().strftime('%Y-%m-%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

MAX_EMAILS_PER_DAY = int(os.getenv("MAX_EMAILS_PER_DAY", "150"))


def print_banner():
    print(f"""
{Fore.CYAN}╔══════════════════════════════════════════════════════╗
║      BUSINESS OUTREACH AUTOMATOR - Romania           ║
║      Gaseste afaceri fara website → trimite email    ║
╚══════════════════════════════════════════════════════╝{Style.RESET_ALL}
""")


def run_full_campaign(dry_run: bool = False, city: str = None,
                      category: str = None) -> dict:
    """
    Ruleaza campania completa:
    1. Gaseste afaceri fara website
    2. Gaseste emailurile de contact
    3. Genereaza emailuri personalizate cu Claude
    4. Trimite emailurile (sau simuleaza cu --dry-run)

    Returns:
        Raport final al campaniei.
    """
    start_time = time.time()
    report = {
        "date": datetime.now().isoformat(),
        "leads_found": 0,
        "emails_found": 0,
        "emails_generated": 0,
        "emails_sent": 0,
        "emails_failed": 0,
        "emails_skipped": 0,
        "duration_seconds": 0,
    }

    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Campanie pornita")

    # Verificam limita zilnica
    sent_today = get_emails_sent_today()
    remaining = MAX_EMAILS_PER_DAY - sent_today
    if remaining <= 0:
        logger.warning(f"Limita zilnica de {MAX_EMAILS_PER_DAY} emailuri deja atinsa. Oprire.")
        return report

    logger.info(f"Emailuri trimise azi: {sent_today}/{MAX_EMAILS_PER_DAY} | Ramasite: {remaining}")

    # ── PASUL 1: Gaseste afaceri fara website ──
    print(f"\n{Fore.YELLOW}[1/4] Cautam afaceri fara website...{Style.RESET_ALL}")

    if city and category:
        leads = find_businesses_without_website(city, category, max_results=50)
    else:
        leads = find_all_targets(max_per_city_category=15)

    report["leads_found"] = len(leads)
    logger.info(f"Total leads gasite: {len(leads)}")

    if not leads:
        logger.warning("Nu s-au gasit leads. Verifica API key-ul Google Places.")
        return report

    # Salveaza leads brute
    save_leads_to_csv(leads, "data/leads_raw.csv")

    # ── PASUL 2: Gaseste emailuri de contact ──
    print(f"\n{Fore.YELLOW}[2/4] Cautam emailuri de contact...{Style.RESET_ALL}")

    leads_with_emails = enrich_leads_with_emails(leads, max_leads=remaining)
    leads_with_contact = [l for l in leads_with_emails if l.get("contact_email")]

    report["emails_found"] = len(leads_with_contact)
    logger.info(f"Leads cu email gasit: {len(leads_with_contact)}/{len(leads)}")

    if not leads_with_contact:
        logger.warning("Nu s-au gasit adrese de email. Verifica leads manual.")
        save_leads_to_csv(leads_with_emails, "data/leads_no_email.csv")
        return report

    # Salveaza leads cu email
    save_leads_to_csv(leads_with_contact, "data/leads_with_email.csv")

    # ── PASUL 3: Genereaza emailuri personalizate ──
    print(f"\n{Fore.YELLOW}[3/4] Generăm emailuri personalizate cu Claude...{Style.RESET_ALL}")

    for i, lead in enumerate(leads_with_contact):
        try:
            lead["generated_email"] = generate_email(lead)
            report["emails_generated"] += 1
            logger.info(f"  [{i+1}/{len(leads_with_contact)}] {lead['name']} ✓")
            # Mic delay intre apeluri Claude
            time.sleep(1)
        except Exception as e:
            logger.error(f"Eroare generare email pentru {lead.get('name')}: {e}")
            lead["generated_email"] = {}

    # ── PASUL 4: Trimite emailurile ──
    print(f"\n{Fore.YELLOW}[4/4] {'[DRY RUN] ' if dry_run else ''}Trimitere emailuri...{Style.RESET_ALL}")

    send_report = send_campaign(leads_with_contact, dry_run=dry_run)

    report["emails_sent"]    = send_report["sent"]
    report["emails_failed"]  = send_report["failed"]
    report["emails_skipped"] = send_report["skipped"]
    report["duration_seconds"] = round(time.time() - start_time)

    # Salveaza raportul
    report_path = f"data/report_{datetime.now().strftime('%Y-%m-%d_%H-%M')}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # ── RAPORT FINAL ──
    print(f"""
{Fore.CYAN}╔══════════════════════════════════════╗
║          RAPORT CAMPANIE             ║
╠══════════════════════════════════════╣
║  Leads gasite:      {str(report['leads_found']).rjust(14)} ║
║  Emailuri gasite:   {str(report['emails_found']).rjust(14)} ║
║  Emailuri generate: {str(report['emails_generated']).rjust(14)} ║
║  Emailuri trimise:  {str(report['emails_sent']).rjust(14)} ║
║  Esuate:            {str(report['emails_failed']).rjust(14)} ║
║  Omise:             {str(report['emails_skipped']).rjust(14)} ║
║  Durata:            {f"{report['duration_seconds']}s".rjust(14)} ║
╚══════════════════════════════════════╝{Style.RESET_ALL}
""")

    if dry_run:
        print(f"{Fore.YELLOW}Mode: DRY RUN - niciun email nu a fost trimis efectiv.{Style.RESET_ALL}")

    return report


def run_preview(count: int = 5):
    """Genereaza si afiseaza preview-uri de email fara a trimite nimic."""
    print(f"\n{Fore.CYAN}Preview {count} emailuri generate de Claude:{Style.RESET_ALL}")

    sample_businesses = [
        {"name": "Restaurant Crama Ardeleana", "category": "restaurant",
         "category_label": "Restaurant", "city": "Cluj-Napoca",
         "phone": "+40264123456", "rating": 4.2, "reviews_count": 134},
        {"name": "Cabinet Stomatologic Dr. Pop", "category": "dentist",
         "category_label": "Cabinet Stomatologic", "city": "Brasov",
         "phone": "+40268987654", "rating": 4.8, "reviews_count": 56},
        {"name": "Salon Beauty Queen", "category": "beauty_salon",
         "category_label": "Salon de Infrumusetare", "city": "Sibiu",
         "phone": "+40269111222", "rating": 4.5, "reviews_count": 89},
        {"name": "Service Auto Dacia Expert", "category": "car_repair",
         "category_label": "Service Auto", "city": "Targu Mures",
         "phone": "+40265444555", "rating": 4.1, "reviews_count": 42},
        {"name": "Pensiunea La Cetate", "category": "lodging",
         "category_label": "Hotel/Pensiune", "city": "Sighisoara",
         "phone": "+40265777888", "rating": 4.6, "reviews_count": 203},
    ]

    for biz in sample_businesses[:count]:
        preview_email(biz)
        time.sleep(0.5)


def main():
    parser = argparse.ArgumentParser(
        description="Business Outreach Automator - Romania",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Simuleaza campania fara a trimite emailuri")
    parser.add_argument("--preview", type=int, metavar="N", default=0,
                        help="Afiseaza N exemple de emailuri generate")
    parser.add_argument("--stats", action="store_true",
                        help="Afiseaza statistici zilnice")
    parser.add_argument("--find-only", action="store_true",
                        help="Doar gaseste leads, nu trimite emailuri")
    parser.add_argument("--city", type=str, default=None,
                        help="Oras specific (ex: 'Cluj-Napoca')")
    parser.add_argument("--category", type=str, default=None,
                        help="Categorie specifica (ex: restaurant)")

    args = parser.parse_args()

    print_banner()

    if args.stats:
        print_daily_stats()
        return

    if args.preview:
        run_preview(args.preview)
        return

    if args.find_only:
        print(f"{Fore.YELLOW}Mod: FIND ONLY - nu se trimit emailuri{Style.RESET_ALL}")
        if args.city and args.category:
            leads = find_businesses_without_website(args.city, args.category)
        else:
            leads = find_all_targets()
        leads = enrich_leads_with_emails(leads)
        save_leads_to_csv(leads, "data/leads_export.csv")
        print(f"\n{Fore.GREEN}Salvat {len(leads)} leads in data/leads_export.csv{Style.RESET_ALL}")
        return

    # Campanie completa
    run_full_campaign(
        dry_run=args.dry_run,
        city=args.city,
        category=args.category,
    )


if __name__ == "__main__":
    main()
