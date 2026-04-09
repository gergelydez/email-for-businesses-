"""
Modul pentru gasirea afacerilor fara website folosind Google Places API.
Filtreaza afacerile care nu au website si extrage datele de contact.
"""

import os
import time
import json
import logging
import requests
from typing import Optional
from ratelimit import limits, sleep_and_retry
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

# Coordonatele aproximative ale oraselor din Transilvania + alte orase mari
CITY_COORDINATES = {
    "Cluj-Napoca":    {"lat": 46.7712, "lng": 23.6236, "radius": 15000},
    "Brasov":         {"lat": 45.6427, "lng": 25.5887, "radius": 15000},
    "Sibiu":          {"lat": 45.7983, "lng": 24.1256, "radius": 12000},
    "Targu Mures":    {"lat": 46.5386, "lng": 24.5575, "radius": 12000},
    "Alba Iulia":     {"lat": 46.0669, "lng": 23.5799, "radius": 10000},
    "Bistrita":       {"lat": 47.1333, "lng": 24.5000, "radius": 10000},
    "Deva":           {"lat": 45.8833, "lng": 22.9000, "radius": 8000},
    "Sighisoara":     {"lat": 46.2197, "lng": 24.7937, "radius": 6000},
    "Sfantu Gheorghe":{"lat": 45.8670, "lng": 25.7870, "radius": 8000},
    "Miercurea Ciuc": {"lat": 46.3578, "lng": 25.8024, "radius": 8000},
    "Zalau":          {"lat": 47.1897, "lng": 23.0569, "radius": 8000},
    "Dej":            {"lat": 47.1508, "lng": 23.8697, "radius": 6000},
    "Turda":          {"lat": 46.5667, "lng": 23.7833, "radius": 6000},
    "Oradea":         {"lat": 47.0458, "lng": 21.9189, "radius": 15000},
    "Timisoara":      {"lat": 45.7489, "lng": 21.2087, "radius": 18000},
    "Arad":           {"lat": 46.1700, "lng": 21.3150, "radius": 12000},
    "Bucuresti":      {"lat": 44.4268, "lng": 26.1025, "radius": 25000},
    "Iasi":           {"lat": 47.1585, "lng": 27.6014, "radius": 15000},
    "Constanta":      {"lat": 44.1765, "lng": 28.6480, "radius": 15000},
    "Craiova":        {"lat": 44.3302, "lng": 23.7949, "radius": 12000},
}

# Tipuri de afaceri tinta cu mesaje personalizate
BUSINESS_CATEGORIES = {
    "restaurant":         "Restaurant/Cafenea/Fast-food",
    "dentist":            "Cabinet Stomatologic",
    "beauty_salon":       "Salon de Infrumusetare",
    "car_repair":         "Service Auto",
    "plumber":            "Instalator/Sanitare",
    "electrician":        "Electrician/Instalatii",
    "lawyer":             "Cabinet Avocat",
    "accounting":         "Contabilitate/Audit",
    "lodging":            "Hotel/Pensiune/Cazare",
    "hair_care":          "Frizerie/Coafor",
    "doctor":             "Cabinet Medical",
    "gym":                "Sala de Fitness/Sport",
    "florist":            "Florarie",
    "bakery":             "Brutarie/Patiserie",
    "pharmacy":           "Farmacie",
    "veterinary_care":    "Cabinet Veterinar",
    "painter":            "Constructor/Zugrav",
    "moving_company":     "Firma Mutari/Transport",
    "wedding_venue":      "Organizare Evenimente/Nunta",
    "photographer":       "Studio Foto/Video",
}


@sleep_and_retry
@limits(calls=10, period=1)  # max 10 apeluri/secunda la Google API
def _places_nearby_search(lat: float, lng: float, radius: int,
                           business_type: str, page_token: str = None) -> dict:
    """Apel catre Google Places Nearby Search API."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": business_type,
        "key": GOOGLE_API_KEY,
    }
    if page_token:
        params["pagetoken"] = page_token

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    return response.json()


@sleep_and_retry
@limits(calls=10, period=1)
def _place_details(place_id: str) -> dict:
    """Obtine detaliile complete ale unui loc (inclusiv website si telefon)."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,website,email,rating,user_ratings_total,business_status",
        "key": GOOGLE_API_KEY,
        "language": "ro",
    }
    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    return response.json()


