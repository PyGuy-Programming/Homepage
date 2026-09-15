#!/usr/bin/env python3
"""Manage homepage project list. Usage: python manage.py [command]

Commands:
  list              Show all projects and pages
  add    <repo>     Add a GitHub repo (owner/repo format)
  remove <repo>     Remove a project by repo name
  rename <repo> <title>  Change display title
  page-add <url> <title> Add an external page link
  page-remove <url>     Remove a page link
  build             Regenerate index.html from projects.json
"""

import json
import sys
import re
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "projects.json"
HTML = ROOT / "index.html"


def load():
    return json.loads(DATA.read_text())


def save(data):
    DATA.write_text(json.dumps(data, indent=2) + "\n")


def cmd_list():
    data = load()
    print("\n  Projects:")
    for i, p in enumerate(data["projects"], 1):
        print(f"    {i}. {p['title']}  ({p['repo']})")
    print("\n  Pages:")
    for i, p in enumerate(data["pages"], 1):
        print(f"    {i}. {p['title']}  ({p['url']})")
    print()


def cmd_add(repo):
    data = load()
    if any(p["repo"] == repo for p in data["projects"]):
        print(f"  Already exists: {repo}")
        return
    title = repo.split("/")[-1]
    data["projects"].append({"repo": repo, "title": title})
    save(data)
    print(f"  Added: {title}")


def cmd_remove(repo):
    data = load()
    before = len(data["projects"])
    data["projects"] = [p for p in data["projects"] if p["repo"] != repo]
    if len(data["projects"]) == before:
        print(f"  Not found: {repo}")
        return
    save(data)
    print(f"  Removed: {repo}")


def cmd_rename(repo, title):
    data = load()
    for p in data["projects"]:
        if p["repo"] == repo:
            p["title"] = title
            save(data)
            print(f"  Renamed: {repo} -> {title}")
            return
    print(f"  Not found: {repo}")


def cmd_page_add(url, title):
    data = load()
    if any(p["url"] == url for p in data["pages"]):
        print(f"  Already exists: {url}")
        return
    data["pages"].append({"url": url, "title": title})
    save(data)
    print(f"  Added page: {title}")


def cmd_page_remove(url):
    data = load()
    before = len(data["pages"])
    data["pages"] = [p for p in data["pages"] if p["url"] != url]
    if len(data["pages"]) == before:
        print(f"  Not found: {url}")
        return
    save(data)
    print(f"  Removed page: {url}")


def build_projects_html(projects):
    links = []
    for p in projects:
        links.append(f"""        <a href="https://github.com/{p['repo']}" rel="external nofollow noopener"
          data-repo="{p['repo']}"
          class="pop-card group block rounded-lg p-3 text-center repo-link"
          style="background: var(--surface); border: 1px solid var(--border);">
          <span class="font-bold uppercase text-sm" style="color: var(--accent);">{p['title']}</span>
        </a>""")
    return "\n".join(links)


def build_pages_html(pages):
    links = []
    for p in pages:
        links.append(f"""      <a href="{p['url']}" rel="external nofollow noopener"
        class="pop-card group block rounded-lg p-3 text-center"
        style="background: var(--surface); border: 1px solid var(--border);">
        <span class="font-bold uppercase text-sm" style="color: var(--accent);">{p['title']}</span>
      </a>""")
    return "\n".join(links)


def cmd_build():
    data = load()
    html = HTML.read_text()

    # Replace projects section content
    projects_html = build_projects_html(data["projects"])
    html = re.sub(
        r'(        <div class="flex flex-col gap-2">\n)(.*?)(        </div>\n      </div>\n    </section>\n\n    <!-- Other Pages)',
        rf"\1{projects_html}\n\3",
        html,
        flags=re.DOTALL,
    )

    # Replace pages section content
    pages_html = build_pages_html(data["pages"])
    html = re.sub(
        r'(      <h2 class="text-sm font-bold uppercase tracking-widest text-center" style="color: var(--accent);">Other Pages</h2>\n)(.*?)(    </section>)',
        rf"\1{pages_html}\n\3",
        html,
        flags=re.DOTALL,
    )

    HTML.write_text(html)
    print(f"  Built! {len(data['projects'])} projects, {len(data['pages'])} pages")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    args = sys.argv[2:]

    commands = {
        "list": lambda: cmd_list(),
        "add": lambda: cmd_add(args[0]) if args else print("  Usage: manage.py add <owner/repo>"),
        "remove": lambda: cmd_remove(args[0]) if args else print("  Usage: manage.py remove <owner/repo>"),
        "rename": lambda: cmd_rename(args[0], args[1]) if len(args) >= 2 else print("  Usage: manage.py rename <owner/repo> <title>"),
        "page-add": lambda: cmd_page_add(args[0], args[1]) if len(args) >= 2 else print("  Usage: manage.py page-add <url> <title>"),
        "page-remove": lambda: cmd_page_remove(args[0]) if args else print("  Usage: manage.py page-remove <url>"),
        "build": lambda: cmd_build(),
    }

    if cmd in commands:
        commands[cmd]()
    else:
        print(f"  Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
