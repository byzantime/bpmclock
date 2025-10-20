#!/usr/bin/env python3
"""Tap Tempo Perfectionist - Static Site Generator

Builds the static site using Jinja2 templates
"""

import shutil
from pathlib import Path

from jinja2 import Environment
from jinja2 import FileSystemLoader


def setup_jinja_env():
    """Initialize Jinja2 environment with template loader"""
    template_dir = Path(__file__).parent / "src" / "templates"
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    return env


def ensure_build_dirs():
    """Create build directory structure"""
    build_dir = Path(__file__).parent / "build"
    static_dir = build_dir / "static"

    # Create directories
    build_dir.mkdir(exist_ok=True)
    (static_dir / "css").mkdir(parents=True, exist_ok=True)
    (static_dir / "js").mkdir(parents=True, exist_ok=True)
    (static_dir / "images").mkdir(parents=True, exist_ok=True)
    (static_dir / "fonts").mkdir(parents=True, exist_ok=True)

    return build_dir


def copy_static_assets():
    """Copy static assets to build directory"""
    src_static = Path(__file__).parent / "src" / "static"
    build_static = Path(__file__).parent / "build" / "static"

    # Copy JavaScript files
    js_src = src_static / "js"
    js_dest = build_static / "js"
    if js_src.exists():
        for js_file in js_src.glob("*.js"):
            shutil.copy2(js_file, js_dest / js_file.name)
            print(f"Copied {js_file.name}")

    # Copy fonts
    fonts_src = src_static / "fonts"
    fonts_dest = build_static / "fonts"
    if fonts_src.exists():
        for font_file in fonts_src.glob("*.woff2"):
            shutil.copy2(font_file, fonts_dest / font_file.name)
            print(f"Copied {font_file.name}")

    # Copy images if they exist
    img_src = src_static / "images"
    img_dest = build_static / "images"
    if img_src.exists() and any(img_src.iterdir()):
        for img_file in img_src.iterdir():
            if img_file.is_file():
                shutil.copy2(img_file, img_dest / img_file.name)
                print(f"Copied {img_file.name}")


def render_template(env, template_name, output_path, context=None):
    """Render a Jinja2 template and write to file"""
    if context is None:
        context = {}

    template = env.get_template(template_name)
    html = template.render(**context)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Generated {output_path}")


def build_site():
    """Main build function"""
    print("Building Tap Tempo Perfectionist...")

    # Setup
    env = setup_jinja_env()
    build_dir = ensure_build_dirs()

    # Copy static assets
    print("\nCopying static assets...")
    copy_static_assets()

    # Render index page
    print("\nGenerating HTML pages...")
    context = {
        "title": "Tap Tempo Perfectionist - Rhythm Training",
        "description": (
            "Train your rhythm with PID controller feedback. Develop metronome-like"
            " consistency."
        ),
    }
    render_template(env, "index.html", build_dir / "index.html", context)

    print("\n✓ Build complete!")
    print(f"Output directory: {build_dir}")


if __name__ == "__main__":
    build_site()
