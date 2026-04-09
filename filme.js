const API_KEY = "8bcf3516840c71be090ce067d3464a1d";
const IMG     = "https://image.tmdb.org/t/p/w342";
const BASE    = "https://api.themoviedb.org/3";

let abaAtual  = "filmes";
let favorites = [];

try { favorites = JSON.parse(localStorage.getItem("cineflix_favs")) || []; } catch(e) {}

const content     = document.getElementById("main-content");
const pageTitle   = document.getElementById("page-title");
const searchInput = document.getElementById("search");

const TITULOS = {
  filmes:        "🎬 Filmes",
  series:        "📺 Séries",
  documentarios: "🎥 Documentários",
  animes:        "🎌 Animes",
  favoritos:     "❤️ Favoritos"
};

// ================= FETCH =================
async function fetchData(url) {
  try {
    const res  = await fetch(url);
    const data = await res.json();
    console.log("Resposta da API:", url, data);
    return data.results || [];
  } catch(e) {
    console.error("Erro ao buscar dados:", e);
    return [];
  }
}

// ================= FAVORITOS =================
function saveFavs() {
  try { localStorage.setItem("cineflix_favs", JSON.stringify(favorites)); } catch(e) {}
}

function isFav(id) {
  return favorites.some(f => f.id === id);
}

function toggleFav(item, tipo) {
  if (isFav(item.id)) {
    favorites = favorites.filter(f => f.id !== item.id);
  } else {
    favorites.push({ ...item, _tipo: tipo });
  }
  saveFavs();
}

// ================= CARD =================
function criarCard(item, tipo) {
  const titulo = tipo === "movie" ? item.title : item.name;
  const card   = document.createElement("div");
  card.className = "movie-card";

  if (item.poster_path) {
    const img   = document.createElement("img");
    img.src     = IMG + item.poster_path;
    img.alt     = titulo;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    const ph       = document.createElement("div");
    ph.className   = "placeholder-img";
    ph.textContent = "🎬";
    card.appendChild(ph);
  }

  const overlay     = document.createElement("div");
  overlay.className = "card-overlay";
  overlay.innerHTML = `<div class="card-title">${titulo}</div>`;
  card.appendChild(overlay);

  const btn       = document.createElement("button");
  btn.className   = "fav-btn" + (isFav(item.id) ? " active" : "");
  btn.title       = "Favoritar";
  btn.textContent = "♥";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFav(item, tipo);
    btn.classList.toggle("active", isFav(item.id));
  });

  card.appendChild(btn);
  return card;
}

// ================= RENDER =================
function renderSecao(label, items, tipo) {
  if (!items || items.length === 0) return null;

  const sec = document.createElement("div");

  if (label) {
    const h       = document.createElement("div");
    h.className   = "section-label";
    h.textContent = label;
    sec.appendChild(h);
  }

  const grid     = document.createElement("div");
  grid.className = "grid";
  items.forEach(item => grid.appendChild(criarCard(item, tipo)));
  sec.appendChild(grid);

  return sec;
}

function showLoading() {
  content.innerHTML = `
    <div class="loading">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>`;
}

function showEmpty(msg = "Nada encontrado 😢") {
  content.innerHTML = `
    <div class="empty-state">
      <span>🎬</span>
      ${msg}
    </div>`;
}

// ================= ABAS =================
async function mudarAba(aba) {
  abaAtual              = aba;
  pageTitle.textContent = TITULOS[aba];
  searchInput.value     = "";

  document.querySelectorAll("nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.aba === aba);
  });

  showLoading();

  if (abaAtual === "filmes") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhum filme encontrado.");

  } else if (abaAtual === "series") {
    const data = await fetchData(`${BASE}/tv/popular?api_key=${API_KEY}`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "tv");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhuma série encontrada.");

  } else if (abaAtual === "documentarios") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=99`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhum documentário encontrado.");

  } else if (abaAtual === "animes") {
    const [movies, series] = await Promise.all([
      fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=16`),
      fetchData(`${BASE}/discover/tv?api_key=${API_KEY}&with_genres=16`)
    ]);
    content.innerHTML = "";
    const secM = renderSecao("Filmes de Anime", movies, "movie");
    const secS = renderSecao("Séries de Anime", series, "tv");
    if (secM) content.appendChild(secM);
    if (secS) content.appendChild(secS);
    if (!secM && !secS) showEmpty("Nenhum anime encontrado.");

  } else if (abaAtual === "favoritos") {
    content.innerHTML = "";
    if (!favorites.length) {
      showEmpty("Você ainda não tem favoritos ❤️<br><small style='color:#555;font-size:0.8rem;'>Passe o mouse sobre um título e clique no ♥</small>");
      return;
    }
    const favMovies = favorites.filter(f => f._tipo === "movie");
    const favSeries = favorites.filter(f => f._tipo === "tv");
    const secM      = renderSecao("Filmes Favoritos", favMovies, "movie");
    const secS      = renderSecao("Séries Favoritas", favSeries, "tv");
    if (secM) content.appendChild(secM);
    if (secS) content.appendChild(secS);
  }
}

// ================= BUSCA =================
let searchTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const query = searchInput.value.trim();

  if (!query) {
    mudarAba(abaAtual);
    return;
  }

  searchTimer = setTimeout(async () => {
    showLoading();

    if (abaAtual === "favoritos") {
      const filtrados = favorites.filter(f => {
        const nome = (f.title || f.name || "").toLowerCase();
        return nome.includes(query.toLowerCase());
      });
      content.innerHTML = "";
      if (!filtrados.length) { showEmpty(); return; }

      const favMovies = filtrados.filter(f => f._tipo === "movie");
      const favSeries = filtrados.filter(f => f._tipo === "tv");
      const secM      = renderSecao("Filmes", favMovies, "movie");
      const secS      = renderSecao("Séries", favSeries, "tv");
      if (secM) content.appendChild(secM);
      if (secS) content.appendChild(secS);
      return;
    }

    const q = encodeURIComponent(query);

    if (abaAtual === "filmes" || abaAtual === "documentarios") {
      const data = await fetchData(`${BASE}/search/movie?api_key=${API_KEY}&query=${q}`);
      content.innerHTML = "";
      const sec = renderSecao(null, data, "movie");
      if (sec) content.appendChild(sec); else showEmpty();

    } else if (abaAtual === "series") {
      const data = await fetchData(`${BASE}/search/tv?api_key=${API_KEY}&query=${q}`);
      content.innerHTML = "";
      const sec = renderSecao(null, data, "tv");
      if (sec) content.appendChild(sec); else showEmpty();

    } else if (abaAtual === "animes") {
      const [movies, series] = await Promise.all([
        fetchData(`${BASE}/search/movie?api_key=${API_KEY}&query=${q}`),
        fetchData(`${BASE}/search/tv?api_key=${API_KEY}&query=${q}`)
      ]);
      content.innerHTML = "";
      const secM = renderSecao("Filmes", movies, "movie");
      const secS = renderSecao("Séries", series, "tv");
      if (secM) content.appendChild(secM);
      if (secS) content.appendChild(secS);
      if (!secM && !secS) showEmpty();
    }
  }, 400);
});

// ================= NAV =================
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => mudarAba(btn.dataset.aba));
});

// ================= INIT =================
mudarAba("filmes");