def find_businesses_without_website(
    city: str,
    category: str,
    max_results: int = 60,
) -> list[dict]:
    """
    Gaseste afacerile dintr-un oras si categorie data care NU au website.

    Returns:
        Lista de dictionare cu datele afacerilor fara website.
    """
    if city not in CITY_COORDINATES:
        logger.warning(f"Orasul '{city}' nu e in lista. Foloseste unul din: {list(CITY_COORDINATES.keys())}")
        return []

    coords = CITY_COORDINATES[city]
    businesses_without_website = []
    page_token = None
    total_checked = 0

    logger.info(f"Caut afaceri de tip '{category}' in {city}...")

    while total_checked < max_results:
        try:
            result = _places_nearby_search(
                lat=coords["lat"],
                lng=coords["lng"],
                radius=coords["radius"],
                business_type=category,
                page_token=page_token,
            )
        except requests.RequestException as e:
            logger.error(f"Eroare API Google Places: {e}")
            break

        if result.get("status") not in ("OK", "ZERO_RESULTS"):
            logger.warning(f"Raspuns neasteptat: {result.get('status')} - {result.get('error_message', '')}")
            break

        places = result.get("results", [])
        if not places:
            break

        for place in places:
            total_checked += 1

            # Verificare rapida: daca Places Nearby nu returneaza website,
            # facem Place Details pentru confirmare si date suplimentare
            place_id = place.get("place_id")
            if not place_id:
                continue

            try:
                details = _place_details(place_id)
                biz = details.get("result", {})
            except requests.RequestException as e:
                logger.debug(f"Nu am putut lua detalii pentru {place.get('name')}: {e}")
                continue

            # Afacerea trebuie sa fie activa
            if biz.get("business_status") == "CLOSED_PERMANENTLY":
                continue

            # Filtram: vrem FARA website
            if biz.get("website"):
                continue

            # Vrem sa aiba macar un numar de telefon
            phone = biz.get("formatted_phone_number", "").strip()
            if not phone:
                continue

            business_data = {
                "place_id":       place_id,
                "name":           biz.get("name", place.get("name", "")),
                "address":        biz.get("formatted_address", ""),
                "phone":          phone,
                "email":          biz.get("email", ""),  # rar disponibil direct
                "rating":         biz.get("rating", 0),
                "reviews_count":  biz.get("user_ratings_total", 0),
                "category":       category,
                "category_label": BUSINESS_CATEGORIES.get(category, category),
                "city":           city,
                "has_website":    False,
            }
            businesses_without_website.append(business_data)
            logger.info(f"  ✓ Gasit: {business_data['name']} | {phone} | {city}")

            if len(businesses_without_website) >= max_results:
                break

        # Paginare Google Places (max 3 pagini = 60 rezultate)
        page_token = result.get("next_page_token")
        if not page_token:
            break
        # Google cere minim 2 secunde intre pagini
        time.sleep(2.5)

    logger.info(f"Total gasit in {city}/{category}: {len(businesses_without_website)} afaceri fara website")
    return businesses_without_website


def find_all_targets(
    cities: list[str] = None,
    categories: list[str] = None,
    max_per_city_category: int = 20,
) -> list[dict]:
    """
    Ruleaza cautarea pentru toate orasele si categoriile configurate.
    Returneaza lista completa de leads fara website.
    """
    if cities is None:
        cities_env = os.getenv("TARGET_CITIES", "Cluj-Napoca,Brasov,Sibiu")
        cities = [c.strip() for c in cities_env.split(",")]

    if categories is None:
        cats_env = os.getenv("TARGET_CATEGORIES", "restaurant,dentist,beauty_salon,car_repair")
        categories = [c.strip() for c in cats_env.split(",")]

    all_leads = []
    seen_place_ids = set()

    for city in cities:
        for category in categories:
            results = find_businesses_without_website(
                city=city,
                category=category,
                max_results=max_per_city_category,
            )
            for biz in results:
                if biz["place_id"] not in seen_place_ids:
                    seen_place_ids.add(biz["place_id"])
                    all_leads.append(biz)

            # Delay politicos intre cautari
            time.sleep(1)

    logger.info(f"\nTotal leads unici gasiti: {len(all_leads)}")
    return all_leads


def save_leads_to_csv(leads: list[dict], filepath: str = "data/leads.csv") -> str:
    """Salveaza leads-urile intr-un fisier CSV."""
    import pandas as pd

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    df = pd.DataFrame(leads)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")  # utf-8-sig pentru Excel
    logger.info(f"Salvat {len(leads)} leads in {filepath}")
    return filepath


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    # Test rapid - o singura cautare
    leads = find_businesses_without_website(
        city="Cluj-Napoca",
        category="restaurant",
        max_results=10,
    )
    print(f"\nGasit {len(leads)} restaurante fara website in Cluj-Napoca")
    for biz in leads:
        print(f"  - {biz['name']} | {biz['phone']} | {biz['address'][:50]}")
