#!/usr/bin/env bash
# Essential UI/document fonts for Ubuntu/Debian.
# Run: ./scripts/install-essential-fonts.sh
# System MS fonts (Arial, Verdana, …) need sudo once:
#   sudo ./scripts/install-essential-fonts.sh --system

set -euo pipefail

USER_FONT_DIR="${HOME}/.local/share/fonts/essential"
REPO_API="https://api.github.com/repos/google/fonts/contents"

download_google_family() {
  local ofl_path="$1"
  local dest_dir="$2"
  mkdir -p "$dest_dir"
  mapfile -t urls < <(
    curl -fsSL "${REPO_API}/${ofl_path}?ref=main" \
      | python3 -c "import json,sys; [print(x['download_url']) for x in json.load(sys.stdin) if x['name'].endswith(('.ttf','.otf'))]"
  )
  for url in "${urls[@]}"; do
    local base
    base=$(basename "${url%%\?*}")
    base=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('${base}'))")
    echo "  → ${base}"
    curl -fsSL -o "${dest_dir}/${base}" "$url"
  done
}

install_user_google_fonts() {
  echo "==> Google / open fonts → ${USER_FONT_DIR}"
  download_google_family "ofl/playfairdisplay" "${USER_FONT_DIR}/playfair-display"
  download_google_family "ofl/bricolagegrotesque" "${USER_FONT_DIR}/bricolage-grotesque"
  download_google_family "ofl/inter" "${USER_FONT_DIR}/inter"
  download_google_family "ofl/montserrat" "${USER_FONT_DIR}/montserrat"
  download_google_family "ofl/ebgaramond" "${USER_FONT_DIR}/eb-garamond"
  download_google_family "ofl/bebasneue" "${USER_FONT_DIR}/bebas-neue"
  download_google_family "ofl/roboto" "${USER_FONT_DIR}/roboto"
  fc-cache -fv "${HOME}/.local/share/fonts" >/dev/null
  echo "    fc-cache updated."
}

install_system_apt_fonts() {
  echo "==> Apt packages (needs sudo): MS Core, Croscore, Liberation, …"
  echo 'ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true' \
    | sudo debconf-set-selections
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ttf-mscorefonts-installer \
    fonts-croscore \
    fonts-crosextra \
    fonts-liberation \
    fonts-liberation-sans-narrow \
    fonts-inter-variable \
    fonts-roboto \
    fonts-montserrat \
    fonts-ebgaramond \
    fonts-bebas-neue \
    fontconfig
  sudo fc-cache -fv
}

echo "Essential fonts installer"
install_user_google_fonts

if [[ "${1:-}" == "--system" ]]; then
  install_system_apt_fonts
else
  echo ""
  echo "Untuk Arial, Times New Roman, Verdana, Georgia (Microsoft Core Fonts), jalankan:"
  echo "  sudo $0 --system"
fi

echo ""
echo "Sample check:"
fc-list | grep -iE ': (Arial|Times New Roman|Verdana|Georgia|Inter|Roboto|Montserrat|Playfair|EB Garamond|Bebas|Bricolage)' | cut -d: -f2 | sort -u | head -20
