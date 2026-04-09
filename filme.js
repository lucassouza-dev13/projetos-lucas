const API_KEY = "8bcf3516840c71be090ce067d3464a1d";
const IMG     = "https://image.tmdb.org/t/p/w342";
const IMG_LG  = "https://image.tmdb.org/t/p/w500";
const BASE    = "https://api.themoviedb.org/3";

let abaAtual  = "filmes";
let favorites = [];

try { favorites = JSON.parse(localStorage.getItem("cineflix_favs")) || []; } catch(e) {}

const content      = document.getElementById("main-content");
const pageTitle    = document.getElementById("page-title");
const searchInput  = document.getElementById("search");

const TITULOS = {
  filmes:        "🎬 Filmes",
  series:        "📺 Séries",
  documentarios: "🎥 Documentários",
  animes:        "👾 Animações",
  favoritos:     "❤️ Favoritos"
};

// ================= FETCH =================
async function fetchData(url) {
  try {
    const res  = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch(e) {
    console.error("Erro ao buscar dados:", e);
    return [];
  }
}

async function fetchOne(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) {
    console.error("Erro:", e);
    return null;
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

// ================= MODAL =================
const modalOverlay  = document.getElementById("modal-overlay");
const modalClose    = document.getElementById("modal-close");
const modalTrailer  = document.getElementById("modal-trailer");
const modalPoster   = document.getElementById("modal-poster");
const modalTitle    = document.getElementById("modal-title");
const modalMeta     = document.getElementById("modal-meta");
const modalOverview = document.getElementById("modal-overview");
const modalFavBtn   = document.getElementById("modal-fav-btn");

let modalItem = null;
let modalTipo = null;

async function abrirModal(item, tipo) {
  modalItem = item;
  modalTipo = tipo;

  const titulo = tipo === "movie" ? item.title : item.name;

  // Estado inicial enquanto carrega
  modalTitle.textContent    = titulo;
  modalOverview.textContent = "Carregando descrição...";
  modalTrailer.innerHTML    = `<div class="modal-no-trailer"><span>🎬</span>Carregando trailer...</div>`;
  modalPoster.innerHTML     = item.poster_path
    ? `<img src="${IMG_LG}${item.poster_path}" alt="${titulo}">`
    : `<div style="height:165px;display:flex;align-items:center;justify-content:center;color:#444;font-size:2rem;">🎬</div>`;

  modalMeta.innerHTML = "";
  modalFavBtn.textContent = isFav(item.id) ? "❤️ Favoritado" : "♡ Favoritar";
  modalFavBtn.classList.toggle("active", isFav(item.id));
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";

  // Busca detalhes em pt-BR e vídeos em paralelo
  const detailsUrl = tipo === "movie"
    ? `${BASE}/movie/${item.id}?api_key=${API_KEY}&language=pt-BR`
    : `${BASE}/tv/${item.id}?api_key=${API_KEY}&language=pt-BR`;

  const videosUrlPT = tipo === "movie"
    ? `${BASE}/movie/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`
    : `${BASE}/tv/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`;

  const videosUrlEN = tipo === "movie"
    ? `${BASE}/movie/${item.id}/videos?api_key=${API_KEY}&language=en-US`
    : `${BASE}/tv/${item.id}/videos?api_key=${API_KEY}&language=en-US`;

  const [details, videosPT, videosEN] = await Promise.all([
    fetchOne(detailsUrl),
    fetchOne(videosUrlPT),
    fetchOne(videosUrlEN)
  ]);

  // ---- Descrição em português ----
  const overview = details?.overview?.trim();
  modalOverview.textContent = overview || "Descrição não disponível em português.";

  // ---- Meta badges ----
  const ano  = (details?.release_date || details?.first_air_date || item.release_date || item.first_air_date || "").slice(0, 4);
  const nota = details?.vote_average ? details.vote_average.toFixed(1) : null;
  const duracao = details?.runtime
    ? `${details.runtime} min`
    : details?.episode_run_time?.[0]
      ? `${details.episode_run_time[0]} min/ep`
      : null;

  modalMeta.innerHTML = `
    ${nota    ? `<span class="modal-badge rating">★ ${nota}</span>` : ""}
    ${ano     ? `<span class="modal-badge">${ano}</span>` : ""}
    ${duracao ? `<span class="modal-badge">${duracao}</span>` : ""}
    <span class="modal-badge">${tipo === "movie" ? "Filme" : "Série"}</span>
  `;

  // ---- Trailer: tenta pt-BR, fallback en-US ----
  const tipos = ["Trailer", "Teaser", "Clip", "Featurette"];

  let trailer = null;
  for (const t of tipos) {
    trailer = (videosPT?.results || []).find(v => v.site === "YouTube" && v.type === t);
    if (trailer) break;
  }
  if (!trailer) {
    for (const t of tipos) {
      trailer = (videosEN?.results || []).find(v => v.site === "YouTube" && v.type === t);
      if (trailer) break;
    }
  }

  if (trailer) {
    // Sem autoplay para evitar bloqueio do navegador — usuário clica para reproduzir
    modalTrailer.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>`;
  } else {
    modalTrailer.innerHTML = `
      <div class="modal-no-trailer">
        <span>🎬</span>
        Trailer não disponível
      </div>`;
  }
}

function fecharModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  modalTrailer.innerHTML = ""; // para o vídeo
  modalItem = null;
  modalTipo = null;
}

modalClose.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) fecharModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

modalFavBtn.addEventListener("click", () => {
  if (!modalItem) return;
  toggleFav(modalItem, modalTipo);
  const fav = isFav(modalItem.id);
  modalFavBtn.textContent = fav ? "❤️ Favoritado" : "♡ Favoritar";
  modalFavBtn.classList.toggle("active", fav);

  // Atualiza botão no card correspondente
  document.querySelectorAll(`.movie-card[data-id="${modalItem.id}"] .fav-btn`).forEach(btn => {
    btn.classList.toggle("active", fav);
  });
});

// ================= CARD =================
function criarCard(item, tipo) {
  const titulo   = tipo === "movie" ? item.title : item.name;
  const card     = document.createElement("div");
  card.className = "movie-card";
  card.dataset.id = item.id;

  if (item.poster_path) {
    const img    = document.createElement("img");
    img.src      = IMG + item.poster_path;
    img.alt      = titulo;
    img.loading  = "lazy";
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
  card.addEventListener("click", () => abrirModal(item, tipo));

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
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhum filme encontrado.");

  } else if (abaAtual === "series") {
    const data = await fetchData(`${BASE}/tv/popular?api_key=${API_KEY}&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "tv");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhuma série encontrada.");

  } else if (abaAtual === "documentarios") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=99&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec);
    else showEmpty("Nenhum documentário encontrado.");

  } else if (abaAtual === "animes") {
    const [movies, series] = await Promise.all([
      fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=16&language=pt-BR`),
      fetchData(`${BASE}/discover/tv?api_key=${API_KEY}&with_genres=16&language=pt-BR`)
    ]);
    content.innerHTML = "";
    const secM = renderSecao("Filmes Animados", movies, "movie");
    const secS = renderSecao("Séries Animadas", series, "tv");
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
      const data = await fetchData(`${BASE}/search/movie?api_key=${API_KEY}&query=${q}&language=pt-BR`);
      content.innerHTML = "";
      const sec = renderSecao(null, data, "movie");
      if (sec) content.appendChild(sec); else showEmpty();

    } else if (abaAtual === "series") {
      const data = await fetchData(`${BASE}/search/tv?api_key=${API_KEY}&query=${q}&language=pt-BR`);
      content.innerHTML = "";
      const sec = renderSecao(null, data, "tv");
      if (sec) content.appendChild(sec); else showEmpty();

    } else if (abaAtual === "animes") {
      const [movies, series] = await Promise.all([
        fetchData(`${BASE}/search/movie?api_key=${API_KEY}&query=${q}&language=pt-BR`),
        fetchData(`${BASE}/search/tv?api_key=${API_KEY}&query=${q}&language=pt-BR`)
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
