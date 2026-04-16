const API_KEY = "8bcf3516840c71be090ce067d3464a1d";
const IMG     = "https://image.tmdb.org/t/p/w342";
const IMG_LG  = "https://image.tmdb.org/t/p/w500";
const BASE    = "https://api.themoviedb.org/3";
const API = "https://backend-cat-logo.railway.internal";
// ================= ESTADO GLOBAL =================
let abaAtual  = "filmes";
let favorites = [];
let usuario   = null; // { nome: string }

try { favorites = JSON.parse(localStorage.getItem("lustv_favs")) || []; } catch(e) {}
try {
  const u = localStorage.getItem("lustv_usuario");
  if (u) usuario = JSON.parse(u);
} catch(e) {}

const content     = document.getElementById("main-content");
const pageTitle   = document.getElementById("page-title");
const searchInput = document.getElementById("search");

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
  } catch(e) { return []; }
}

async function fetchOne(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) { return null; }
}

// ================= FAVORITOS =================
function saveFavs() {
  try { localStorage.setItem("lustv_favs", JSON.stringify(favorites)); } catch(e) {}
}

function isFav(id) { return favorites.some(f => f.id === id); }

function toggleFav(item, tipo) {
  if (isFav(item.id)) {
    favorites = favorites.filter(f => f.id !== item.id);
  } else {
    favorites.push({ ...item, _tipo: tipo });
  }
  saveFavs();
}

// ================= LOGIN =================
const loginBox          = document.getElementById("login-box");
const loginModalOverlay = document.getElementById("login-modal-overlay");
const loginModalClose   = document.getElementById("login-modal-close");
const lmNome            = document.getElementById("lm-nome");
const lmSenha           = document.getElementById("lm-senha");
const lmEntrarBtn       = document.getElementById("lm-entrar-btn");
const loginError        = document.getElementById("login-error");

