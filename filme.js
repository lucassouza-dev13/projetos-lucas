// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO
// Depois que o Railway te der a URL do backend, troque aqui:
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND = "https://backend-cat-logo-production.up.railway.app";
const API_URL = "https://backend-cat-logo-production.up.railway.app";
const API_KEY = "8bcf3516840c71be090ce067d3464a1d";
const IMG     = "https://image.tmdb.org/t/p/w342";
const IMG_LG  = "https://image.tmdb.org/t/p/w500";
const BASE    = "https://api.themoviedb.org/3";

// ─── Estado global ────────────────────────────────────────────────────────────
let abaAtual  = "filmes";
let favorites = [];
let usuario   = null; // { id, nome }
let token     = null;

try { favorites = JSON.parse(localStorage.getItem("lustv_favs")) || []; } catch(e) {}
try {
  token   = localStorage.getItem("lustv_token");
  usuario = JSON.parse(localStorage.getItem("lustv_usuario") || "null");
} catch(e) {}

const content     = document.getElementById("main-content");
const pageTitle   = document.getElementById("page-title");
const searchInput = document.getElementById("search");

const TITULOS = {
  filmes: "🎬 Filmes", series: "📺 Séries",
  documentarios: "🎥 Documentários", animes: "👾 Animações", favoritos: "❤️ Favoritos"
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function iniciais(nome) {
  return nome.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatarData(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function estrelasHtml(n) {
  let h = "";
  for (let i = 1; i <= 5; i++) h += `<span class="${i <= n ? "cheia" : ""}">★</span>`;
  return h;
}

// Chamada autenticada ao backend
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);

  const res  = await fetch(BACKEND + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || "Erro desconhecido");
  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
// TMDB FETCH
// ══════════════════════════════════════════════════════════════════════════════
async function fetchData(url) {
  try { const r = await fetch(url); const d = await r.json(); return d.results || []; } catch(e) { return []; }
}
async function fetchOne(url) {
  try { const r = await fetch(url); return await r.json(); } catch(e) { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// FAVORITOS (local)
// ══════════════════════════════════════════════════════════════════════════════
function saveFavs()      { try { localStorage.setItem("lustv_favs", JSON.stringify(favorites)); } catch(e) {} }
function isFav(id)       { return favorites.some(f => f.id === id); }
function toggleFav(item, tipo) {
  isFav(item.id) ? favorites = favorites.filter(f => f.id !== item.id) : favorites.push({ ...item, _tipo: tipo });
  saveFavs();
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN / CADASTRO
// ══════════════════════════════════════════════════════════════════════════════
const loginBox          = document.getElementById("login-box");
const loginModalOverlay = document.getElementById("login-modal-overlay");
const loginModalClose   = document.getElementById("login-modal-close");
const lmNome            = document.getElementById("lm-nome");
const lmSenha           = document.getElementById("lm-senha");
const lmEntrarBtn       = document.getElementById("lm-entrar-btn");
const loginError        = document.getElementById("login-error");

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
  renderFormAvaliacao();
}

function abrirLoginModal() {
  loginModalOverlay.classList.add("open");
  lmNome.value = lmSenha.value = "";
  loginError.textContent = "";
  setTimeout(() => lmNome.focus(), 50);
}

function fecharLoginModal() {
  loginModalOverlay.classList.remove("open");
}

loginModalClose.addEventListener("click", fecharLoginModal);
loginModalOverlay.addEventListener("click", e => { if (e.target === loginModalOverlay) fecharLoginModal(); });
lmSenha.addEventListener("keydown", e => { if (e.key === "Enter") lmEntrarBtn.click(); });
lmNome.addEventListener("keydown",  e => { if (e.key === "Enter") lmSenha.focus(); });

lmEntrarBtn.addEventListener("click", async () => {
  const nome  = lmNome.value.trim();
  const senha = lmSenha.value.trim();

  if (!nome)          { loginError.textContent = "Insira um nome de usuário."; return; }
  if (senha.length < 3) { loginError.textContent = "A senha precisa ter pelo menos 3 caracteres."; return; }

  lmEntrarBtn.disabled   = true;
  lmEntrarBtn.textContent = "Aguarde...";
  loginError.textContent  = "";

  try {
    // tenta login → se não encontrar, tenta cadastro automático
    let data;
    try {
      data = await api("POST", "/auth/entrar", { nome, senha });
    } catch (err) {
      if (err.message === "Usuário não encontrado.") {
        data = await api("POST", "/auth/cadastrar", { nome, senha });
      } else {
        throw err;
      }
    }

    token   = data.token;
    usuario = data.usuario;
    localStorage.setItem("lustv_token",   token);
    localStorage.setItem("lustv_usuario", JSON.stringify(usuario));

    fecharLoginModal();
    renderLoginBox();

    // se há um modal de filme aberto, atualiza avaliações
    if (modalItem) renderAvaliacoes(String(modalItem.id));

  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    lmEntrarBtn.disabled    = false;
    lmEntrarBtn.textContent = "Entrar / Cadastrar";
  }
});

function fazerLogout() {
  token = usuario = null;
  localStorage.removeItem("lustv_token");
  localStorage.removeItem("lustv_usuario");
  renderLoginBox();
}

// ══════════════════════════════════════════════════════════════════════════════
// AVALIAÇÕES
// ══════════════════════════════════════════════════════════════════════════════
let avEstrelaAtual = 0;
const AV_LABELS    = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

function renderFormAvaliacao() {
  const aviso  = document.getElementById("av-login-aviso");
  const campos = document.getElementById("av-form-fields");
  if (!aviso || !campos) return;
  aviso.style.display  = usuario ? "none"  : "block";
  campos.style.display = usuario ? "block" : "none";
}

async function renderAvaliacoes(filmeId) {
  renderFormAvaliacao();

  const avLista  = document.getElementById("av-lista");
  const avResumo = document.getElementById("av-resumo");
  if (!avLista || !avResumo) return;

  avLista.innerHTML = '<div class="av-vazio">Carregando avaliações...</div>';

  let avaliacoes = [];
  try {
    const data = await api("GET", `/avaliacoes/${filmeId}`);
    avaliacoes  = data.avaliacoes;
  } catch(e) {
    avLista.innerHTML = '<div class="av-vazio">Erro ao carregar avaliações.</div>';
    return;
  }

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

  avLista.innerHTML = avaliacoes.map(r => {
    const podeRemover = usuario && usuario.id === r.autor_id;
    return `<div class="av-item">
      <div class="av-item-header">
        <div class="av-avatar">${iniciais(r.autor)}</div>
        <div>
          <div class="av-item-nome">${r.autor}</div>
          <div class="av-estrelas-mini">${estrelasHtml(r.estrelas)}</div>
        </div>
        ${podeRemover ? `<button class="av-remover" onclick="avRemover('${filmeId}',${r.id})">✕</button>` : ""}
      </div>
      ${r.comentario ? `<div class="av-texto">${r.comentario}</div>` : ""}
      <div class="av-data">${formatarData(r.criado_em)}</div>
    </div>`;
  }).join("");
}

async function avRemover(filmeId, avId) {
  if (!usuario) return;
  try {
    await api("DELETE", `/avaliacoes/${avId}`);
    renderAvaliacoes(filmeId);
  } catch(e) {
    alert(e.message);
  }
}

function inicializarFormAvaliacao(filmeId) {
  avEstrelaAtual = 0;

  const btns     = document.querySelectorAll("#av-estrelas button");
  const btnEnv   = document.getElementById("av-btn");
  const hint     = document.getElementById("av-hint");
  const avLink   = document.getElementById("av-link-login");
  const avComent = document.getElementById("av-comentario");

  // Remove listeners antigos clonando os nós
  btns.forEach(btn => {
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
  });
  const btnEnvClone = btnEnv.cloneNode(true);
  btnEnv.parentNode.replaceChild(btnEnvClone, btnEnv);

  const btnsNovos = document.querySelectorAll("#av-estrelas button");
  const btnNovo   = document.getElementById("av-btn");

  if (avLink) {
    const avLinkClone = avLink.cloneNode(true);
    avLink.parentNode.replaceChild(avLinkClone, avLink);
    document.getElementById("av-link-login").addEventListener("click", e => { e.preventDefault(); abrirLoginModal(); });
  }

  function atualizarEstrelas(v) {
    btnsNovos.forEach(b => b.classList.toggle("ativa", +b.dataset.v <= v));
  }

  btnsNovos.forEach(btn => {
    btn.addEventListener("click", () => {
      avEstrelaAtual = +btn.dataset.v;
      atualizarEstrelas(avEstrelaAtual);
      hint.textContent  = AV_LABELS[avEstrelaAtual - 1];
      btnNovo.disabled  = false;
    });
    btn.addEventListener("mouseenter", () => atualizarEstrelas(+btn.dataset.v));
    btn.addEventListener("mouseleave", () => atualizarEstrelas(avEstrelaAtual));
  });

  btnNovo.addEventListener("click", async () => {
    if (!usuario || !avEstrelaAtual) return;
    btnNovo.disabled    = true;
    btnNovo.textContent = "Enviando...";

    try {
      await api("POST", `/avaliacoes/${filmeId}`, {
        estrelas:   avEstrelaAtual,
        comentario: avComent ? avComent.value.trim() : ""
      });

      renderAvaliacoes(filmeId);

      // Reset form
      avEstrelaAtual = 0;
      atualizarEstrelas(0);
      hint.textContent    = "Selecione uma nota";
      if (avComent) avComent.value = "";
    } catch(e) {
      hint.textContent = e.message;
    } finally {
      btnNovo.disabled    = false;
      btnNovo.textContent = "Enviar avaliação";
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════════════════════
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
  const filmeId = String(item.id);

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

  // Reset form de avaliação
  avEstrelaAtual = 0;
  const hint = document.getElementById("av-hint");
  const avComent = document.getElementById("av-comentario");
  if (hint)     hint.textContent = "Selecione uma nota";
  if (avComent) avComent.value   = "";
  document.querySelectorAll("#av-estrelas button").forEach(b => b.classList.remove("ativa"));
  const btnEnv = document.getElementById("av-btn");
  if (btnEnv) btnEnv.disabled = true;

  // Carrega avaliações e inicializa formulário
  renderAvaliacoes(filmeId);
  inicializarFormAvaliacao(filmeId);

  // Busca detalhes e vídeos em paralelo
  const [details, videosPT, videosEN] = await Promise.all([
    fetchOne(`${BASE}/${tipo}/${item.id}?api_key=${API_KEY}&language=pt-BR`),
    fetchOne(`${BASE}/${tipo}/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`),
    fetchOne(`${BASE}/${tipo}/${item.id}/videos?api_key=${API_KEY}&language=en-US`)
  ]);

  modalOverview.textContent = details?.overview?.trim() || "Descrição não disponível em português.";

  const ano     = (details?.release_date || details?.first_air_date || "").slice(0, 4);
  const nota    = details?.vote_average ? details.vote_average.toFixed(1) : null;
  const duracao = details?.runtime ? `${details.runtime} min`
    : details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} min/ep` : null;

  modalMeta.innerHTML = `
    ${nota    ? `<span class="modal-badge rating">★ ${nota}</span>` : ""}
    ${ano     ? `<span class="modal-badge">${ano}</span>` : ""}
    ${duracao ? `<span class="modal-badge">${duracao}</span>` : ""}
    <span class="modal-badge">${tipo === "movie" ? "Filme" : "Série"}</span>`;

  const tipos = ["Trailer", "Teaser", "Clip", "Featurette"];
  let trailer = null;
  for (const t of tipos) { trailer = (videosPT?.results || []).find(v => v.site === "YouTube" && v.type === t); if (trailer) break; }
  if (!trailer) for (const t of tipos) { trailer = (videosEN?.results || []).find(v => v.site === "YouTube" && v.type === t); if (trailer) break; }

  modalTrailer.innerHTML = trailer
    ? `<iframe src="https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : `<div class="modal-no-trailer"><span>🎬</span>Trailer não disponível</div>`;
}

function fecharModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  modalTrailer.innerHTML = "";
  modalItem = modalTipo = null;
}

modalClose.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) fecharModal(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (loginModalOverlay.classList.contains("open")) fecharLoginModal();
    else fecharModal();
  }
});

modalFavBtn.addEventListener("click", () => {
  if (!modalItem) return;
  toggleFav(modalItem, modalTipo);
  const fav = isFav(modalItem.id);
  modalFavBtn.textContent = fav ? "❤️ Favoritado" : "♡ Favoritar";
  modalFavBtn.classList.toggle("active", fav);
  document.querySelectorAll(`.movie-card[data-id="${modalItem.id}"] .fav-btn`).forEach(btn => btn.classList.toggle("active", fav));
});

// ══════════════════════════════════════════════════════════════════════════════
// CARDS / RENDER / ABAS / BUSCA
// ══════════════════════════════════════════════════════════════════════════════
function criarCard(item, tipo) {
  const titulo = tipo === "movie" ? item.title : item.name;
  const card   = document.createElement("div");
  card.className  = "movie-card";
  card.dataset.id = item.id;

  if (item.poster_path) {
    const img = document.createElement("img");
    img.src = IMG + item.poster_path; img.alt = titulo; img.loading = "lazy";
    card.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "placeholder-img"; ph.textContent = "🎬";
    card.appendChild(ph);
  }

  const overlay = document.createElement("div");
  overlay.className = "card-overlay";
  overlay.innerHTML = `<div class="card-title">${titulo}</div>`;
  card.appendChild(overlay);

  const btn = document.createElement("button");
  btn.className = "fav-btn" + (isFav(item.id) ? " active" : "");
  btn.title = "Favoritar"; btn.textContent = "♥";
  btn.addEventListener("click", e => {
    e.stopPropagation();
    toggleFav(item, tipo);
    btn.classList.toggle("active", isFav(item.id));
  });
  card.appendChild(btn);
  card.addEventListener("click", () => abrirModal(item, tipo));
  return card;
}

function renderSecao(label, items, tipo) {
  if (!items?.length) return null;
  const sec = document.createElement("div");
  if (label) { const h = document.createElement("div"); h.className = "section-label"; h.textContent = label; sec.appendChild(h); }
  const grid = document.createElement("div"); grid.className = "grid";
  items.forEach(item => grid.appendChild(criarCard(item, tipo)));
  sec.appendChild(grid);
  return sec;
}

function showLoading() { content.innerHTML = `<div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`; }
function showEmpty(msg = "Nada encontrado 😢") { content.innerHTML = `<div class="empty-state"><span>🎬</span>${msg}</div>`; }

async function mudarAba(aba) {
  abaAtual = aba;
  pageTitle.textContent = TITULOS[aba];
  searchInput.value = "";
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.aba === aba));
  showLoading();

  if (aba === "filmes") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&language=pt-BR`);
    content.innerHTML = ""; const sec = renderSecao(null, data, "movie");
    sec ? content.appendChild(sec) : showEmpty("Nenhum filme encontrado.");

  } else if (aba === "series") {
    const data = await fetchData(`${BASE}/tv/popular?api_key=${API_KEY}&language=pt-BR`);
    content.innerHTML = ""; const sec = renderSecao(null, data, "tv");
    sec ? content.appendChild(sec) : showEmpty("Nenhuma série encontrada.");

  } else if (aba === "documentarios") {
    const data = await fetchData(`${BASE}/discover/movie?api_key=${API_KEY}&with_genres=99&language=pt-BR`);
    content.innerHTML = ""; const sec = renderSecao(null, data, "movie");
    sec ? content.appendChild(sec) : showEmpty("Nenhum documentário encontrado.");

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
    if (!favorites.length) { showEmpty("Você ainda não tem favoritos ❤️<br><small style='color:#555;font-size:0.8rem;'>Passe o mouse sobre um título e clique no ♥</small>"); return; }
    const secM = renderSecao("Filmes Favoritos", favorites.filter(f => f._tipo === "movie"), "movie");
    const secS = renderSecao("Séries Favoritas", favorites.filter(f => f._tipo === "tv"),    "tv");
    if (secM) content.appendChild(secM);
    if (secS) content.appendChild(secS);
  }
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const query = searchInput.value.trim();
  if (!query) { mudarAba(abaAtual); return; }

  searchTimer = setTimeout(async () => {
    showLoading();
    const q = encodeURIComponent(query);

    if (abaAtual === "favoritos") {
      const filtrados = favorites.filter(f => (f.title || f.name || "").toLowerCase().includes(query.toLowerCase()));
      content.innerHTML = "";
      if (!filtrados.length) { showEmpty(); return; }
      const secM = renderSecao("Filmes", filtrados.filter(f => f._tipo === "movie"), "movie");
      const secS = renderSecao("Séries", filtrados.filter(f => f._tipo === "tv"), "tv");
      if (secM) content.appendChild(secM);
      if (secS) content.appendChild(secS);

    } else if (abaAtual === "filmes" || abaAtual === "documentarios") {
      const data = await fetchData(`${BASE}/search/movie?api_key=${API_KEY}&query=${q}&language=pt-BR`);
      content.innerHTML = ""; const sec = renderSecao(null, data, "movie");
      sec ? content.appendChild(sec) : showEmpty();

    } else if (abaAtual === "series") {
      const data = await fetchData(`${BASE}/search/tv?api_key=${API_KEY}&query=${q}&language=pt-BR`);
      content.innerHTML = ""; const sec = renderSecao(null, data, "tv");
      sec ? content.appendChild(sec) : showEmpty();

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

document.querySelectorAll("nav button").forEach(btn => btn.addEventListener("click", () => mudarAba(btn.dataset.aba)));

// ── Init ──────────────────────────────────────────────────────────────────────
renderLoginBox();
mudarAba("filmes");
