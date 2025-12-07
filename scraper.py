import os
import requests
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin
import time
import random

BASE = "https://bezglutena.celivita.hr"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GlutenFreeBot/1.0)"
}

def get_soup(url):
    r = requests.get(url, headers=HEADERS, timeout=10)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


# ---------------------------------------------------------
# 1. Extract all CATEGORY links
# ---------------------------------------------------------
def get_categories():
    soup = get_soup(BASE)
    categories = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/Products/Category?cid=" in href:
            categories.append(urljoin(BASE, href))

    return list(sorted(set(categories)))


# ---------------------------------------------------------
# 2. Extract all PRODUCT links inside a category
# ---------------------------------------------------------
def get_products_from_category(category_url):
    soup = get_soup(category_url)
    products = []

    for a in soup.find_all("a", href=True, class_="auxshp-label"):
        href = a["href"]
        if "/Products/Details?id=" in href:
            products.append(urljoin(BASE, href))

    return products


# ---------------------------------------------------------
# 3. Parse product details page
# ---------------------------------------------------------
def parse_product(url):
    soup = get_soup(url)

    # Title
    title_tag = soup.find("h2", class_="product_title")
    title = title_tag.get_text(strip=True) if title_tag else None

    # Short description
    short_desc_div = soup.find("div", class_="woocommerce-product-details__short-description")
    short_description = short_desc_div.get_text("\n", strip=True) if short_desc_div else None

    # Details
    details = {}
    li = soup.find("li", class_="description_tab")
    if li:
        ps = li.find_all("p")
        for p in ps:
            text = p.get_text(strip=True)
            if ":" in text:
                k, v = text.split(":", 1)
                details[k.strip()] = v.strip()
            else:
                details.setdefault("notes", []).append(text)

        a_ext = li.find("a", href=True)
        if a_ext:
            details["external_link"] = a_ext["href"]

    # Image - simple and exact
    image_url = None
    for img in soup.find_all("img", src=True):
        src = img["src"].strip()
        if src.startswith("/image/product"):
            image_url = BASE + src

    return {
        "title": title,
        "url": url,
        "short_description": short_description,
        "details": details,
        "image": image_url
    }


# ---------------------------------------------------------
# MAIN SCRAPER — writes to file immediately
# ---------------------------------------------------------
def scrape():
    categories = get_categories()
    print(f"Found {len(categories)} categories.")

    output_file = os.path.join(os.getcwd(), "gluten_free_products.jsonl")

    # CLEAR FILE BEFORE WRITING ANYTHING
    open(output_file, "w", encoding="utf-8").close()

    # Now append new entries as we scrape
    with open(output_file, "a", encoding="utf-8") as f:

        for cat_url in categories:
            print(f"Scanning category: {cat_url}")
            product_links = get_products_from_category(cat_url)
            print(f"  -> {len(product_links)} products found")

            for purl in product_links:
                print(f"     Parsing product: {purl}")
                try:
                    product_data = parse_product(purl)

                    # Write immediately
                    f.write(json.dumps(product_data, ensure_ascii=False) + "\n")
                    f.flush()

                except Exception as e:
                    print(f"        ERROR parsing {purl}: {e}")

                time.sleep(random.uniform(0.1, 0.4))
                break

    print("\nAll products written to gluten_free_products.jsonl")


if __name__ == "__main__":
    scrape()