function iniciais(nome) {
  return nome.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function renderLoginBox() {
  if (usuario) {
    loginBox.innerHTML = `
      <div class="user-chip">
        <div class="user-avatar-sm">${iniciais(usuario.nome)}</div>
        <span class="user-chip-nome">${usuario.nome}</span>
        <button class="btn-sair" onclick="fazerLogout()">Sair</button>
      </div>`;
  } else {
    loginBox.innerHTML = `<button class="btn-entrar" id="btn-abrir-login">Entrar</button>`;
    document.getElementById("btn-abrir-login").addEventListener("click", abrirLoginModal);
  }
  // Atualiza o formulário de avaliação se o modal estiver aberto
  renderFormAvaliacao();
}

function abrirLoginModal() {
  loginModalOverlay.classList.add("open");
  lmNome.value  = "";
  lmSenha.value = "";
  loginError.textContent = "";
  setTimeout(() => lmNome.focus(), 50);
}

function fecharLoginModal() {
  loginModalOverlay.classList.remove("open");
}

loginModalClose.addEventListener("click", fecharLoginModal);
loginModalOverlay.addEventListener("click", e => {
  if (e.target === loginModalOverlay) fecharLoginModal();
});

lmEntrarBtn.addEventListener("click", () => {
  const nome  = lmNome.value.trim();
  const senha = lmSenha.value.trim();

  if (!nome) { loginError.textContent = "Por favor, insira um nome de usuário."; return; }
  if (senha.length < 3) { loginError.textContent = "A senha precisa ter pelo menos 3 caracteres."; return; }

  // Verifica se usuário já existe com senha diferente
  const usuarios = JSON.parse(localStorage.getItem("lustv_usuarios") || "{}");

  if (usuarios[nome] && usuarios[nome] !== senha) {
    loginError.textContent = "Senha incorreta para este usuário.";
    return;
  }

  // Cria ou confirma conta
  usuarios[nome] = senha;
  localStorage.setItem("lustv_usuarios", JSON.stringify(usuarios));

  usuario = { nome };
  localStorage.setItem("lustv_usuario", JSON.stringify(usuario));

  loginError.textContent = "";
  fecharLoginModal();
  renderLoginBox();
});

// Enter no campo de senha
lmSenha.addEventListener("keydown", e => { if (e.key === "Enter") lmEntrarBtn.click(); });
lmNome.addEventListener("keydown",  e => { if (e.key === "Enter") lmSenha.focus(); });

function fazerLogout() {
  usuario = null;
  localStorage.removeItem("lustv_usuario");
  renderLoginBox();
}

// ================= AVALIAÇÕES (por filme) =================
let avEstrelaAtual = 0;
const AV_LABELS    = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

function getAvaliacoes(filmeId) {
  try { return JSON.parse(localStorage.getItem(`lustv_av_${filmeId}`)) || []; } catch(e) { return []; }
}

function salvarAvaliacoes(filmeId, lista) {
  localStorage.setItem(`lustv_av_${filmeId}`, JSON.stringify(lista));
}

function renderFormAvaliacao() {
  const aviso  = document.getElementById("av-login-aviso");
  const campos = document.getElementById("av-form-fields");
  if (!aviso || !campos) return;

  if (!usuario) {
    aviso.style.display  = "block";
    campos.style.display = "none";
  } else {
    aviso.style.display  = "none";
    campos.style.display = "block";
  }
}

function renderAvaliacoes(filmeId) {
  renderFormAvaliacao();

  const avLista  = document.getElementById("av-lista");
  const avResumo = document.getElementById("av-resumo");
  if (!avLista || !avResumo) return;

  const avaliacoes = getAvaliacoes(filmeId);

  if (!avaliacoes.length) {
    avResumo.innerHTML = "";
    avLista.innerHTML  = '<div class="av-vazio">Seja o primeiro a avaliar! 🎬</div>';
    return;
  }

  // Resumo
  const total    = avaliacoes.reduce((s, r) => s + r.estrelas, 0);
  const media    = total / avaliacoes.length;
  const contagem = [0,0,0,0,0];
  avaliacoes.forEach(r => contagem[r.estrelas - 1]++);

  let barras = "";
  for (let i = 5; i >= 1; i--) {
    const pct = Math.round(contagem[i-1] / avaliacoes.length * 100);
    barras += `<div class="av-barra-row">
      <span>${i}</span>
      <div class="av-barra-track"><div class="av-barra-fill" style="width:${pct}%"></div></div>
      <span>${contagem[i-1]}</span>
    </div>`;
  }

  avResumo.innerHTML = `<div class="av-resumo-wrap">
    <div>
      <div class="av-media">${media.toFixed(1)}</div>
      <div class="av-estrelas-mini">${estrelasHtml(Math.round(media))}</div>
      <div class="av-media-sub">${avaliacoes.length} avaliação${avaliacoes.length !== 1 ? "ões" : ""}</div>
    </div>
    <div class="av-barras">${barras}</div>
  </div>`;

  avLista.innerHTML = avaliacoes.slice().reverse().map(r => {
    const podeRemover = usuario && usuario.nome === r.autor;
    return `<div class="av-item">
      <div class="av-item-header">
        <div class="av-avatar">${iniciais(r.autor)}</div>
        <div>
          <div class="av-item-nome">${r.autor}</div>
          <div class="av-estrelas-mini">${estrelasHtml(r.estrelas)}</div>
        </div>
        ${podeRemover ? `<button class="av-remover" onclick="avRemover('${filmeId}','${r.id}')">✕</button>` : ""}
      </div>
      ${r.comentario ? `<div class="av-texto">${r.comentario}</div>` : ""}
      <div class="av-data">${formatarData(r.ts)}</div>
    </div>`;
  }).join("");
}

function estrelasHtml(n) {
  let h = "";
  for (let i = 1; i <= 5; i++) h += `<span class="${i <= n ? "cheia" : ""}">★</span>`;
  return h;
}

function formatarData(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function avRemover(filmeId, avId) {
  if (!usuario) return;
  let lista = getAvaliacoes(filmeId).filter(r => !(r.id === avId && r.autor === usuario.nome));
  salvarAvaliacoes(filmeId, lista);
  renderAvaliacoes(filmeId);
}

function inicializarFormAvaliacao(filmeId) {
  avEstrelaAtual = 0;

  const btns     = document.querySelectorAll("#av-estrelas button");
  const btnEnv   = document.getElementById("av-btn");
  const hint     = document.getElementById("av-hint");
  const avLink   = document.getElementById("av-link-login");
  const avComent = document.getElementById("av-comentario");

  if (avLink) avLink.addEventListener("click", (e) => { e.preventDefault(); abrirLoginModal(); });

  function atualizarEstrelas(v) {
    btns.forEach(b => b.classList.toggle("ativa", +b.dataset.v <= v));
  }

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      avEstrelaAtual = +btn.dataset.v;
      atualizarEstrelas(avEstrelaAtual);
      hint.textContent = AV_LABELS[avEstrelaAtual - 1];
      btnEnv.disabled  = false;
    });
    btn.addEventListener("mouseenter", () => atualizarEstrelas(+btn.dataset.v));
    btn.addEventListener("mouseleave", () => atualizarEstrelas(avEstrelaAtual));
  });

  btnEnv.addEventListener("click", () => {
    if (!usuario || !avEstrelaAtual) return;

    const lista = getAvaliacoes(filmeId);

    // impede dupla avaliação do mesmo usuário
    if (lista.some(r => r.autor === usuario.nome)) {
      hint.textContent = "Você já avaliou este título!";
      return;
    }

    lista.push({
      id:         Date.now().toString(),
      autor:      usuario.nome,
      estrelas:   avEstrelaAtual,
      comentario: avComent ? avComent.value.trim() : "",
      ts:         Date.now()
    });

    salvarAvaliacoes(filmeId, lista);
    renderAvaliacoes(filmeId);

    // Reset
    avEstrelaAtual     = 0;
    atualizarEstrelas(0);
    hint.textContent   = "Selecione uma nota";
    if (avComent) avComent.value = "";
    btnEnv.disabled    = true;
  });
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

  // Reset avaliações
  avEstrelaAtual = 0;
  const hint = document.getElementById("av-hint");
  const btnEnv = document.getElementById("av-btn");
  const avComent = document.getElementById("av-comentario");
  if (hint)     hint.textContent = "Selecione uma nota";
  if (btnEnv)   btnEnv.disabled = true;
  if (avComent) avComent.value = "";
  document.querySelectorAll("#av-estrelas button").forEach(b => b.classList.remove("ativa"));

  renderAvaliacoes(item.id);
  inicializarFormAvaliacao(item.id);

  // Busca detalhes e vídeos
  const detailsUrl  = `${BASE}/${tipo}/${item.id}?api_key=${API_KEY}&language=pt-BR`;
  const videosUrlPT = `${BASE}/${tipo}/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`;
  const videosUrlEN = `${BASE}/${tipo}/${item.id}/videos?api_key=${API_KEY}&language=en-US`;

  const [details, videosPT, videosEN] = await Promise.all([
    fetchOne(detailsUrl),
    fetchOne(videosUrlPT),
    fetchOne(videosUrlEN)
  ]);

  const overview = details?.overview?.trim();
  modalOverview.textContent = overview || "Descrição não disponível em português.";

  const ano     = (details?.release_date || details?.first_air_date || "").slice(0, 4);
  const nota    = details?.vote_average ? details.vote_average.toFixed(1) : null;
  const duracao = details?.runtime
    ? `${details.runtime} min`
    : details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} min/ep` : null;

  modalMeta.innerHTML = `
    ${nota    ? `<span class="modal-badge rating">★ ${nota}</span>` : ""}
    ${ano     ? `<span class="modal-badge">${ano}</span>` : ""}
    ${duracao ? `<span class="modal-badge">${duracao}</span>` : ""}
    <span class="modal-badge">${tipo === "movie" ? "Filme" : "Série"}</span>
  `;

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

  modalTrailer.innerHTML = trailer
    ? `<iframe src="https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1"
         allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
         allowfullscreen></iframe>`
    : `<div class="modal-no-trailer"><span>🎬</span>Trailer não disponível</div>`;
}

function fecharModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  modalTrailer.innerHTML = "";
  modalItem = null;
  modalTipo = null;
}

modalClose.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) fecharModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharLoginModal() || fecharModal(); });

modalFavBtn.addEventListener("click", () => {
  if (!modalItem) return;
  toggleFav(modalItem, modalTipo);
  const fav = isFav(modalItem.id);
  modalFavBtn.textContent = fav ? "❤️ Favoritado" : "♡ Favoritar";
  modalFavBtn.classList.toggle("active", fav);
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

  btn.addEventListener("click", e => {
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
    const h = document.createElement("div");
    h.className   = "section-label";
    h.textContent = label;
    sec.appendChild(h);
  }
  const grid = document.createElement("div");
  grid.className = "grid";
  items.forEach(item => grid.appendChild(criarCard(item, tipo)));
  sec.appendChild(grid);
  return sec;
}

function showLoading() {
  content.innerHTML = `<div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
}

