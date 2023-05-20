import requests, json
from bs4 import BeautifulSoup

nouns = []
for i in range(1, 10):
    reqs = requests.get(f"https://zdb.se/z/substantiv/&sida={i}")
    soup = BeautifulSoup(reqs.text, "html.parser")
    table = soup.find("table", {"class": "w3-table-all"})
    for row in table.find_all("a"):
        nouns.append(row.text.split(" ")[1])

with open("public/words.json", "w", encoding="utf-8") as f:
    json.dump({"se": nouns}, f, indent=4, ensure_ascii=False)