function showEmpty(msg = "Nada encontrado 😢") {
  content.innerHTML = `<div class="empty-state"><span>🎬</span>${msg}</div>`;
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

  if (aba === "filmes") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec); else showEmpty("Nenhum filme encontrado.");

  } else if (aba === "series") {
    const data = await fetchData(`${BASE}/tv/popular?api_key=${API_KEY}&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "tv");
    if (sec) content.appendChild(sec); else showEmpty("Nenhuma série encontrada.");

  } else if (aba === "documentarios") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=99&language=pt-BR`);
    content.innerHTML = "";
    const sec = renderSecao(null, data, "movie");
    if (sec) content.appendChild(sec); else showEmpty("Nenhum documentário encontrado.");

  } else if (aba === "animes") {
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

  } else if (aba === "favoritos") {
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

  if (!query) { mudarAba(abaAtual); return; }

  searchTimer = setTimeout(async () => {
    showLoading();

    if (abaAtual === "favoritos") {
      const filtrados = favorites.filter(f => (f.title || f.name || "").toLowerCase().includes(query.toLowerCase()));
      content.innerHTML = "";
      if (!filtrados.length) { showEmpty(); return; }
      const secM = renderSecao("Filmes", filtrados.filter(f => f._tipo === "movie"), "movie");
      const secS = renderSecao("Séries", filtrados.filter(f => f._tipo === "tv"), "tv");
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
renderLoginBox();
mudarAba("filmes");
